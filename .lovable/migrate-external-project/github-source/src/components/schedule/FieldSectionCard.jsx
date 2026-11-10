import React, { useState } from "react";
import { Droppable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sun, Sunset, Plus } from "lucide-react";
import { FORMAT_SECTION_COUNTS, getDefaultFormat } from "@/lib/fieldSections";
import BookingCard from "./BookingCard";

const STATUS_STYLES = {
  active: "",
  maintenance: "opacity-70",
  closed: "opacity-40",
};

export default function FieldSectionCard({ field, events, isConflict, onEdit, onDelete, onAddBooking }) {
  const [activeFormat, setActiveFormat] = useState(getDefaultFormat(field));
  const sectionCount = FORMAT_SECTION_COUNTS[activeFormat] || 12;

  return (
    <div className={`border border-border rounded-xl bg-white overflow-hidden ${STATUS_STYLES[field.status] || ""}`}>
      <div className="p-3 border-b border-border bg-muted/20">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="font-bold text-sm text-[#0B162B] truncate">{field.name}</p>
          <div className="flex items-center gap-1 shrink-0">
            {field.status !== "active" && <Badge variant="outline" className="text-[10px] capitalize">{field.status}</Badge>}
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onAddBooking(field)}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 mt-1.5">
          <Badge variant="outline" className="text-[9px] capitalize">{field.surface}</Badge>
          <Badge variant="outline" className="text-[9px] capitalize">{field.indoor_outdoor}</Badge>
          <Badge variant="outline" className="text-[9px]">
            {field.lighted ? <><Sunset className="w-2.5 h-2.5 mr-1" />Lighted</> : <><Sun className="w-2.5 h-2.5 mr-1" />No lights</>}
          </Badge>
          {(field.format_supported || []).map((fmt) => (
            <button
              key={fmt}
              onClick={() => setActiveFormat(fmt)}
              className={`text-[9px] px-1.5 py-0.5 rounded font-semibold transition-colors ${
                activeFormat === fmt ? "bg-[#399F7D] text-white" : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {fmt}
            </button>
          ))}
        </div>
      </div>

      {/* Section strip — visual reference of the field's playable sections for the active format */}
      <div className="flex gap-0.5 px-3 pt-2">
        {Array.from({ length: sectionCount }).map((_, i) => (
          <div key={i} className="flex-1 h-1.5 rounded-full bg-[#399F7D]/15" />
        ))}
      </div>

      <Droppable droppableId={field.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`p-3 space-y-1.5 min-h-[64px] transition-colors ${snapshot.isDraggingOver ? "bg-emerald-50" : ""}`}
          >
            {events.length === 0 && !snapshot.isDraggingOver && (
              <p className="text-[11px] text-muted-foreground/60 text-center py-3">No bookings this day</p>
            )}
            {events.map((e, i) => (
              <BookingCard key={e.id} event={e} index={i} hasConflict={isConflict(e.id)} onEdit={onEdit} onDelete={onDelete} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}