import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Copy } from "lucide-react";
import { EVENT_TYPES, SYSTEM_TEMPLATES } from "@/lib/marketing/constants";
import { useMarketingData } from "@/lib/marketing/useMarketingData";
import TemplateDialog from "./TemplateDialog";

export default function TemplatesTab({ clubId, canEdit }) {
  const qc = useQueryClient();
  const { templates } = useMarketingData(clubId);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);

  const openDialog = (t) => { setEditing(t); setOpen(true); };
  const save = async (form) => {
    const { id, created_date, updated_date, created_by_id, role, ...data } = form;
    const payload = { ...data, club_id: clubId, is_system: false };
    if (id && !String(id).startsWith("sys-")) await base44.entities.PostTemplate.update(id, payload);
    else await base44.entities.PostTemplate.create(payload);
    qc.invalidateQueries({ queryKey: ["mkt-templates"] });
    setOpen(false);
  };
  const remove = async (t) => {
    await base44.entities.PostTemplate.delete(t.id);
    qc.invalidateQueries({ queryKey: ["mkt-templates"] });
  };

  const Card1 = ({ t, system }) => (
    <Card><CardContent className="p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div><p className="font-semibold text-sm">{t.name}</p><p className="text-xs text-muted-foreground">{EVENT_TYPES[t.event_type]} · {t.tone} · {t.platform === "any" ? "any platform" : t.platform}</p></div>
        {system && <Badge variant="secondary">Starter</Badge>}
      </div>
      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{t.body_template}</p>
      {canEdit && (
        <div className="flex gap-1 pt-1">
          {system ? (
            <Button size="sm" variant="outline" onClick={() => openDialog({ ...t, id: undefined, name: `${t.name} (custom)` })}><Copy className="w-3.5 h-3.5 mr-1" /> Customize</Button>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={() => openDialog(t)}><Pencil className="w-3.5 h-3.5 mr-1" /> Edit</Button>
              <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => remove(t)}><Trash2 className="w-3.5 h-3.5" /></Button>
            </>
          )}
        </div>
      )}
    </CardContent></Card>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Templates guide the AI and fill campaign drafts. Your templates are preferred over starters.</p>
        {canEdit && <Button onClick={() => openDialog(null)}><Plus className="w-4 h-4 mr-1" /> New template</Button>}
      </div>
      {templates.length > 0 && (
        <div className="space-y-2"><h3 className="font-semibold text-sm">Your templates</h3><div className="grid md:grid-cols-2 gap-3">{templates.map((t) => <Card1 key={t.id} t={t} />)}</div></div>
      )}
      <div className="space-y-2"><h3 className="font-semibold text-sm">Starter templates</h3><div className="grid md:grid-cols-2 gap-3">{SYSTEM_TEMPLATES.map((t) => <Card1 key={t.id} t={t} system />)}</div></div>
      <TemplateDialog open={open} onOpenChange={setOpen} template={editing} onSave={save} />
    </div>
  );
}