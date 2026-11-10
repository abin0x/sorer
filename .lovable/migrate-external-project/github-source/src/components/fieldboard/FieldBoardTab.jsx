import React, { useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FieldPitchCard from "@/components/fieldboard/FieldPitchCard";
import TimeSlotSlider from "@/components/fieldboard/TimeSlotSlider";
import { DAYS, toLabel } from "@/lib/gridEngine";

export default function FieldBoardTab({ sched, sel, onSel, onBookingUpdated }) {
  const { bookings } = sched;

  const facilities = useMemo(() => {
    const m = new Map();
    bookings.forEach((b) => {
      const name = b.facility_name || "Other";
      if (!m.has(name)) m.set(name, { name, fields: new Map() });
      m.get(name).fields.set(b.field_id, { id: b.field_id, name: b.field_name });
    });
    return [...m.values()].map((f) => ({ name: f.name, fields: [...f.fields.values()] }));
  }, [bookings]);

  const facilityName = sel.facility && facilities.some((f) => f.name === sel.facility) ? sel.facility : facilities[0]?.name;
  const fields = facilities.find((f) => f.name === facilityName)?.fields || [];
  const facBks = bookings.filter((b) => b.facility_name === facilityName);
  const days = DAYS.filter((d) => facBks.some((b) => b.day === d));
  const day = sel.day && days.includes(sel.day) ? sel.day : days[0];
  const dayBks = facBks.filter((b) => b.day === day);

  const slots = useMemo(() => {
    const m = new Map();
    dayBks.forEach((b) => m.set(`${b.start}-${b.end}`, b));
    return [...m].sort((a, b) => a[1].start - b[1].start || a[1].end - b[1].end);
  }, [dayBks]);
  const slot = sel.slot && slots.some(([k]) => k === sel.slot) ? sel.slot : slots[0]?.[0];

  if (!bookings.length) return <p className="py-10 text-center text-muted-foreground">No bookings for this week yet. Use the "Sync from events" button to pull in field allocations.</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={facilityName} onValueChange={(v) => onSel({ facility: v, day: null, slot: null })}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Facility" /></SelectTrigger>
          <SelectContent>{facilities.map((f) => <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={day} onValueChange={(v) => onSel({ facility: facilityName, day: v, slot: null })}>
          <SelectTrigger className="w-28"><SelectValue placeholder="Day" /></SelectTrigger>
          <SelectContent>{days.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
        </Select>
        {slots.length > 0 && (
          <TimeSlotSlider slots={slots} value={slot} onChange={(v) => onSel({ facility: facilityName, day, slot: v })} />
        )}
      </div>
      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {fields.map((f) => (
          <FieldPitchCard
            key={f.id}
            field={f}
            slotBks={dayBks.filter((b) => b.field_id === f.id && `${b.start}-${b.end}` === slot)}
            dayBks={dayBks.filter((b) => b.field_id === f.id)}
            sched={sched}
            onBookingUpdated={onBookingUpdated}
          />
        ))}
      </div>
    </div>
  );
}