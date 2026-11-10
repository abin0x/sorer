import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RaciStaffCell from "./RaciStaffCell";
import { CheckCircle2, Zap, Power, Pencil } from "lucide-react";

const STATUS_COLORS = {
  not_started: "bg-slate-100 text-slate-600 border-slate-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const PAYMENT_COLORS = {
  not_paid: "bg-red-50 text-red-700 border-red-200",
  partial: "bg-amber-50 text-amber-700 border-amber-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  na: "bg-slate-50 text-slate-500 border-slate-200",
};

const PAYMENT_LABELS = {
  not_paid: "Not Paid",
  partial: "Partial",
  paid: "Paid",
  na: "N/A",
};

export default function RoadmapTaskRow({ task, canEdit, onChanged, onMarkFulfilled, onActivate, onEdit }) {
  const [saving, setSaving] = useState(false);
  const [budgetValue, setBudgetValue] = useState(task.budget ?? "");

  const update = async (data) => {
    setSaving(true);
    try {
      await base44.entities.RoadmapTask.update(task.id, data);
      onChanged();
    } finally {
      setSaving(false);
    }
  };

  const handleRaciChange = async (field, value) => {
    setSaving(true);
    try {
      await base44.entities.RoadmapTask.update(task.id, { [field]: value });
      if (task.is_active && task.kanban_program_id) {
        try { await base44.entities.Program.update(task.kanban_program_id, { [field]: value }); } catch (e) { /* program may be gone */ }
      }
      onChanged();
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    setSaving(true);
    try {
      await base44.entities.RoadmapTask.update(task.id, { is_active: false, kanban_program_id: "" });
      if (task.kanban_program_id) {
        try { await base44.entities.Program.delete(task.kanban_program_id); } catch (e) { /* program may be gone */ }
      }
      onChanged();
    } finally {
      setSaving(false);
    }
  };

  const saveBudget = () => {
    if (budgetValue === (task.budget ?? "")) return;
    update({ budget: budgetValue === "" ? null : Number(budgetValue) });
  };

  return (
    <TableRow className={!task.is_active ? "opacity-60" : ""}>
      <TableCell className="min-w-[120px]">
        {canEdit && (
          task.is_active ? (
            <Button size="sm" variant="outline" className="h-8 text-xs whitespace-nowrap" onClick={handleDeactivate} disabled={saving}>
              <Power className="w-3.5 h-3.5 mr-1" /> Deactivate
            </Button>
          ) : (
            <Button size="sm" className="h-8 text-xs whitespace-nowrap bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => onActivate(task)}>
              <Zap className="w-3.5 h-3.5 mr-1" /> Activate
            </Button>
          )
        )}
      </TableCell>
      <TableCell className="text-xs font-medium whitespace-nowrap">{task.task_number}</TableCell>
      <TableCell className="text-sm min-w-[220px]">
        <div className="flex items-center gap-1.5">
          <span
            className={task.is_active && canEdit ? "cursor-pointer hover:text-primary" : ""}
            onClick={() => task.is_active && canEdit && onEdit && onEdit(task)}
          >
            {task.title}
          </span>
          {task.is_active && canEdit && onEdit && (
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => onEdit(task)} title="Edit program">
              <Pencil className="w-3 h-3" />
            </Button>
          )}
        </div>
      </TableCell>
      <TableCell>
        <RaciStaffCell value={task.responsible} onValueChange={(v) => handleRaciChange("responsible", v)} tone="sky" canEdit={canEdit} />
      </TableCell>
      <TableCell>
        <RaciStaffCell value={task.accountable} onValueChange={(v) => handleRaciChange("accountable", v)} tone="violet" canEdit={canEdit} />
      </TableCell>
      <TableCell>
        <RaciStaffCell value={task.consulted} onValueChange={(v) => handleRaciChange("consulted", v)} tone="amber" canEdit={canEdit} />
      </TableCell>
      <TableCell>
        <RaciStaffCell value={task.informed} onValueChange={(v) => handleRaciChange("informed", v)} tone="slate" canEdit={canEdit} />
      </TableCell>
      <TableCell className="min-w-[110px]">
        {canEdit ? (
          <Input
            type="number"
            value={budgetValue}
            onChange={(e) => setBudgetValue(e.target.value)}
            onBlur={saveBudget}
            onKeyDown={(e) => e.key === "Enter" && saveBudget()}
            placeholder="$"
            className="h-8 text-xs rounded-lg w-24"
          />
        ) : (
          <span className="text-xs">{task.budget != null ? `$${Number(task.budget).toLocaleString()}` : "—"}</span>
        )}
      </TableCell>
      <TableCell className="min-w-[130px]">
        {canEdit ? (
          <Select value={task.payment_status || "not_paid"} onValueChange={(v) => update({ payment_status: v })} disabled={saving}>
            <SelectTrigger className="h-8 text-xs rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="not_paid">Not Paid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="na">N/A</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="outline" className={`text-[10px] ${PAYMENT_COLORS[task.payment_status] || PAYMENT_COLORS.not_paid}`}>
            {PAYMENT_LABELS[task.payment_status] || "Not Paid"}
          </Badge>
        )}
      </TableCell>
      <TableCell className="min-w-[140px]">
        {canEdit ? (
          <Select value={task.status} onValueChange={(v) => update({ status: v })} disabled={saving}>
            <SelectTrigger className="h-8 text-xs rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="not_started">Not Started</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[task.status]}`}>{task.status.replace("_", " ")}</Badge>
        )}
      </TableCell>
      <TableCell>
        {canEdit && task.status !== "completed" && (
          <Button size="sm" variant="outline" className="h-8 text-xs whitespace-nowrap" onClick={() => onMarkFulfilled(task)}>
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark Fulfilled
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}