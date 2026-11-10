import React, { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CreateTaskDialog({ open, onOpenChange, programs = [], teamMembers = [], onSave }) {
  const [formData, setFormData] = useState({
    program_id: "",
    title: "",
    description: "",
    assignee: "",
    due_date: "",
    category: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setFormData({ program_id: "", title: "", description: "", assignee: "", due_date: "", category: "" });
      setError("");
    }
  }, [open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.program_id) { setError("Please select a program."); return; }
    if (!formData.title) { setError("Task title is required."); return; }
    setError("");
    const payload = { ...formData };
    if (!payload.due_date) delete payload.due_date;
    if (!payload.category) delete payload.category;
    if (!payload.assignee) delete payload.assignee;
    onSave(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">Create New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Program *</Label>
            <Select value={formData.program_id} onValueChange={(v) => setFormData({ ...formData, program_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select a program..." /></SelectTrigger>
              <SelectContent>
                {programs.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Task Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter task title..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add task details..."
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select value={formData.assignee} onValueChange={(v) => setFormData({ ...formData, assignee: v })}>
                <SelectTrigger><SelectValue placeholder="Select assignee" /></SelectTrigger>
                <SelectContent>
                  {teamMembers.map((m) => (
                    <SelectItem key={m.id} value={m.email}>{m.full_name || m.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Create Task</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}