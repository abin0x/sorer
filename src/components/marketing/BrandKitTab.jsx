import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus, Pencil, Trash2, Star, Upload, ImageIcon } from "lucide-react";
import HashtagEditor from "./HashtagEditor";

export default function BrandKitTab({ clubId, canEdit }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const { data: kits = [], isLoading } = useQuery({
    queryKey: ["mkt-brandkits", clubId],
    enabled: !!clubId,
    queryFn: async () => (await base44.entities.BrandKit.filter({ club_id: clubId }, { sort: "-created_date", limit: 50 })).items,
  });

  const startNew = () =>
    setEditing({ name: "", is_default: kits.length === 0, logo_url: "", primary_color: "#5048e5", secondary_color: "", font_heading: "", font_body: "", voice: "", tagline: "", default_hashtags: [], asset_urls: [] });
  const startEdit = (k) => setEditing({ ...k });

  const save = async () => {
    if (!editing.name) { toast({ title: "Name is required", variant: "destructive" }); return; }
    setBusy(true);
    try {
      if (editing.id) {
        await base44.entities.BrandKit.update(editing.id, editing);
      } else {
        await base44.entities.BrandKit.create({ ...editing, club_id: clubId });
      }
      if (editing.is_default) {
        // unset other defaults
        for (const k of kits) {
          if (k.id !== editing.id && k.is_default) await base44.entities.BrandKit.update(k.id, { is_default: false });
        }
      }
      qc.invalidateQueries({ queryKey: ["mkt-brandkits"] });
      toast({ title: "Brand kit saved" });
      setEditing(null);
    } catch (e) {
      toast({ title: "Save failed", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (k) => {
    if (!window.confirm(`Delete brand kit "${k.name}"?`)) return;
    await base44.entities.BrandKit.delete(k.id);
    qc.invalidateQueries({ queryKey: ["mkt-brandkits"] });
    toast({ title: "Brand kit deleted" });
  };

  const uploadLogo = async (file) => {
    try {
      const { file_uri } = await base44.integrations.Core.UploadPublicFile({ file });
      setEditing((c) => ({ ...c, logo_url: file_uri }));
    } catch (e) {
      toast({ title: "Upload failed", description: e?.message, variant: "destructive" });
    }
  };

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  if (editing) {
    return (
      <div className="max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{editing.id ? "Edit brand kit" : "New brand kit"}</h3>
          <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
        </div>
        <Card><CardContent className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label className="text-xs">Name</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Main brand" /></div>
            <div><Label className="text-xs">Tagline</Label><Input value={editing.tagline} onChange={(e) => setEditing({ ...editing, tagline: e.target.value })} placeholder="Club slogan" /></div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-sm font-medium">Default brand kit</p><p className="text-xs text-muted-foreground">Used when a campaign doesn't specify one.</p></div>
            <Switch checked={editing.is_default} onCheckedChange={(v) => setEditing({ ...editing, is_default: v })} />
          </div>
          <div>
            <Label className="text-xs">Logo</Label>
            <div className="flex items-center gap-3 mt-1">
              {editing.logo_url ? <img src={editing.logo_url} alt="logo" className="w-14 h-14 rounded-lg border object-cover" /> : <div className="w-14 h-14 rounded-lg border flex items-center justify-center text-muted-foreground"><ImageIcon className="w-5 h-5" /></div>}
              <label className="cursor-pointer">
                <span className="inline-flex items-center gap-1.5 text-sm text-primary font-medium"><Upload className="w-3.5 h-3.5" /> Upload</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
              </label>
              <span className="text-xs text-muted-foreground">(stored publicly — anyone with the link can open them)</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Primary color</Label><div className="flex items-center gap-2"><input type="color" value={editing.primary_color || "#5048e5"} onChange={(e) => setEditing({ ...editing, primary_color: e.target.value })} className="w-10 h-9 rounded border" /><Input value={editing.primary_color} onChange={(e) => setEditing({ ...editing, primary_color: e.target.value })} /></div></div>
            <div><Label className="text-xs">Secondary color</Label><div className="flex items-center gap-2"><input type="color" value={editing.secondary_color || "#0ea5e9"} onChange={(e) => setEditing({ ...editing, secondary_color: e.target.value })} className="w-10 h-9 rounded border" /><Input value={editing.secondary_color} onChange={(e) => setEditing({ ...editing, secondary_color: e.target.value })} /></div></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label className="text-xs">Heading font</Label><Input value={editing.font_heading} onChange={(e) => setEditing({ ...editing, font_heading: e.target.value })} placeholder="Inter" /></div>
            <div><Label className="text-xs">Body font</Label><Input value={editing.font_body} onChange={(e) => setEditing({ ...editing, font_body: e.target.value })} placeholder="Inter" /></div>
          </div>
          <div><Label className="text-xs">Brand voice</Label><Textarea rows={3} value={editing.voice} onChange={(e) => setEditing({ ...editing, voice: e.target.value })} placeholder="Warm, family-first, celebrate effort over wins. Avoid slang." /></div>
          <div><Label className="text-xs">Default hashtags</Label><HashtagEditor value={editing.default_hashtags} onChange={(v) => setEditing({ ...editing, default_hashtags: v })} /></div>
          <Button onClick={save} disabled={busy}>{busy && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Save brand kit</Button>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Brand kits feed the AI content generator — voice, colors, logo, and hashtags.</p>
        {canEdit && <Button size="sm" onClick={startNew}><Plus className="w-4 h-4 mr-1" /> New brand kit</Button>}
      </div>
      {kits.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <Star className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground text-sm">No brand kits yet. Create one to give your AI-generated posts a consistent voice.</p>
        </CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {kits.map((k) => (
            <Card key={k.id} className="adisal-card"><CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {k.logo_url ? <img src={k.logo_url} alt="logo" className="w-10 h-10 rounded-lg border object-cover" /> : <div className="w-10 h-10 rounded-lg border flex items-center justify-center text-muted-foreground"><ImageIcon className="w-4 h-4" /></div>}
                  <div><p className="font-semibold text-sm">{k.name}</p>{k.is_default && <Badge className="text-[10px] mt-0.5">Default</Badge>}</div>
                </div>
                {canEdit && <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(k)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600" onClick={() => remove(k)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>}
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full border" style={{ background: k.primary_color }} />
                <span className="w-5 h-5 rounded-full border" style={{ background: k.secondary_color }} />
                {k.tagline && <span className="text-xs text-muted-foreground truncate">{k.tagline}</span>}
              </div>
              {k.voice && <p className="text-xs text-muted-foreground line-clamp-2">{k.voice}</p>}
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}