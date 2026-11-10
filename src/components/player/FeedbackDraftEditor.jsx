import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Video, CheckCircle2, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function FeedbackDraftEditor({ feedback, player, guardians, onClose, onSaved }) {
  const [text, setText] = useState(feedback.feedback_text || "");
  const [strengths, setStrengths] = useState((feedback.strengths || []).join("\n"));
  const [priorities, setPriorities] = useState((feedback.development_priorities || []).join("\n"));
  const [selectedVideoIds, setSelectedVideoIds] = useState((feedback.recommended_videos || []).map((v) => v.video_id));
  const [goalDesc, setGoalDesc] = useState(feedback.suggested_goal_description || "");
  const [goalTarget, setGoalTarget] = useState(feedback.suggested_goal_target || "");
  const [saving, setSaving] = useState(false);

  const toggleVideo = (id) => setSelectedVideoIds((prev) => prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]);

  const buildPayload = () => ({
    feedback_text: text,
    strengths: strengths.split("\n").map((s) => s.trim()).filter(Boolean),
    development_priorities: priorities.split("\n").map((s) => s.trim()).filter(Boolean),
    recommended_videos: (feedback.recommended_videos || []).filter((v) => selectedVideoIds.includes(v.video_id)),
    suggested_goal_description: goalDesc,
    suggested_goal_target: goalTarget,
  });

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await base44.entities.PlayerFeedback.update(feedback.id, buildPayload());
      toast.success("Draft saved");
      onSaved();
      onClose();
    } catch { toast.error("Failed to save draft"); } finally { setSaving(false); }
  };

  const handleDiscard = async () => {
    setSaving(true);
    try {
      await base44.entities.PlayerFeedback.delete(feedback.id);
      toast.success("Draft discarded");
      onSaved();
      onClose();
    } catch { toast.error("Failed to discard draft"); } finally { setSaving(false); }
  };

  const handleApproveAndSend = async () => {
    setSaving(true);
    try {
      const me = await base44.auth.me().catch(() => null);
      const payload = { ...buildPayload(), status: "sent", approved_by: me?.email, sent_at: new Date().toISOString() };
      await base44.entities.PlayerFeedback.update(feedback.id, payload);

      const recipients = (guardians || []).filter((g) => g.email);
      const videosHtml = payload.recommended_videos.length
        ? `<p><strong>Recommended videos:</strong></p><ul>${payload.recommended_videos.map((v) => `<li>${v.title} — ${v.reason}</li>`).join("")}</ul>`
        : "";
      const goalHtml = payload.suggested_goal_description
        ? `<p><strong>Development goal:</strong> ${payload.suggested_goal_description}${payload.suggested_goal_target ? ` (Target: ${payload.suggested_goal_target})` : ""}</p>`
        : "";
      const html = `
        <p>New coach feedback for <strong>${player.first_name} ${player.last_name}</strong>:</p>
        <p><strong>Strengths:</strong></p><ul>${payload.strengths.map((s) => `<li>${s}</li>`).join("")}</ul>
        <p><strong>Development priorities:</strong></p><ul>${payload.development_priorities.map((s) => `<li>${s}</li>`).join("")}</ul>
        <p>${payload.feedback_text.replace(/\n/g, "<br/>")}</p>
        ${videosHtml}${goalHtml}
      `;
      await Promise.all(recipients.map((g) =>
        base44.integrations.Core.SendEmail({
          to: g.email,
          subject: `Coach feedback for ${player.first_name}`,
          html,
        }).catch(() => null)
      ));

      toast.success("Feedback approved and sent");
      onSaved();
      onClose();
    } catch { toast.error("Failed to send feedback"); } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Feedback Draft — {player.first_name} {player.last_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Strengths (one per line)</label>
            <Textarea value={strengths} onChange={(e) => setStrengths(e.target.value)} className="min-h-[60px] mt-1" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Development Priorities (one per line)</label>
            <Textarea value={priorities} onChange={(e) => setPriorities(e.target.value)} className="min-h-[60px] mt-1" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Feedback</label>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-[100px] mt-1" />
          </div>
          {(feedback.recommended_videos || []).length > 0 && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Video className="w-3.5 h-3.5" /> Recommended Videos</label>
              <div className="space-y-1.5 mt-1.5">
                {feedback.recommended_videos.map((v) => (
                  <div key={v.video_id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
                    <Checkbox checked={selectedVideoIds.includes(v.video_id)} onCheckedChange={() => toggleVideo(v.video_id)} className="mt-0.5" />
                    <div className="text-xs">
                      <p className="font-medium">{v.title}</p>
                      <p className="text-muted-foreground">{v.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Suggested Goal</label>
            <Input value={goalDesc} onChange={(e) => setGoalDesc(e.target.value)} placeholder="Goal description" className="mt-1" />
            <Input value={goalTarget} onChange={(e) => setGoalTarget(e.target.value)} placeholder="Measurable target" className="mt-2" />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={handleDiscard} disabled={saving} className="text-red-600 hover:text-red-700"><Trash2 className="w-3.5 h-3.5 mr-1.5" /> Discard</Button>
          <Button variant="outline" onClick={handleSaveDraft} disabled={saving}>Save Draft</Button>
          <Button onClick={handleApproveAndSend} disabled={saving} className="bg-primary hover:bg-primary/90">
            {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />} Approve & Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}