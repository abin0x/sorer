import React, { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Sparkles, ExternalLink, Copy, Download, Check } from "lucide-react";
import { useTenant } from "@/lib/TenantContext";
import { PLATFORMS, COMPOSER_PLATFORMS, TONES, addUtm, buildVars, fillTemplate, getBestTemplate, SYSTEM_TEMPLATES } from "@/lib/marketing/constants";
import { useMarketingData, canManageMarketing } from "@/lib/marketing/useMarketingData";
import PostPreview from "./PostPreview";
import HashtagEditor from "./HashtagEditor";
import MediaPicker from "./MediaPicker";

const toLocalInput = (iso) => (iso ? format(parseISO(iso), "yyyy-MM-dd'T'HH:mm") : "");

export default function PostComposer({ open, onOpenChange, event, post, clubId, user }) {
  const { brand } = useTenant();
  const { settings, connectedPlatforms, templates } = useMarketingData(clubId);
  const qc = useQueryClient();
  const { toast } = useToast();
  const editing = !!post;
  const ctx = event || (post ? { title: post.event_title, marketing_type: post.event_type, source_type: post.source_type, source_id: post.source_id } : { title: "", marketing_type: "custom" });
  const requireApproval = !!settings?.require_approval;
  const canApprove = canManageMarketing(user);
  const approver = !requireApproval || canApprove;

  const [platforms, setPlatforms] = useState([]);
  const [tone, setTone] = useState("friendly");
  const [body, setBody] = useState("");
  const [overrides, setOverrides] = useState({});
  const [tab, setTab] = useState("shared");
  const [hashtags, setHashtags] = useState([]);
  const [media, setMedia] = useState([]);
  const [alt, setAlt] = useState("");
  const [withImage, setWithImage] = useState(true);
  const [mode, setMode] = useState("now");
  const [when, setWhen] = useState("");
  const [busy, setBusy] = useState("");
  const [results, setResults] = useState(null);

  useEffect(() => {
    if (!open) return;
    setResults(null); setTab("shared"); setOverrides({}); setBusy("");
    setPlatforms(post ? [post.platform] : (connectedPlatforms.filter((p) => COMPOSER_PLATFORMS.includes(p)).length ? connectedPlatforms.filter((p) => COMPOSER_PLATFORMS.includes(p)) : ["facebook"]));
    setTone(post?.tone || "friendly");
    setBody(post?.body || "");
    setHashtags(post?.hashtags || settings?.default_hashtags || []);
    setMedia(post?.media_urls || []);
    setAlt(post?.alt_text || "");
    setMode(post?.scheduled_for && post.status !== "published" ? "later" : "now");
    setWhen(toLocalInput(post?.scheduled_for));
  }, [open, post?.id, event?.key]);

  const textFor = (p) => overrides[p] ?? body;
  const togglePlatform = (p) => setPlatforms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  const activePlatform = tab === "shared" ? platforms[0] : tab;
  const editValue = tab === "shared" ? body : textFor(tab);
  const setEdit = (v) => (tab === "shared" ? setBody(v) : setOverrides((o) => ({ ...o, [tab]: v })));

  const generate = async () => {
    setBusy("generate");
    const tpl = getBestTemplate([...templates, ...SYSTEM_TEMPLATES], { eventType: ctx.marketing_type, platform: activePlatform, tone, role: post?.campaign_role });
    try {
      const { data } = await base44.functions.invoke("generatePost", {
        club_id: clubId, event: ctx, platform: activePlatform || "facebook", tone, role: post?.campaign_role,
        template_hint: fillTemplate(tpl.body_template, buildVars(ctx, brand.club_name)), include_image: withImage,
      });
      setBody(data.body); setOverrides({}); setHashtags(data.hashtags || []); setAlt(data.alt_text || "");
      if (data.image_url) setMedia([data.image_url]);
    } catch (e) {
      toast({ title: "AI generation failed", description: e?.message, variant: "destructive" });
    }
    setBusy("");
  };

  const buildRow = (p, status, scheduledISO, manual = false) => {
    const text = textFor(p);
    const finalText = ctx.url && settings?.utm_enabled !== false ? text.split(ctx.url).join(addUtm(ctx.url, p, ctx.title)) : text;
    return {
      club_id: clubId, platform: p, status, body: finalText, hashtags, media_urls: media, alt_text: alt, tone,
      title: ctx.title || "Post", event_title: ctx.title, event_type: ctx.marketing_type, source_type: ctx.source_type, source_id: ctx.source_id,
      ...(scheduledISO ? { scheduled_for: scheduledISO } : {}),
      ...((status === "approved" || status === "published") && canApprove ? { approved_by: user?.id } : {}),
      ...(manual ? { published_at: scheduledISO } : {}),
    };
  };

  const save = async (status, { publishNow = false, manual = false, schedule = false } = {}) => {
    if (!platforms.length) return toast({ title: "Pick at least one platform", variant: "destructive" });
    if (!body.trim() && !Object.keys(overrides).length) return toast({ title: "Write something first", variant: "destructive" });
    const needsDate = schedule && !publishNow && !manual;
    if (needsDate && !when) return toast({ title: "Choose a date and time", variant: "destructive" });
    const now = new Date().toISOString();
    const iso = publishNow || manual ? now : (schedule && when) ? new Date(when).toISOString() : undefined;
    setBusy(status);
    const rows = platforms.map((p) => buildRow(p, status, iso, manual));
    const saved = editing ? [await base44.entities.Post.update(post.id, rows[0])] : await Promise.all(rows.map((r) => base44.entities.Post.create(r)));
    qc.invalidateQueries({ queryKey: ["mkt-posts"] });
    if (status === "published" && publishNow && !manual) {
      const out = await Promise.all(saved.map(async (s) => {
        if (s.platform === "club_feed") {
          await base44.entities.Post.update(s.id, { status: "published", published_at: now });
          return { platform: s.platform, success: true, status: "published" };
        }
        try { return { platform: s.platform, ...(await base44.functions.invoke("publishPost", { post_id: s.id })).data }; }
        catch (e) { return { platform: s.platform, success: false, error: e?.response?.data?.error || e.message }; }
      }));
      qc.invalidateQueries({ queryKey: ["mkt-posts"] });
      setResults(out);
    } else {
      const labels = { draft: "Draft saved", in_review: "Submitted for review", approved: schedule ? "Scheduled — the queue will publish it at the set time" : "Post approved", published: "Marked as posted" };
      toast({ title: labels[status] || "Saved" });
      onOpenChange(false);
    }
    setBusy("");
  };

  const copyText = () => {
    navigator.clipboard.writeText(body);
    toast({ title: "Copied to clipboard" });
  };
  const downloadImage = () => {
    const url = media[0];
    if (!url) return;
    fetch(url).then((r) => r.blob()).then((b) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b);
      a.download = `${ctx.title || "post"}.jpg`;
      a.click();
    }).catch(() => toast({ title: "Download failed", variant: "destructive" }));
  };

  const over = platforms.filter((p) => textFor(p).length > PLATFORMS[p].limit);
  const allConnected = platforms.length > 0 && platforms.every((p) => p === "club_feed" || connectedPlatforms.includes(p));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader><SheetTitle className="text-left">{editing ? "Edit post" : "Create post"}{ctx.title ? ` · ${ctx.title}` : ""}</SheetTitle></SheetHeader>
        {results ? (
          <div className="space-y-3 mt-6">
            {results.map((r) => (
              <div key={r.platform} className="p-3 rounded-lg border flex items-center justify-between gap-2">
                <div><p className="font-medium text-sm">{PLATFORMS[r.platform].label}</p><p className="text-xs text-muted-foreground">{r.success ? (r.status === "scheduled" ? "Scheduled" : "Published") : r.error || "Failed"}</p></div>
                {r.success && r.url && <Button size="sm" variant="outline" asChild><a href={r.url} target="_blank" rel="noreferrer"><ExternalLink className="w-3.5 h-3.5 mr-1" />View on {PLATFORMS[r.platform].label}</a></Button>}
              </div>
            ))}
            <Button className="w-full" onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        ) : (
          <div className="space-y-5 mt-4 pb-6">
            <div>
              <Label className="text-xs">Platforms</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {COMPOSER_PLATFORMS.map((p) => (
                  <button key={p} type="button" disabled={editing} onClick={() => togglePlatform(p)}
                    className={`px-3 py-1.5 rounded-full border text-xs font-medium ${platforms.includes(p) ? PLATFORMS[p].chip : "text-muted-foreground"} ${editing ? "opacity-70" : ""}`}>
                    {PLATFORMS[p].label}{connectedPlatforms.includes(p) ? "" : " ·"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[140px]">
                <Label className="text-xs">Tone</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TONES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button type="button" onClick={generate} disabled={!!busy} className="min-h-10">
                {busy === "generate" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Generate with AI
              </Button>
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={withImage} onChange={(e) => setWithImage(e.target.checked)} /> Also generate an AI image</label>

            {platforms.length > 1 && (
              <div className="flex gap-1 overflow-x-auto">
                {["shared", ...platforms].map((t) => (
                  <button key={t} type="button" onClick={() => setTab(t)} className={`px-3 py-1 rounded-md text-xs whitespace-nowrap ${tab === t ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{t === "shared" ? "Shared" : PLATFORMS[t].label}</button>
                ))}
              </div>
            )}
            <div>
              <Textarea rows={7} value={editValue} onChange={(e) => setEdit(e.target.value)} placeholder="Write your post…" />
              <div className="flex flex-wrap gap-x-3 text-[11px] mt-1">
                {platforms.map((p) => { const n = textFor(p).length; return <span key={p} className={n > PLATFORMS[p].limit ? "text-rose-600 font-semibold" : "text-muted-foreground"}>{PLATFORMS[p].label} {n}/{PLATFORMS[p].limit}</span>; })}
              </div>
              {over.length > 0 && <p className="text-xs text-rose-600 mt-1">Over the limit for {over.map((p) => PLATFORMS[p].label).join(", ")}. Trim it, or edit that platform's tab.</p>}
            </div>

            <div><Label className="text-xs">Hashtags</Label><HashtagEditor value={hashtags} onChange={setHashtags} /></div>
            <div><Label className="text-xs">Media</Label><MediaPicker value={media} onChange={setMedia} /></div>
            {media.length > 0 && <div><Label className="text-xs">Alt text</Label><Input value={alt} onChange={(e) => setAlt(e.target.value)} /></div>}

            {activePlatform && <PostPreview platform={activePlatform} body={textFor(activePlatform)} hashtags={hashtags} media={media} clubName={brand.club_name} logoUrl={brand.logo_url} />}

            <div className="space-y-2">
              <Label className="text-xs">When</Label>
              <div className="flex gap-2">
                {approver && <Button type="button" size="sm" variant={mode === "now" ? "default" : "outline"} onClick={() => setMode("now")}>Post now</Button>}
                <Button type="button" size="sm" variant={mode === "later" || !approver ? "default" : "outline"} onClick={() => setMode("later")}>Schedule for…</Button>
              </div>
              {(mode === "later" || !approver) && <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />}
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <Button variant="outline" disabled={!!busy} onClick={() => save("draft")}>Save draft</Button>
              {!approver ? (
                <Button disabled={!!busy} onClick={() => save("in_review")}>Submit for review</Button>
              ) : (
                <>
                  {post?.status === "in_review" && (
                    <Button variant="outline" disabled={!!busy} onClick={() => save("approved")}>Approve</Button>
                  )}
                  {allConnected ? (
                    <>
                      <Button variant="outline" disabled={!!busy || mode !== "later"} onClick={() => save("approved", { schedule: true })}>Schedule</Button>
                      <Button disabled={!!busy || over.length > 0} onClick={() => save("published", { publishNow: true })}>
                        {busy === "published" && <Loader2 className="w-4 h-4 animate-spin" />} Publish now
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" disabled={!!busy} onClick={copyText}><Copy className="w-3.5 h-3.5 mr-1" />Copy text</Button>
                      {media.length > 0 && <Button variant="outline" disabled={!!busy} onClick={downloadImage}><Download className="w-3.5 h-3.5 mr-1" />Download image</Button>}
                      <Button disabled={!!busy} onClick={() => save("published", { manual: true })}><Check className="w-3.5 h-3.5 mr-1" />Mark as posted</Button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}