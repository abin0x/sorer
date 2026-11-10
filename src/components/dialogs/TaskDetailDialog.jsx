
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarIcon, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import EmailReminderButton from "../shared/EmailReminderButton";
import DependencyEditor from "../dependencies/DependencyEditor";
import SubtaskManager from "../tasks/SubtaskManager";

export default function TaskDetailDialog({ open, onOpenChange, task, onSave, onDelete }) {
  const [formData, setFormData] = useState({
    title: task?.title || "",
    description: task?.description || "",
    assignee: task?.assignee || "",
    completed: task?.completed || false,
    due_date: task?.due_date || "",
  });

  const queryClient = useQueryClient();

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.entities.User.me(),
    enabled: !!open,
  });

  const updateTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.update(task.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", task.program_id] });
      toast.success("Task updated successfully");
      onSave?.();
      onOpenChange(false);
    },
  });

  // The internal deleteTaskMutation and handleDelete are removed as deletion is now handled via the onDelete prop
  // If the onDelete prop is provided, the parent component takes responsibility for the deletion action.

  React.useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || "",
        description: task.description || "",
        assignee: task.assignee || "",
        completed: task.completed || false,
        due_date: task.due_date || "",
      });
    }
  }, [task]);

  const handleSave = () => {
    if (task?.id) {
      updateTaskMutation.mutate(formData);
    } else if (onSave) {
      // If no task ID, it's a new task, call onSave prop to create it
      onSave(formData);
      onOpenChange(false);
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center justify-between">
            <span>Task Details</span>
            <div className="flex items-center gap-2">
              <Badge className={task.completed ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"}>
                {task.completed ? "✓ Completed" : "○ Pending"}
              </Badge>
              {currentUser && (
                <EmailReminderButton
                  item={task}
                  type="task"
                  currentUser={currentUser}
                  size="sm"
                />
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-140px)]">
          <div className="space-y-6 pr-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="dark:bg-slate-800 dark:border-slate-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="dark:bg-slate-800 dark:border-slate-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignee">Assignee</Label>
              <Select
                value={formData.assignee}
                onValueChange={(value) => setFormData({ ...formData, assignee: value })}
              >
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Unassigned</SelectItem>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.email}>
                      {member.full_name || member.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start dark:bg-slate-800 dark:border-slate-700">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.due_date ? format(new Date(formData.due_date), 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.due_date ? new Date(formData.due_date) : undefined}
                    onSelect={(date) => setFormData({ ...formData, due_date: date?.toISOString() })}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="completed">Mark as completed</Label>
              <Switch
                id="completed"
                checked={formData.completed}
                onCheckedChange={(checked) => setFormData({ ...formData, completed: checked })}
              />
            </div>

            {/* Dependencies */}
            <DependencyEditor
              task={formData}
              programId={task.program_id}
              onUpdate={() => {}}
            />

            {/* Subtasks */}
            <SubtaskManager task={task} programId={task.program_id} />

            <div className="pt-4 border-t dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
              <p>Created: {new Date(task.created_date).toLocaleString()}</p>
              {task.created_by && <p>Created by: {task.created_by}</p>}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-300 dark:border-slate-600"
          >
            Cancel
          </Button>
          {onDelete && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (confirm("Are you sure you want to delete this task?")) {
                  onDelete(task.id);
                  onOpenChange(false);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Task
            </Button>
          )}
          <Button
            type="button"
            onClick={handleSave}
            disabled={updateTaskMutation.isPending}
            className="bg-emerald-700 hover:bg-emerald-800 text-white"
          >
            {updateTaskMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
