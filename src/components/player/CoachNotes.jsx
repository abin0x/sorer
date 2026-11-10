import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, StickyNote, Sparkles, Loader2, Lock, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import FeedbackDraftEditor from "./FeedbackDraftEditor";
import FeedbackHistory from "./FeedbackHistory";
import AudioDictation from "./AudioDictation";
import Carousel from "@/components/shared/Carousel";

const TAGS = ["technical", "tactical", "physical", "mental", "attitude", "effort"];
const TAG_TO_TENET = { technical: "precise", tactical: "insightful", physical: "explosive", mental: "combative", attitude: "combative", effort: "combative" };

export default function CoachNotes({ player, playerId, canManage, guardians = [], evaluations = [] }) {
  const queryClient = useQueryClient();
  const { toast: uiToast } = useToast();
  const [newNote, setNewNote] = useState("");
  const [context, setContext] = useState("practice");
  const [tags, setTags] = useState([]);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeDraft, setActiveDraft] = useState(null);
  const [selectedNoteIds, setSelectedNoteIds] = useState([]);
  const [editingNoteId, setEditingNoteId] = useState(null);

  const { data: notes = [] } = useQuery({
    queryKey: ["player-notes", playerId],
    queryFn: () => base44.entities.PlayerNote.filter({ player_id: playerId }, "-created_date", 50),
    enabled: !!playerId,
  });
  const { data: feedbackItems = [] } = useQuery({
    queryKey: ["player-feedback", playerId],
    queryFn: () => base44.entities.PlayerFeedback.filter({ player_id: playerId }, "-created_date", 50),
    enabled: !!playerId,
  });
  const { data: videos = [] } = useQuery({
    queryKey: ["training-videos-for-feedback"],
    queryFn: () => base44.entities.TrainingVideo.list("-order", 200).catch(() => []),
  });
  const { data: curriculumDocs = [] } = useQuery({
    queryKey: ["curriculum-docs-for-feedback"],
    queryFn: () => base44.entities.CurriculumDocument.filter({ is_active: true }, "-created_date", 50).catch(() => []),
  });

  const drafts = feedbackItems.filter((f) => f.status !== "sent");
  const sent = feedbackItems.filter((f) => f.status === "sent");

  const toggleTag = (tag) => setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  const toggleNoteSelection = (noteId) => setSelectedNoteIds((prev) => prev.includes(noteId) ? prev.filter((id) => id !== noteId) : [...prev, noteId]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["player-notes", playerId] });
    queryClient.invalidateQueries({ queryKey: ["player-feedback", playerId] });
  };

  const saveNote = async (visibility) => {
    const me = await base44.auth.me().catch(() => null);
    return base44.entities.PlayerNote.create({
      player_id: playerId,
      player_name: `${player.first_name} ${player.last_name}`,
      author_email: me?.email,
      author_name: me?.full_name,
      context,
      note_text: newNote.trim(),
      tags,
      visibility,
    });
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setSaving(true);
    try {
      if (editingNoteId) {
        await base44.entities.PlayerNote.update(editingNoteId, {
          note_text: newNote.trim(),
          context,
          tags,
        });
        setEditingNoteId(null);
        toast.success("Note updated");
      } else {
        const tempId = `tmp-${Date.now()}`;
        // Show the note immediately, with a syncing state, while it saves.
        queryClient.setQueryData(["player-notes", playerId], (old = []) => [
          {
            id: tempId,
            __pending: true,
            player_id: playerId,
            player_name: `${player.first_name} ${player.last_name}`,
            context,
            note_text: newNote.trim(),
            tags,
            visibility: "internal_only",
            created_date: new Date().toISOString(),
          },
          ...(old || []),
        ]);
        try {
          const created = await saveNote("internal_only");
          // Swap the temporary note for the record the server returned.
          queryClient.setQueryData(["player-notes", playerId], (old = []) => (old || []).map((n) => (n.id === tempId ? created : n)));
          toast.success("Note added");
        } catch (e) {
          queryClient.setQueryData(["player-notes", playerId], (old = []) => (old || []).filter((n) => n.id !== tempId));
          uiToast({ title: "Couldn't save, please try again.", description: e?.message, variant: "destructive" });
          return; // keeps the typed note on screen so nothing is lost
        }
      }
      setNewNote(""); setTags([]);
      refresh();
    } catch (e) { console.error("Failed to save note:", e); toast.error("Failed to save note: " + (e?.message || "unknown error")); } finally { setSaving(false); }
  };

  const handleEditNote = (note) => {
    setEditingNoteId(note.id);
    setNewNote(note.note_text);
    setContext(note.context || "practice");
    setTags(note.tags || []);
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setNewNote(""); setTags([]);
  };

  const handleDeleteNote = async (noteId) => {
    if (!confirm("Delete this note?")) return;
    try {
      await base44.entities.PlayerNote.delete(noteId);
      if (editingNoteId === noteId) handleCancelEdit();
      toast.success("Note deleted");
      refresh();
    } catch (e) { console.error("Failed to delete note:", e); toast.error("Failed to delete note: " + (e?.message || "unknown error")); }
  };

  const generateFeedback = async (noteTexts, sourceNoteIds = []) => {
    const me = await base44.auth.me().catch(() => null);
    const relevantTenets = [...new Set(tags.map((t) => TAG_TO_TENET[t]))];
    const candidateVideos = videos
      .filter((v) => relevantTenets.length === 0 || relevantTenets.includes(v.tenet))
      .slice(0, 8)
      .map((v) => ({ video_id: v.id, title: v.title, tenet: v.tenet, level: v.level }));
    const latestEval = evaluations[0];

    // Build curriculum context from active CurriculumDocuments
    const curriculumContext = (curriculumDocs || [])
      .map((d) => `[${d.title}]: ${d.content_text || d.description || ""}`)
      .join("\n\n")
      .slice(0, 4000);

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an assistant to a youth soccer club. Generate feedback for a player that is (a) aligned to the club's E.P.I.C. development framework (Explosive/physical, Precise/technical, Insightful/tactical, Combative/mental), (b) age-appropriate, (c) strengths-based and specific, (d) actionable, and (e) grounded in the club's curriculum and development philosophy provided below. Recommend 1-3 videos from the provided library that support self-training. Do not include any medical, safeguarding, or disciplinary content, and never mention other players by name.

${curriculumContext ? `CLUB CURRICULUM & DEVELOPMENT PHILOSOPHY:\n${curriculumContext}\n\n` : ""}

Player: ${player.first_name} ${player.last_name}, position: ${player.position || "unspecified"}, age group: ${player.age_group || "unspecified"}.
${latestEval ? `Most recent evaluation strengths: ${latestEval.strengths || "none"}. Areas of growth: ${latestEval.areas_of_growth || "none"}.` : ""}

Coach note(s) (context: ${context}, tags: ${tags.join(", ") || "none"}):
${noteTexts.map((t, i) => `Note ${i + 1}: "${t}"`).join("\n")}

Video library candidates: ${JSON.stringify(candidateVideos)}

Respond with strengths-based feedback, at least one strength before any development priority.`,
      response_json_schema: {
        type: "object",
        properties: {
          feedback_text: { type: "string" },
          strengths: { type: "array", items: { type: "string" } },
          development_priorities: { type: "array", items: { type: "string" } },
          recommended_videos: {
            type: "array",
            items: { type: "object", properties: { video_id: { type: "string" }, title: { type: "string" }, reason: { type: "string" } } },
          },
          suggested_goal: {
            type: "object",
            properties: { description: { type: "string" }, measurable_target: { type: "string" } },
          },
        },
        required: ["feedback_text", "strengths", "development_priorities"],
      },
    });

    const created = await base44.entities.PlayerFeedback.create({
      note_id: sourceNoteIds[0] || undefined,
      player_id: playerId,
      player_name: `${player.first_name} ${player.last_name}`,
      feedback_text: result.feedback_text,
      strengths: result.strengths || [],
      development_priorities: result.development_priorities || [],
      recommended_videos: result.recommended_videos || [],
      suggested_goal_description: result.suggested_goal?.description || "",
      suggested_goal_target: result.suggested_goal?.measurable_target || "",
      status: "draft",
      created_by: me?.email,
    });

    return created;
  };

  const handleGenerateFeedback = async () => {
    if (!newNote.trim()) return;
    setGenerating(true);
    try {
      await saveNote("draft_for_feedback");
      const created = await generateFeedback([newNote.trim()]);
      setNewNote(""); setTags([]);
      refresh();
      setActiveDraft(created);
      toast.success("Feedback draft generated");
    } catch {
      toast.error("Failed to generate feedback");
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateFromSelected = async () => {
    const selectedNotes = notes.filter((n) => selectedNoteIds.includes(n.id));
    if (selectedNotes.length === 0) return;
    setGenerating(true);
    try {
      const created = await generateFeedback(selectedNotes.map((n) => n.note_text), selectedNotes.map((n) => n.id));
      setSelectedNoteIds([]);
      refresh();
      setActiveDraft(created);
      toast.success(`Feedback generated from ${selectedNotes.length} note${selectedNotes.length > 1 ? "s" : ""}`);
    } catch {
      toast.error("Failed to generate feedback");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card className="adisal-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-primary" /> Coach Notes & Feedback
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Draft feedback awaiting review — coaches only */}
        {drafts.length > 0 && canManage && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase">Draft Feedback Awaiting Review</p>
            {drafts.map((d) => (
              <button key={d.id} onClick={() => setActiveDraft(d)} className="w-full text-left p-2 rounded-lg bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors">
                <p className="text-xs text-amber-800 line-clamp-2">{d.feedback_text}</p>
              </button>
            ))}
          </div>
        )}

        {/* Notes list — coaches only */}
        {canManage && (
          <>
            <Carousel
              items={notes}
              emptyMessage="No notes recorded yet."
              renderItem={(n) => (
                <div key={n.id} className={`surface-tile p-3 text-sm ${n.__pending ? "opacity-60" : ""}`}>
                  <div className="flex items-start gap-2">
                    <Checkbox
                      checked={selectedNoteIds.includes(n.id)}
                      onCheckedChange={() => toggleNoteSelection(n.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="text-[10px] text-muted-foreground">{n.created_date ? format(new Date(n.created_date), "MMM d, yyyy") : ""}</span>
                        {n.__pending && (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Loader2 className="w-2.5 h-2.5 animate-spin" /> Syncing…
                          </span>
                        )}
                        <Badge variant="outline" className="text-[9px] capitalize">{n.context}</Badge>
                        {n.visibility === "internal_only" && <Badge variant="outline" className="text-[9px]"><Lock className="w-2.5 h-2.5 mr-0.5" />Internal</Badge>}
                        {n.tags?.map((t) => <Badge key={t} variant="secondary" className="text-[9px]">{t}</Badge>)}
                        {!n.__pending && (
                          <div className="ml-auto flex gap-0.5">
                            <button onClick={() => handleEditNote(n)} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700" title="Edit"><Pencil className="w-3 h-3" /></button>
                            <button onClick={() => handleDeleteNote(n.id)} className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-500" title="Delete"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        )}
                      </div>
                      <p className="whitespace-pre-wrap">{n.note_text}</p>
                    </div>
                  </div>
                </div>
              )}
            />

            {selectedNoteIds.length > 0 && (
              <Button onClick={handleGenerateFromSelected} disabled={generating} size="sm" className="w-full bg-primary hover:bg-primary/90">
                {generating ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
                Generate Feedback from {selectedNoteIds.length} Note{selectedNoteIds.length > 1 ? "s" : ""}
              </Button>
            )}

            {/* Note creation form */}
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center gap-2">
                <Select value={context} onValueChange={setContext}>
                  <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="practice">Practice</SelectItem>
                    <SelectItem value="game">Game</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="self">Self</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-1">
                  {TAGS.map((t) => (
                    <Badge
                      key={t}
                      onClick={() => toggleTag(t)}
                      variant={tags.includes(t) ? "default" : "outline"}
                      className="text-[10px] cursor-pointer capitalize"
                    >
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Type or dictate a coaching note…"
                className="min-h-[80px] resize-none"
              />
              <div className="flex items-center gap-2 flex-wrap">
                <Button onClick={handleAddNote} disabled={saving || generating || !newNote.trim()} size="sm" variant={editingNoteId ? "default" : "outline"}>
                  {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />} {editingNoteId ? "Update Note" : "Save Note"}
                </Button>
                {editingNoteId && (
                  <Button onClick={handleCancelEdit} disabled={saving || generating} size="sm" variant="ghost">
                    Cancel
                  </Button>
                )}
                <Button onClick={handleGenerateFeedback} disabled={saving || generating || !newNote.trim()} size="sm" className="bg-primary hover:bg-primary/90">
                  {generating ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />} Save & Generate Feedback
                </Button>
                <AudioDictation onTranscript={(t) => setNewNote((prev) => (prev ? prev + " " : "") + t)} disabled={saving || generating} />
              </div>
            </div>
          </>
        )}

        {/* Feedback history — visible to both players and coaches */}
        {sent.length > 0 && (
          <div className={`${canManage ? "pt-2 border-t border-border" : ""}`}>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Feedback History</p>
            <FeedbackHistory items={sent} />
          </div>
        )}
        {!canManage && sent.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-3">No feedback yet.</p>
        )}
      </CardContent>

      {activeDraft && (
        <FeedbackDraftEditor
          feedback={activeDraft}
          player={player}
          guardians={guardians}
          onClose={() => setActiveDraft(null)}
          onSaved={refresh}
        />
      )}
    </Card>
  );
}