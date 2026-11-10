import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Send, Image as ImageIcon, Pin, Loader2, Paperclip, BarChart3, CreditCard, FileText, Video, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import ChannelPollEditor from "@/components/beacon/ChannelPollEditor";
import LinkPickerDialog from "@/components/beacon/LinkPickerDialog";

const ATTACH_ACCEPT = "image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt";

function kindFor(file) {
  if (file.type?.startsWith("image/")) return "image";
  if (file.type?.startsWith("video/")) return "video";
  return "file";
}

function Pill({ active, onClick, children, activeClass = "bg-primary text-primary-foreground border-primary" }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors ${
        active ? activeClass : "border-border text-muted-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

export default function ChannelComposer({ channel, canSendPriority, onSend, isSocialFeed, clubId }) {
  const [content, setContent] = useState("");
  const [imageUri, setImageUri] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [poll, setPoll] = useState(null);
  const [action, setAction] = useState(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [isPriority, setIsPriority] = useState(false);
  const [ackRequired, setAckRequired] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const fileRef = useRef(null);

  const handleFeedUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
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
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
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
    if (!text && !imageUri && !attachment && !action && pollOptions.length === 0) return;

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
            }),
        is_priority: isPriority,
        ack_required: ackRequired,
      });
      setContent("");
      setImageUri("");
      setImagePreview("");
      setAttachment(null);
      setPoll(null);
      setAction(null);
      setIsPriority(false);
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
  const canSubmit = !sending && (!!content.trim() || !!attachment || !!poll);

  return (
    <div className="p-3 border-t border-border bg-card space-y-2">
      {poll && <ChannelPollEditor options={poll} onChange={setPoll} />}

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={poll ? "Ask a question..." : isAnnouncementStyle ? "Write an announcement..." : "Type a message..."}
        rows={isAnnouncementStyle || poll ? 3 : 1}
        className="resize-none rounded-xl"
        onKeyDown={(e) => { if (!isAnnouncementStyle && !poll && e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
      />

      {(attachment || action) && (
        <div className="flex flex-wrap items-center gap-2">
          {attachment && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-2 py-1.5 text-xs">
              {attachment.kind === "image" && attachment.preview
                ? <img src={attachment.preview} alt="" className="h-8 w-8 rounded object-cover" />
                : attachment.kind === "video"
                  ? <Video className="w-3.5 h-3.5" />
                  : <FileText className="w-3.5 h-3.5" />}
              <span className="truncate max-w-[160px]">{attachment.name}</span>
              <button onClick={() => setAttachment(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {action && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 px-2 py-1.5 text-xs">
              <CreditCard className="w-3.5 h-3.5 text-primary" />
              <span className="font-medium">{action.label}</span>
              <button onClick={() => setAction(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <input ref={fileRef} type="file" accept={ATTACH_ACCEPT} onChange={handleChannelUpload} className="hidden" />
        <Pill active={false} onClick={() => fileRef.current?.click()}>
          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Paperclip className="w-3 h-3" />} Attach
        </Pill>
        <Pill active={!!poll} onClick={togglePoll}>
          <BarChart3 className="w-3 h-3" /> Poll
        </Pill>
        <Pill active={!!action} onClick={() => setLinkOpen(true)}>
          <CreditCard className="w-3 h-3" /> Payment link
        </Pill>
        {canSendPriority && (
          <Pill active={isPriority} onClick={() => setIsPriority((v) => !v)} activeClass="bg-amber-500 text-white border-amber-500">
            <Pin className="w-3 h-3" /> Priority
          </Pill>
        )}
        {canSendPriority && isAnnouncementStyle && (
          <Pill active={ackRequired} onClick={() => setAckRequired((v) => !v)}>
            Require "Got it"
          </Pill>
        )}
        <Button onClick={handleSubmit} disabled={!canSubmit} size="sm" className="rounded-full bg-primary text-primary-foreground ml-auto">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-3.5 h-3.5 mr-1.5" /> Send</>}
        </Button>
      </div>

      <LinkPickerDialog open={linkOpen} onOpenChange={setLinkOpen} clubId={clubId} onAttach={setAction} />
    </div>
  );
}