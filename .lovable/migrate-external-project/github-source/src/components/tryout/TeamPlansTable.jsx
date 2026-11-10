import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Send, Download, Share2, Pencil, Trash2, Loader2, ChevronDown, Users } from "lucide-react";
import { toast } from "sonner";
import { downloadPlanAsImage, sharePlanUrl } from "./planExport";
import { TeamPlanLinkerButton } from "./TeamPlanLinker";

export default function TeamPlansTable({ plans, teams = [], clubName, clubSlug, onEdit, onDelete, onSendLink }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null); // { id, field }
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(null);
  const [downloading, setDownloading] = useState(null);

  const startEdit = (plan, field) => {
    setEditing({ id: plan.id, field });
    setEditValue(String(plan[field] ?? ""));
  };

  const saveEdit = async (plan, field) => {
    if (editing?.id !== plan.id || editing?.field !== field) return;
    setEditing(null);
    const oldValue = plan[field];
    let newValue = editValue;
    if (field === "club_dues") newValue = Number(newValue) || 0;

    if (newValue === oldValue) return;

    setSaving(plan.id);
    try {
      await base44.entities.TeamPlan.update(plan.id, { [field]: newValue });

      // Sync dues price to the linked Offer
      if (field === "club_dues" && plan.offer_id) {
        const offer = await base44.entities.Offer.get(plan.offer_id).catch(() => null);
        if (offer) {
          const config = { ...(offer.config || {}), amount: newValue };
          await base44.entities.Offer.update(plan.offer_id, { config });
        }
      }

      qc.invalidateQueries({ queryKey: ["teamPlans"] });
      toast.success(`${field.replace(/_/g, " ")} updated`);
    } catch (e) {
      toast.error("Could not update");
    }
    setSaving(null);
  };

  const handleDownload = async (plan, format) => {
    setDownloading(plan.id);
    try {
      await downloadPlanAsImage(plan, clubName, format);
      toast.success(`Downloaded as ${format.toUpperCase()}`);
    } catch (e) {
      toast.error("Download failed");
    }
    setDownloading(null);
  };

  const handleShare = (plan) => {
    const result = sharePlanUrl(plan, clubSlug);
    toast.success(result === "copied" ? "Payment link copied" : "Shared");
  };

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
            <th className="text-left px-3 py-2.5 font-semibold">Team</th>
            <th className="text-left px-3 py-2.5 font-semibold">Age</th>
            <th className="text-left px-3 py-2.5 font-semibold">Season</th>
            <th className="text-left px-3 py-2.5 font-semibold">Dues</th>
            <th className="text-left px-3 py-2.5 font-semibold">Linked Teams</th>
            <th className="text-left px-3 py-2.5 font-semibold">Status</th>
            <th className="text-right px-3 py-2.5 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {plans.map((plan) => (
            <tr key={plan.id} className="border-b border-slate-100 hover:bg-slate-50/50">
              {/* Team name */}
              <td className="px-3 py-2">
                {editing?.id === plan.id && editing.field === "team_name" ? (
                  <Input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => saveEdit(plan, "team_name")}
                    onKeyDown={(e) => e.key === "Enter" && saveEdit(plan, "team_name")}
                    className="h-8 text-sm"
                  />
                ) : (
                  <button onClick={() => startEdit(plan, "team_name")} className="font-medium text-slate-900 text-left hover:bg-slate-100 px-2 py-1 rounded -ml-2">
                    {plan.team_name}
                  </button>
                )}
              </td>
              {/* Age group */}
              <td className="px-3 py-2">
                {editing?.id === plan.id && editing.field === "age_group" ? (
                  <Input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => saveEdit(plan, "age_group")}
                    onKeyDown={(e) => e.key === "Enter" && saveEdit(plan, "age_group")}
                    className="h-8 text-sm w-20"
                  />
                ) : (
                  <button onClick={() => startEdit(plan, "age_group")} className="text-slate-600 hover:bg-slate-100 px-2 py-1 rounded">
                    {plan.age_group || "—"}
                  </button>
                )}
              </td>
              {/* Season */}
              <td className="px-3 py-2">
                {editing?.id === plan.id && editing.field === "season" ? (
                  <Input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => saveEdit(plan, "season")}
                    onKeyDown={(e) => e.key === "Enter" && saveEdit(plan, "season")}
                    className="h-8 text-sm w-28"
                  />
                ) : (
                  <button onClick={() => startEdit(plan, "season")} className="text-slate-600 hover:bg-slate-100 px-2 py-1 rounded">
                    {plan.season || "—"}
                  </button>
                )}
              </td>
              {/* Dues */}
              <td className="px-3 py-2">
                {editing?.id === plan.id && editing.field === "club_dues" ? (
                  <div className="flex items-center">
                    <span className="text-slate-400 mr-1">$</span>
                    <Input
                      autoFocus
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => saveEdit(plan, "club_dues")}
                      onKeyDown={(e) => e.key === "Enter" && saveEdit(plan, "club_dues")}
                      className="h-8 text-sm w-20"
                    />
                  </div>
                ) : (
                  <button onClick={() => startEdit(plan, "club_dues")} className="font-semibold text-slate-900 hover:bg-slate-100 px-2 py-1 rounded">
                    {plan.club_dues > 0 ? `$${plan.club_dues}` : "—"}
                  </button>
                )}
                {plan.offer_id && <span className="ml-1.5 text-xs text-emerald-600">✓</span>}
              </td>
              {/* Linked teams */}
              <td className="px-3 py-2">
                <TeamPlanLinkerButton plan={plan} teams={teams} />
              </td>
              {/* Status */}
              <td className="px-3 py-2">
                <StatusCell plan={plan} onSave={async (val) => {
                  setSaving(plan.id);
                  try {
                    await base44.entities.TeamPlan.update(plan.id, { status: val });
                    qc.invalidateQueries({ queryKey: ["teamPlans"] });
                  } catch { toast.error("Could not update"); }
                  setSaving(null);
                }} />
              </td>
              {/* Actions */}
              <td className="px-3 py-2">
                <div className="flex items-center justify-end gap-1">
                  {saving === plan.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => onSendLink(plan)} title="Send dues link">
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                  {/* Tap-triggered menu — a hover menu is unusable on touch devices */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={downloading === plan.id} title="Download">
                        {downloading === plan.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[100px]">
                      <DropdownMenuItem onClick={() => handleDownload(plan, "png")}>PNG</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownload(plan, "jpeg")}>JPEG</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownload(plan, "pdf")}>PDF</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => handleShare(plan)} title="Share link">
                    <Share2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => onEdit(plan)} title="Edit">
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-red-500" onClick={() => onDelete(plan)} title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusCell({ plan, onSave }) {
  const [open, setOpen] = useState(false);
  const statuses = ["draft", "active", "archived"];
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-1">
        <Badge variant={plan.status === "active" ? "default" : "secondary"} className="text-xs cursor-pointer">
          {plan.status}
          <ChevronDown className="w-3 h-3" />
        </Badge>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[100px]">
            {statuses.map((s) => (
              <button key={s} onClick={() => { onSave(s); setOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50">
                {s}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}