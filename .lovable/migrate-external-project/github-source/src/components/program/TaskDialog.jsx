import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AssigneeSelect from "../shared/AssigneeSelect";
import StaffMultiSelect from "../shared/StaffMultiSelect";
import CategorySelect from "../shared/CategorySelect";
import { toast } from "sonner";

export default function TaskDialog({ open, onOpenChange, programId, onSave }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assignee: "",
    accountable: [],
    responsible: [],
    consulted: [],
    informed: [],
    due_date: "",
    completed: false,
    category: "",
    is_recurring: false,
    recurrence_pattern: "weekly",
    recurrence_end_date: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!programId) {
      toast.error("Invalid program");
      return;
    }

    if (!formData.title.trim()) {
      toast.error("Task title is required");
      return;
    }

    onSave({
      ...formData,
      program_id: programId,
    });

    // Reset form
    setFormData({
      title: "",
      description: "",
      assignee: "",
      accountable: [],
      responsible: [],
      consulted: [],
      informed: [],
      due_date: "",
      completed: false,
      category: "",
      is_recurring: false,
      recurrence_pattern: "weekly",
      recurrence_end_date: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="dark:text-white">Add New Task</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task_title" className="dark:text-slate-300">Task Title *</Label>
            <Input
              id="task_title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter task title..."
              required
              className="border-slate-300 dark:bg-slate-800 dark:border-slate-700"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task_description" className="dark:text-slate-300">Description</Label>
            <Textarea
              id="task_description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter task description..."
              rows={3}
              className="border-slate-300 dark:bg-slate-800 dark:border-slate-700 resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label className="dark:text-slate-300">Category</Label>
            <CategorySelect
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
              placeholder="Select category"
            />
          </div>

          <div className="space-y-2">
            <Label className="dark:text-slate-300">Assigned Staff</Label>
            <AssigneeSelect
              value={formData.assignee}
              onValueChange={(value) => setFormData({ ...formData, assignee: value })}
              placeholder="Select assignee"
            />
          </div>

          {/* RACI Assignments — 4 levels of access/responsibility */}
          <div className="space-y-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40">
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">RACI Assignments</p>
              <p className="text-xs text-muted-foreground">Four levels of access & responsibility for this task.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-violet-700 dark:text-violet-300">A — Accountable</Label>
                <StaffMultiSelect value={formData.accountable} onValueChange={(v) => setFormData({ ...formData, accountable: v })} placeholder="Accountable…" tone="violet" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-sky-700 dark:text-sky-300">R — Responsible</Label>
                <StaffMultiSelect value={formData.responsible} onValueChange={(v) => setFormData({ ...formData, responsible: v })} placeholder="Responsible…" tone="sky" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-amber-700 dark:text-amber-300">C — Consulted</Label>
                <StaffMultiSelect value={formData.consulted} onValueChange={(v) => setFormData({ ...formData, consulted: v })} placeholder="Consulted…" tone="amber" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">I — Informed</Label>
                <StaffMultiSelect value={formData.informed} onValueChange={(v) => setFormData({ ...formData, informed: v })} placeholder="Informed…" tone="slate" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="task_due_date" className="dark:text-slate-300">Due Date</Label>
            <Input
              id="task_due_date"
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="border-slate-300 dark:bg-slate-800 dark:border-slate-700"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="task_completed"
              checked={formData.completed}
              onCheckedChange={(checked) => setFormData({ ...formData, completed: checked })}
            />
            <Label htmlFor="task_completed" className="cursor-pointer dark:text-slate-300">
              Mark as completed
            </Label>
          </div>

          <div className="space-y-3 border-t dark:border-slate-700 pt-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="is_recurring" className="dark:text-slate-300">Recurring Task</Label>
              <Switch
                id="is_recurring"
                checked={formData.is_recurring}
                onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked })}
              />
            </div>

            {formData.is_recurring && (
              <div className="space-y-3 pl-4 border-l-2 border-emerald-600">
                <div className="space-y-2">
                  <Label className="dark:text-slate-300">Recurrence Pattern</Label>
                  <Select
                    value={formData.recurrence_pattern}
                    onValueChange={(value) => setFormData({ ...formData, recurrence_pattern: value })}
                  >
                    <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recurrence_end_date" className="dark:text-slate-300">
                    End Date (Optional)
                  </Label>
                  <Input
                    id="recurrence_end_date"
                    type="date"
                    value={formData.recurrence_end_date}
                    onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                    className="border-slate-300 dark:bg-slate-800 dark:border-slate-700"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="hover:scale-105 transition-transform">
              Cancel
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-lg hover:scale-105 transition-all">
              Add Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}