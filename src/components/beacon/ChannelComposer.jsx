import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Image as ImageIcon, Loader2 } from "lucide-react";
import GameDayDialog from "@/components/beacon/GameDayDialog";
import { URGENCY_META, SIDELINE_UPDATES } from "@/lib/beaconDelivery";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import ChannelPollEditor from "@/components/beacon/ChannelPollEditor";
import LinkPickerDialog from "@/components/beacon/LinkPickerDialog";

const ATTACH_ACCEPT = "image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt";

function kindFor(file) {
  if (file.type?.startsWith("image/")) return "image";
  if (file.type?.startsWith("video/")) return "video";
  if (file.type?.startsWith("audio/")) return "audio";
  return "file";
}

const URGENCY_STYLE = {
  info: "bg-secondary text-secondary-foreground border-border",
  important: "bg-amber-500 text-white border-amber-500",
  urgent: "bg-destructive text-destructive-foreground border-destructive",
};

export default function ChannelComposer({ channel, canSendPriority, onSend, isSocialFeed, clubId, onTyping }) {
  const [content, setContent] = useState("");
  const [imageUri, setImageUri] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [poll, setPoll] = useState(null);
  const [action, setAction] = useState(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [urgency, setUrgency] = useState("info");
  const [gameCard, setGameCard] = useState(null);
  const [location, setLocation] = useState(null);
  const [gameOpen, setGameOpen] = useState(null); // "game" | "pin" | null
  const [sidelineOpen, setSidelineOpen] = useState(false);
  const [ackRequired, setAckRequired] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const fileRef = useRef(null);
  const cameraRef = useRef(null);
  const recRef = useRef(null);
  const [recording, setRecording] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const [voiceDraft, setVoiceDraft] = useState(null);
  const photoRef = useRef(null);
  const cancelRef = useRef(false);

  const uploadAttachment = async (file) => {
    const kind = kindFor(file);
    setUploading(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file, club_id: clubId || channel?.club_id });
      setAttachment({ uri: file_uri, name: file.name, kind, preview: kind === "image" ? URL.createObjectURL(file) : "" });
    } catch (err) {
      toast.error(err?.message || "Upload failed — try a smaller file.");
    } finally {
      setUploading(false);
    }
  };

  const startVoice = async () => {
    if (recRef.current) return;
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) { toast.error("Voice notes aren't supported on this browser."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks = [];
      const started = Date.now();
      cancelRef.current = false;
      const timer = setInterval(() => {
        const secs = Math.floor((Date.now() - started) / 1000) + 1;
        setRecording(secs);
        if (secs >= 120) rec.stop();
      }, 1000);
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        clearInterval(timer);
        stream.getTracks().forEach((t) => t.stop());
        recRef.current = null;
        setRecording(0);
        if (cancelRef.current || !chunks.length) return;
        const type = rec.mimeType || "audio/webm";
        const ext = type.includes("mp4") ? "m4a" : "webm";
        const file = new File(chunks, `voice-note-${Date.now()}.${ext}`, { type });
        setVoiceDraft({ file, url: URL.createObjectURL(file) });
      };
      recRef.current = rec;
      rec.start();
      setRecording(1);
    } catch {
      toast.error("Microphone access was blocked.");
    }
  };

  const handleFeedUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file, club_id: clubId || channel?.club_id });
      setImageUri(file_uri);
      setImagePreview(URL.createObjectURL(file));
    } catch (err) {
      toast.error(err?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleChannelUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const kind = kindFor(file);
    setUploading(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file, club_id: clubId || channel?.club_id });
      setAttachment({ uri: file_uri, name: file.name, kind, preview: kind === "image" ? URL.createObjectURL(file) : "" });
    } catch (err) {
      toast.error(err?.message || "Upload failed — try a smaller file.");
    } finally {
      setUploading(false);
    }
  };

  const togglePoll = () => {
    setPoll(poll ? null : [{ id: `o1-${Date.now()}`, text: "" }, { id: `o2-${Date.now()}`, text: "" }]);
  };

  const handleSubmit = async () => {
    const text = content.trim();
    const pollOptions = !isSocialFeed && poll ? poll.filter((o) => o.text.trim()).map((o) => ({ id: o.id, text: o.text.trim() })) : [];
    if (pollOptions.length === 1) {
      toast.error("Add at least two poll options.");
      return;
    }
    if (pollOptions.length && !text) {
      toast.error("Add a question for your poll.");
      return;
    }
    if (!text && !imageUri && !attachment && !action && !gameCard && !location && pollOptions.length === 0) return;

    setSending(true);
    try {
      await onSend({
        content: text,
        ...(isSocialFeed
          ? { image_uri: imageUri }
          : {
              ...(attachment ? { attachment_uri: attachment.uri, attachment_name: attachment.name, attachment_kind: attachment.kind } : {}),
              ...(pollOptions.length ? { poll_options: pollOptions, poll_votes: {} } : {}),
              ...(action ? { action_label: action.label, action_url: action.url } : {}),
              ...(gameCard ? { kind: "game_day", game_card: gameCard, ack_required: false } : {}),
              ...(location ? { location } : {}),
            }),
        urgency,
        is_priority: urgency === "urgent",
        ack_required: ackRequired,
      });
      setContent("");
      setImageUri("");
      setImagePreview("");
      setAttachment(null);
      setPoll(null);
      setAction(null);
      setUrgency("info");
      setGameCard(null);
      setLocation(null);
      setAckRequired(false);
    } catch (e) {
      toast.error(e.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  if (isSocialFeed) {
    return (
      <div className="p-3 border-t border-border bg-card space-y-2">
        {imagePreview && <img src={imagePreview} alt="" className="h-24 rounded-lg object-cover" />}
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFeedUpload} className="hidden" />
          <Button variant="outline" size="icon" className="rounded-full shrink-0" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
          </Button>
          <Input value={content} onChange={(e) => setContent(e.target.value)} placeholder="Share a moment with the team..." className="flex-1 rounded-full" />
          <Button onClick={handleSubmit} disabled={sending || (!content.trim() && !imageUri)} className="rounded-full bg-primary text-primary-foreground shrink-0">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post"}
          </Button>
        </div>
      </div>
    );
  }

  const isAnnouncementStyle = channel.allow_replies === false;
  const canSubmit = !sending && (!!content.trim() || !!attachment || !!poll || !!gameCard || !!location);
  const applySideline = (u) => { setContent(u.text); setUrgency(u.urgency); setSidelineOpen(false); if (u.key === "field") setGameOpen("pin"); };

  const cancelRecording = () => { cancelRef.current = true; recRef.current?.stop(); };
  const stopRecording = () => recRef.current?.stop();
  const discardVoice = () => { if (voiceDraft?.url) URL.revokeObjectURL(voiceDraft.url); setVoiceDraft(null); };
  const attachVoice = async () => { const d = voiceDraft; setVoiceDraft(null); if (d) await uploadAttachment(d.file); };
  const pick = (fn) => { setMoreOpen(false); fn(); };
  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const menuItems = [
    { label: "Photos", run: () => photoRef.current?.click() },
    { label: "Camera", run: () => cameraRef.current?.click() },
    { label: "Document", run: () => fileRef.current?.click() },
    { label: poll ? "Remove Poll" : "Poll", run: togglePoll },
    { label: "Payment Link", run: () => setLinkOpen(true) },
    { label: "Field Location", run: () => setGameOpen("pin") },
    ...(canSendPriority ? [
      { label: "Game Day Card", run: () => setGameOpen("game") },
      { label: "Sideline Update", run: () => setSidelineOpen((v) => !v) },
    ] : []),
  ];

  const chip = "flex items-center gap-2 rounded-2xl bg-muted px-3 py-2 text-[13px]";
  const removeBtn = (fn, label) => (
    <button type="button" onClick={fn} aria-label={`Remove ${label}`} className="w-5 h-5 rounded-full bg-foreground/70 text-background grid place-items-center text-[11px] leading-none">✕</button>
  );

  return (
    <div className="relative px-2 pt-2 pb-2 border-t border-border/60 bg-background/95 backdrop-blur space-y-2">
      {moreOpen && (
        <>
          <button type="button" aria-label="Close menu" className="fixed inset-0 z-30 cursor-default" onClick={() => setMoreOpen(false)} />
          <div className="absolute left-2 bottom-full mb-2 z-40 w-64 overflow-hidden rounded-2xl bg-popover/95 backdrop-blur-xl shadow-2xl border border-border/50 animate-in fade-in zoom-in-95 origin-bottom-left">
            {menuItems.map((m) => (
              <button key={m.label} type="button" onClick={() => pick(m.run)}
                className="block w-full text-left px-4 py-3 text-[16px] text-popover-foreground border-b border-border/40 last:border-b-0 active:bg-muted">
                {m.label}
              </button>
            ))}
            {canSendPriority && isAnnouncementStyle && (
              <button type="button" onClick={() => setAckRequired((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-3 text-[16px] border-t border-border/40 active:bg-muted">
                Require "Got it" <span className="text-primary">{ackRequired ? "✓" : ""}</span>
              </button>
            )}
            {canSendPriority && (
              <div className="px-3 py-3 border-t border-border/40">
                <div className="text-[12px] text-muted-foreground mb-1.5 px-1">Urgency</div>
                <div className="grid grid-cols-3 gap-0.5 rounded-lg bg-muted p-0.5" role="radiogroup" aria-label="Urgency">
                  {Object.entries(URGENCY_META).map(([key, meta]) => (
                    <button key={key} type="button" role="radio" aria-checked={urgency === key} title={meta.hint} onClick={() => setUrgency(key)}
                      className={`rounded-md py-1 text-[13px] font-medium ${urgency === key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>
                      {meta.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {poll && <ChannelPollEditor options={poll} onChange={setPoll} />}

      {sidelineOpen && (
        <div className="flex flex-wrap gap-1.5 rounded-xl bg-muted/60 p-2">
          {SIDELINE_UPDATES.map((u) => (
            <button key={u.key} onClick={() => applySideline(u)} className={`text-xs rounded-full px-3 py-1.5 border font-medium ${URGENCY_STYLE[u.urgency]}`}>{u.label}</button>
          ))}
        </div>
      )}

      {(attachment || action || gameCard || location || urgency !== "info") && (
        <div className="flex flex-wrap items-center gap-2 px-1">
          {attachment && (
            attachment.kind === "image" && attachment.preview ? (
              <div className="relative">
                <img src={attachment.preview} alt="" className="h-20 w-20 rounded-2xl object-cover" />
                <div className="absolute -top-1.5 -right-1.5">{removeBtn(() => setAttachment(null), "photo")}</div>
              </div>
            ) : attachment.kind === "audio" ? (
              <div className={chip}><span className="font-medium">Voice note</span>{removeBtn(() => setAttachment(null), "voice note")}</div>
            ) : (
              <div className={chip}><span className="truncate max-w-[180px]">{attachment.name}</span>{removeBtn(() => setAttachment(null), "file")}</div>
            )
          )}
          {gameCard && <div className={chip}><span className="font-medium">Game day{gameCard.opponent ? ` vs ${gameCard.opponent}` : ""}</span>{removeBtn(() => setGameCard(null), "game card")}</div>}
          {location && <div className={chip}><span className="truncate max-w-[180px]">{location.name || location.address}</span>{removeBtn(() => setLocation(null), "location")}</div>}
          {action && <div className={chip}><span className="font-medium">{action.label}</span>{removeBtn(() => setAction(null), "link")}</div>}
          {urgency !== "info" && <div className={`text-[12px] font-semibold rounded-full px-2.5 py-1 border ${URGENCY_STYLE[urgency]}`}>{URGENCY_META[urgency].label}</div>}
        </div>
      )}

      <input ref={fileRef} type="file" accept={ATTACH_ACCEPT} onChange={handleChannelUpload} className="hidden" />
      <input ref={photoRef} type="file" accept="image/*,video/*" onChange={handleChannelUpload} className="hidden" />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) uploadAttachment(f); }} className="hidden" />

      {recording > 0 ? (
        <div className="flex items-center gap-2">
          <button type="button" onClick={cancelRecording} aria-label="Cancel recording" className="w-9 h-9 shrink-0 rounded-full grid place-items-center text-destructive"><IosTrash /></button>
          <div className="flex-1 flex items-center gap-2 rounded-[20px] bg-muted px-3 h-9">
            <span className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
            <span className="text-[15px] tabular-nums font-medium">{fmt(recording)}</span>
            <span className="text-[13px] text-muted-foreground truncate">Recording…</span>
          </div>
          <button type="button" onClick={stopRecording} aria-label="Stop and preview" className="w-9 h-9 shrink-0 rounded-full bg-destructive grid place-items-center">
            <span className="w-3 h-3 rounded-[3px] bg-destructive-foreground" />
          </button>
        </div>
      ) : voiceDraft ? (
        <div className="flex items-center gap-2">
          <button type="button" onClick={discardVoice} aria-label="Discard voice note" className="w-9 h-9 shrink-0 rounded-full grid place-items-center text-destructive"><IosTrash /></button>
          <audio src={voiceDraft.url} controls className="flex-1 min-w-0 h-9" />
          <button type="button" onClick={attachVoice} aria-label="Attach voice note" className="w-9 h-9 shrink-0 rounded-full bg-primary text-primary-foreground grid place-items-center"><IosArrowUp /></button>
        </div>
      ) : (
        <div className="flex items-end gap-1.5">
          <button type="button" onClick={() => setMoreOpen((v) => !v)} aria-label="Add attachment" aria-expanded={moreOpen}
            className={`w-9 h-9 shrink-0 rounded-full grid place-items-center bg-muted text-muted-foreground transition-transform duration-200 ${moreOpen ? "rotate-45" : ""}`}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <IosPlus />}
          </button>
          <div className="flex-1 min-w-0 flex items-end rounded-[20px] border border-border bg-background pl-3 pr-1 py-1">
            <Textarea
              value={content}
              onChange={(e) => { setContent(e.target.value); onTyping?.(); }}
              placeholder={gameCard ? "Add a note for families (optional)..." : poll ? "Ask a question..." : isAnnouncementStyle ? "Write an announcement..." : "Message"}
              rows={isAnnouncementStyle || poll ? 3 : 1}
              className="resize-none border-0 shadow-none focus-visible:ring-0 p-0 py-1 min-h-[28px] text-[16px] bg-transparent"
              onKeyDown={(e) => { if (!isAnnouncementStyle && !poll && e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
            />
            {canSubmit || sending ? (
              <button type="button" onClick={handleSubmit} disabled={!canSubmit} aria-label="Send" className="w-8 h-8 shrink-0 rounded-full bg-primary text-primary-foreground grid place-items-center">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <IosArrowUp />}
              </button>
            ) : (
              <button type="button" onClick={startVoice} aria-label="Record voice note" className="w-8 h-8 shrink-0 rounded-full grid place-items-center text-muted-foreground">
                <IosMic />
              </button>
            )}
          </div>
        </div>
      )}

      <GameDayDialog
        open={!!gameOpen}
        mode={gameOpen || "game"}
        onOpenChange={(v) => !v && setGameOpen(null)}
        onAttach={(r) => { if (r.game_card) setGameCard(r.game_card); if (r.location) setLocation(r.location); }}
      />
      <LinkPickerDialog open={linkOpen} onOpenChange={setLinkOpen} clubId={clubId} onAttach={setAction} />
    </div>
  );
}

// SF Symbols–style glyphs (mic, trash, plus, arrow.up)
function IosMic() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="8.5" y="2.5" width="7" height="12" rx="3.5" fill="currentColor" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 17.5v3.5M9 21h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function IosTrash() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 6.5h16M9.5 6.5V4.8c0-.7.6-1.3 1.3-1.3h2.4c.7 0 1.3.6 1.3 1.3v1.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M6 6.5l.9 12.6c.1 1 .9 1.9 2 1.9h6.2c1.1 0 1.9-.9 2-1.9L18 6.5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M10 10.5v6.5M14 10.5v6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function IosPlus() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4v16M4 12h16" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
function IosArrowUp() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 20V5M5.5 11.5L12 5l6.5 6.5" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
