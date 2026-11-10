import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, CheckCircle2, Circle, Calendar } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function TaskList({ programId }) {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assignee: "",
    due_date: "",
    completed: false,
  });
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", programId],
    queryFn: () => base44.entities.Task.filter({ program_id: programId }),
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const createTaskMutation = useMutation({
    mutationFn: (taskData) => base44.entities.Task.create(taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task created successfully");
      setFormData({ title: "", description: "", assignee: "", due_date: "", completed: false });
      setIsAdding(false);
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task updated");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createTaskMutation.mutate({
      ...formData,
      program_id: programId,
    });
  };

  const toggleComplete = (task) => {
    updateTaskMutation.mutate({
      id: task.id,
      data: { ...task, completed: !task.completed },
    });
  };

  return (
    <div className="space-y-4">
      {!isAdding && (
        <Button onClick={() => setIsAdding(true)} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Add Task
        </Button>
      )}

      {isAdding && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  placeholder="Enter description..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Assignee</Label>
                  <Select
                    value={formData.assignee}
                    onValueChange={(value) => setFormData({ ...formData, assignee: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.email} value={member.email}>
                          {member.full_name || member.email}
                        </SelectItem>
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

              <div className="flex gap-2">
                <Button type="submit" disabled={createTaskMutation.isPending}>
                  Create Task
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAdding(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800 mx-auto" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <Circle className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No tasks yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Card key={task.id}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() => toggleComplete(task)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <h4 className={`font-semibold ${task.completed ? "line-through text-slate-500" : "text-slate-900"}`}>
                      {task.title}
                    </h4>
                    {task.description && (
                      <p className="text-sm text-slate-600 mt-1">{task.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {task.assignee && (
                        <Badge variant="outline" className="text-xs">
                          {task.assignee}
                        </Badge>
                      )}
                      {task.due_date && (
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(task.due_date), "MMM d")}
                        </Badge>
                      )}
                      {task.completed && (
                        <Badge className="bg-green-100 text-green-700 text-xs">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Completed
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}