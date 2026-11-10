import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, Save, Bell } from "lucide-react";
import { toast } from "sonner";
import QuietHoursEditor from "@/components/beacon/QuietHoursEditor";
import ChannelOverridesEditor from "@/components/beacon/ChannelOverridesEditor";
import MuteListEditor from "@/components/beacon/MuteListEditor";
import useBeaconData from "@/components/beacon/useBeaconData";

const PRESETS = [
  { value: "essentials", label: "Essentials only", desc: "Priority and @mentions only — everything else badges quietly." },
  { value: "balanced", label: "Balanced", desc: "Push for most channels, badge for high-volume ones. Recommended." },
  { value: "everything", label: "Everything", desc: "Push for every channel." },
];

export default function NotificationSettingsPanel({ user }) {
  const queryClient = useQueryClient();
  const beacon = useBeaconData(user);
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (beacon.myPrefs) setForm(beacon.myPrefs);
    else if (user && !beacon.myPrefs) {
      setForm({ user_id: user.id, user_email: user.email, club_id: user.club_id, preset: "balanced", channel_overrides: {}, mention_push: true, digest_time: "08:00", quiet_hours: { enabled: false, weekday_start: "21:00", weekday_end: "07:00", weekend_start: "22:00", weekend_end: "08:00", timezone: "America/New_York", priority_override: true, schedule_override: true }, mutes: [] });
    }
  }, [beacon.myPrefs, user]);

  const save = useMutation({
    mutationFn: () => (form.id ? base44.entities.NotificationPreference.update(form.id, form) : base44.entities.NotificationPreference.create(form)),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["beacon-prefs", user.club_id] }); toast.success("Preferences saved"); },
  });

  if (!form) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  const removeMute = (mute) => setForm({ ...form, mutes: form.mutes.filter((m) => !(m.scope === mute.scope && m.target_id === mute.target_id)) });

  return (
    <Card className="border-border/60 rounded-2xl max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Bell className="w-4 h-4 text-primary" /> Notification Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="mb-2 block">Preset</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => setForm({ ...form, preset: p.value })}
                className={`text-left p-3 rounded-xl border transition-colors ${form.preset === p.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}
              >
                <p className="text-sm font-semibold text-foreground">{p.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{p.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2 border-t border-border/60 space-y-1.5">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Daily digest delivery time</Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">When channels are set to "Digest," their updates are bundled into one summary email delivered at this time each day.</p>
            </div>
            <Input type="time" value={form.digest_time || "08:00"} onChange={(e) => setForm({ ...form, digest_time: e.target.value })} className="w-32 shrink-0" />
          </div>
        </div>

        <div className="pt-2 border-t border-border/60 space-y-2">
          <Label className="text-sm font-semibold">Urgent alerts</Label>
          <p className="text-xs text-muted-foreground">Urgent posts (weather, cancellations, safety) always reach you, even when muted or in quiet hours.</p>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>Also text me</span>
            <input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={form.sms_urgent !== false} onChange={(e) => setForm({ ...form, sms_urgent: e.target.checked })} />
          </label>
          {form.sms_urgent !== false && (
            <Input type="tel" value={form.sms_phone || ""} onChange={(e) => setForm({ ...form, sms_phone: e.target.value })} placeholder="Mobile number, e.g. +1 555 123 4567 (uses your profile number if blank)" />
          )}
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>Also email me</span>
            <input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={form.email_urgent !== false} onChange={(e) => setForm({ ...form, email_urgent: e.target.checked })} />
          </label>
        </div>

        <div className="pt-2 border-t border-border/60">
          <QuietHoursEditor quietHours={form.quiet_hours} onChange={(qh) => setForm({ ...form, quiet_hours: qh })} />
        </div>

        <div className="pt-2 border-t border-border/60">
          <ChannelOverridesEditor channels={beacon.channels} overrides={form.channel_overrides || {}} onChange={(ov) => setForm({ ...form, channel_overrides: ov })} />
        </div>

        {form.mutes?.length > 0 && (
          <div className="pt-2 border-t border-border/60">
            <MuteListEditor mutes={form.mutes} onRemove={removeMute} />
          </div>
        )}

        <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full bg-primary text-primary-foreground rounded-full">
          {save.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save Preferences
        </Button>
      </CardContent>
    </Card>
  );
}