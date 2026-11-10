import React, { useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import NativeSheet from "@/components/beacon/NativeSheet";
import { CHANNEL_KINDS, canManageChannels, isCustomChannel } from "@/lib/beaconChannelAdmin";

/** Add a new channel (channel = null) or edit/remove an existing one. */
export default function ChannelManageSheet({ open, onClose, user, teams = [], channel = null, defaultTeamId = null, onSaved }) {
  const editing = !!channel;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [teamId, setTeamId] = useState("");
  const [type, setType] = useState("team_chat");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const scopes = [
    ...(canManageChannels(user, null, teams) ? [{ id: "", name: "Whole club" }] : []),
    ...teams.filter((t) => canManageChannels(user, t.id, teams)).map((t) => ({ id: t.id, name: t.name })),
  ];

  useEffect(() => {
    if (!open) return;
    setConfirmDelete(false);
    setName(channel?.name || "");
    setDescription(channel?.description || "");
    setType(channel?.type || "team_chat");
    setTeamId(channel ? channel.team_id || "" : defaultTeamId ?? scopes[0]?.id ?? "");
  }, [open, channel?.id]);

  const run = async (payload, done) => {
    setBusy(true);
    try {
      const r = await base44.functions.invoke("beacon-channel-manage", payload);
      if (r?.data?.error) throw new Error(r.data.error);
      toast.success(done);
      onSaved?.(r?.data?.channel || null, payload.op);
      onClose();
    } catch (e) {
      toast.error(e?.message || "Couldn't save the channel.");
    } finally { setBusy(false); }
  };

  const save = () => editing
    ? run({ op: "update", channel_id: channel.id, name, description }, "Channel updated")
    : run({ op: "create", team_id: teamId || null, name, description, type }, "Channel created");

  return (
    <NativeSheet open={open} onClose={onClose} title={editing ? "Edit channel" : "New channel"}>
      <div className="space-y-4 p-4">
        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="e.g. Carpool" className="mt-1 h-12 rounded-xl text-base" />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description (optional)</span>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} placeholder="What's this channel for?" className="mt-1 h-12 rounded-xl text-base" />
        </label>

        {!editing && (
          <>
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">For</span>
              <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className="mt-1 w-full h-12 rounded-xl border border-input bg-background px-3 text-base">
                {scopes.map((s) => <option key={s.id || "club"} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</span>
              <div className="mt-1 rounded-2xl border border-border divide-y divide-border overflow-hidden">
                {CHANNEL_KINDS.map((k) => (
                  <button key={k.type} type="button" onClick={() => setType(k.type)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted">
                    <span className={`w-5 h-5 rounded-full border-2 grid place-items-center ${type === k.type ? "border-primary" : "border-border"}`}>
                      {type === k.type && <span className="w-2.5 h-2.5 rounded-full bg-primary" />}
                    </span>
                    <span className="flex-1"><span className="block text-sm font-semibold">{k.label}</span><span className="block text-xs text-muted-foreground">{k.hint}</span></span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <Button onClick={save} disabled={busy || !name.trim() || (!editing && !scopes.length)} className="w-full h-12 rounded-full text-base font-semibold">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? "Save changes" : "Create channel"}
        </Button>

        {editing && (isCustomChannel(channel) ? (
          confirmDelete ? (
            <Button variant="destructive" disabled={busy} onClick={() => run({ op: "delete", channel_id: channel.id }, "Channel deleted")} className="w-full h-12 rounded-full">
              Tap again to delete "{channel.name}" and its messages
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => setConfirmDelete(true)} className="w-full h-12 rounded-full text-destructive">
              <Trash2 className="w-4 h-4 mr-2" /> Delete channel
            </Button>
          )
        ) : (
          <p className="text-xs text-center text-muted-foreground">Built-in channels can be renamed but not deleted.</p>
        ))}
      </div>
    </NativeSheet>
  );
}
