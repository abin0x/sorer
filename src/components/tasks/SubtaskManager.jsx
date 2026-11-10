import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Check, Clock, AlertCircle, Trash2, ChevronDown, ChevronRight, ListChecks, Repeat } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { toast } from "sonner";
import CategorySelect from "../shared/CategorySelect";
import AssigneeSelect from "../shared/AssigneeSelect";
import { Label } from "@/components/ui/label";

export default function SubtaskManager({ task, programId }) {
  const [showForm, setShowForm] = useState(false);
  const [expandedSubtasks, setExpandedSubtasks] = useState(new Set());
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    assignee: "",
    priority: "medium",
    due_date: "",
    estimated_hours: "",
    is_recurring: false,
    recurrence_pattern: "weekly",
    recurrence_end_date: ""
  });

  const queryClient = useQueryClient();

  const { data: subtasks = [] } = useQuery({
    queryKey: ["subtasks", task.id],
    queryFn: () => base44.entities.Subtask.filter({ task_id: task.id }),
    enabled: !!task?.id
  });

  const createSubtaskMutation = useMutation({
    mutationFn: (data) => base44.entities.Subtask.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subtasks", task.id] });
      toast.success("Subtask created");
      setFormData({ 
        title: "", 
        description: "", 
        category: "", 
        assignee: "", 
        priority: "medium", 
        due_date: "", 
        estimated_hours: "",
        is_recurring: false,
        recurrence_pattern: "weekly",
        recurrence_end_date: ""
      });
      setShowForm(false);
    }
  });

  const updateSubtaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Subtask.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subtasks", task.id] });
      toast.success("Subtask updated");
    }
  });

  const deleteSubtaskMutation = useMutation({
    mutationFn: (id) => base44.entities.Subtask.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subtasks", task.id] });
      toast.success("Subtask deleted");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Please enter a subtask title");
      return;
    }

    createSubtaskMutation.mutate({
      ...formData,
      task_id: task.id,
      program_id: programId,
      status: "todo",
      completed: false,
      estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null
    });
  };

  const toggleSubtaskStatus = (subtask) => {
    const newStatus = subtask.status === "done" ? "todo" : "done";
    updateSubtaskMutation.mutate({
      id: subtask.id,
      data: { ...subtask, status: newStatus, completed: newStatus === "done" }
    });
  };

  const priorityConfig = {
    low: { color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300", label: "Low" },
    medium: { color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300", label: "Medium" },
    high: { color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300", label: "High" }
  };

  const statusConfig = {
    todo: { icon: Clock, color: "text-slate-400" },
    in_progress: { icon: AlertCircle, color: "text-blue-500" },
    done: { icon: Check, color: "text-green-500" }
  };

  // const completedCount = subtasks.filter(st => st.completed).length; // Not used in new header
  // const totalEstimated = subtasks.reduce((sum, st) => sum + (st.estimated_hours || 0), 0); // Not used in new header
  // const totalActual = subtasks.reduce((sum, st) => sum + (st.actual_hours || 0), 0); // Not used in new header

  return (
    <Card className="dark:bg-slate-800 dark:border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base dark:text-white">
          <span className="flex items-center gap-2">
            <ListChecks className="w-4 h-4" />
            Subtasks ({subtasks.length})
          </span>
          <Button
            size="sm"
            onClick={() => setShowForm(!showForm)}
            variant="outline" className="bg-slate-700 px-3 text-xs font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input shadow-sm hover:bg-accent hover:text-accent-foreground h-8 dark:border-slate-600">


            <Plus className="w-3 h-3 mr-1" />
            Add Subtask
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm &&
        <form onSubmit={handleSubmit} className="space-y-3 p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900">
            <Input
            placeholder="Subtask title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            className="dark:bg-slate-800 dark:border-slate-700" />

            <Textarea
            placeholder="Description (optional)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
            className="dark:bg-slate-800 dark:border-slate-700" />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs dark:text-slate-300">Category</Label>
                <CategorySelect
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
                placeholder="Select category" />

              </div>
              <div className="space-y-2">
                <Label className="text-xs dark:text-slate-300">Assignee</Label>
                <AssigneeSelect
                value={formData.assignee}
                onValueChange={(value) => setFormData({ ...formData, assignee: value })}
                placeholder="Select assignee" />

              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Select
              value={formData.priority}
              onValueChange={(value) => setFormData({ ...formData, priority: value })}>

                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
              <Input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="dark:bg-slate-800 dark:border-slate-700" />

              <Input
              type="number"
              step="0.5"
              placeholder="Est. hours"
              value={formData.estimated_hours}
              onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
              className="dark:bg-slate-800 dark:border-slate-700" />

            </div>

            <div className="space-y-3 border-t dark:border-slate-700 pt-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="subtask_recurring" className="text-xs dark:text-slate-300">Recurring Subtask</Label>
                <Switch
                  id="subtask_recurring"
                  checked={formData.is_recurring}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked })}
                />
              </div>

              {formData.is_recurring && (
                <div className="space-y-2 pl-3 border-l-2 border-emerald-600">
                  <Select
                    value={formData.recurrence_pattern}
                    onValueChange={(value) => setFormData({ ...formData, recurrence_pattern: value })}
                  >
                    <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    placeholder="End date (optional)"
                    value={formData.recurrence_end_date}
                    onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                    className="dark:bg-slate-800 dark:border-slate-700 h-8 text-xs"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                Add Subtask
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        }

        {subtasks.length === 0 ?
        <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
            No subtasks yet. Click "Add Subtask" to create one.
          </div> :

        <div className="space-y-2">
            {subtasks.map((subtask) => {
            const StatusIcon = statusConfig[subtask.status].icon;
            const isExpanded = expandedSubtasks.has(subtask.id);

            return (
              <Card key={subtask.id} className="p-3 dark:bg-slate-900 dark:border-slate-700">
                  <div className="flex items-start gap-3">
                    <button
                    onClick={() => toggleSubtaskStatus(subtask)}
                    className={`mt-1 flex-shrink-0 ${statusConfig[subtask.status].color}`}>

                      <StatusIcon className="w-5 h-5" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className={`font-medium dark:text-white ${subtask.completed ? "line-through text-slate-500" : ""}`}>
                            {subtask.title}
                          </h4>
                          {subtask.description && !isExpanded &&
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-1">
                              {subtask.description}
                            </p>
                        }
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setExpandedSubtasks((prev) => {
                              const newSet = new Set(prev);
                              if (newSet.has(subtask.id)) {
                                newSet.delete(subtask.id);
                              } else {
                                newSet.add(subtask.id);
                              }
                              return newSet;
                            });
                          }}>

                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </Button>
                          <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteSubtaskMutation.mutate(subtask.id)}>

                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mt-2">
                        {subtask.is_recurring && (
                          <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" variant="outline">
                            <Repeat className="w-3 h-3 mr-1" />
                            {subtask.recurrence_pattern}
                          </Badge>
                        )}
                        <Badge className={priorityConfig[subtask.priority].color} variant="outline">
                          {priorityConfig[subtask.priority].label}
                        </Badge>
                        {subtask.category &&
                      <Badge variant="outline" className="dark:border-slate-600 text-xs">
                            {subtask.category}
                          </Badge>
                      }
                        {subtask.assignee &&
                      <Badge variant="outline" className="dark:border-slate-600 text-xs">
                            {subtask.assignee}
                          </Badge>
                      }
                        {subtask.due_date &&
                      <Badge variant="outline" className="dark:border-slate-600 text-xs">
                            Due: {format(new Date(subtask.due_date), "MMM d")}
                          </Badge>
                      }
                        {subtask.estimated_hours &&
                      <Badge variant="outline" className="dark:border-slate-600 text-xs">
                            {subtask.estimated_hours}h est.
                          </Badge>
                      }
                      </div>

                      {isExpanded &&
                    <div className="mt-3 pt-3 border-t dark:border-slate-700 space-y-2">
                          {subtask.description &&
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                              {subtask.description}
                            </p>
                      }
                          <div className="flex gap-2">
                            <Select
                          value={subtask.status}
                          onValueChange={(value) => updateSubtaskMutation.mutate({
                            id: subtask.id,
                            data: { ...subtask, status: value, completed: value === "done" }
                          })}>

                              <SelectTrigger className="w-32 dark:bg-slate-800 dark:border-slate-700">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="todo">To Do</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="done">Done</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                          type="number"
                          placeholder="Actual hours"
                          value={subtask.actual_hours || ""}
                          onChange={(e) => updateSubtaskMutation.mutate({
                            id: subtask.id,
                            data: { ...subtask, actual_hours: parseFloat(e.target.value) || null }
                          })}
                          className="w-32 dark:bg-slate-800 dark:border-slate-700" />

                          </div>
                        </div>
                    }
                    </div>
                  </div>
                </Card>);

          })}
          </div>
        }
      </CardContent>
    </Card>);

}