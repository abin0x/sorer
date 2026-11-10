import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Network, Plus, X, Zap, GitBranch } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter } from
"@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const DEPENDENCY_TYPES = [
{ value: "finish_to_start", label: "Finish-to-Start", icon: "→", description: "Task B starts when Task A finishes" },
{ value: "start_to_start", label: "Start-to-Start", icon: "⇉", description: "Both tasks start together" },
{ value: "finish_to_finish", label: "Finish-to-Finish", icon: "⇶", description: "Both tasks finish together" },
{ value: "start_to_finish", label: "Start-to-Finish", icon: "↺", description: "Task B finishes when Task A starts" }];


export default function DependencyEditor({ task, programId, onUpdate }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDependency, setSelectedDependency] = useState("");
  const [dependencyType, setDependencyType] = useState("finish_to_start");
  const queryClient = useQueryClient();

  const { data: allTasks = [] } = useQuery({
    queryKey: ["tasks", programId],
    queryFn: () => base44.entities.Task.filter({ program_id: programId }),
    enabled: !!programId
  });

  const { data: allSubtasks = [] } = useQuery({
    queryKey: ["subtasks", programId],
    queryFn: () => base44.entities.Subtask.filter({ program_id: programId }),
    enabled: !!programId
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data, isSubtask }) => {
      return isSubtask ?
      base44.entities.Subtask.update(id, data) :
      base44.entities.Task.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["subtasks"] });
      if (onUpdate) onUpdate();
      toast.success("Dependencies updated");
    }
  });

  const isSubtask = !allTasks.some((t) => t.id === task?.id);
  const currentDependencies = task?.dependencies || [];

  // Get available items (exclude self and items that would create circular dependencies)
  const availableItems = [...allTasks, ...allSubtasks].filter((item) => {
    if (item.id === task?.id) return false;
    // Simple circular dependency check
    if (item.dependencies?.includes(task?.id)) return false;
    return true;
  });

  const handleAddDependency = () => {
    if (!selectedDependency) return;

    const newDependencies = [...currentDependencies];
    if (!newDependencies.includes(selectedDependency)) {
      newDependencies.push(selectedDependency);
    }

    updateMutation.mutate({
      id: task.id,
      data: { ...task, dependencies: newDependencies },
      isSubtask
    });

    setSelectedDependency("");
    setDialogOpen(false);
  };

  const handleRemoveDependency = (depId) => {
    const newDependencies = currentDependencies.filter((id) => id !== depId);
    updateMutation.mutate({
      id: task.id,
      data: { ...task, dependencies: newDependencies },
      isSubtask
    });
  };

  const getDependencyItem = (depId) => {
    return allTasks.find((t) => t.id === depId) || allSubtasks.find((s) => s.id === depId);
  };

  return (
    <Card className="dark:bg-slate-800 dark:border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base dark:text-white">
          <span className="flex items-center gap-2">
            <Network className="w-4 h-4" />
            Dependencies ({currentDependencies.length})
          </span>
          <Button
            size="sm"
            onClick={() => setDialogOpen(true)}
            variant="outline" className="bg-slate-800 px-3 text-xs font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input shadow-sm hover:bg-accent hover:text-accent-foreground h-8 dark:border-slate-600">


            <Plus className="w-3 h-3 mr-1" />
            Add
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {currentDependencies.length === 0 ?
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
            No dependencies defined
          </p> :

        currentDependencies.map((depId) => {
          const depItem = getDependencyItem(depId);
          if (!depItem) return null;

          const isComplete = depItem.completed || depItem.status === 'done';

          return (
            <div
              key={depId}
              className="flex items-center justify-between p-2 rounded-lg border dark:border-slate-700 bg-slate-50 dark:bg-slate-900">

                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isComplete ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-sm dark:text-white">{depItem.title}</span>
                  <Badge variant="outline" className="text-xs">
                    {allTasks.some((t) => t.id === depId) ? "Task" : "Subtask"}
                  </Badge>
                </div>
                <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRemoveDependency(depId)}>

                  <X className="w-3 h-3" />
                </Button>
              </div>);

        })
        }
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Add Dependency</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="dark:text-slate-300">Dependency Type</Label>
              <Select value={dependencyType} onValueChange={setDependencyType}>
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEPENDENCY_TYPES.map((type) =>
                  <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <span>{type.icon}</span>
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {DEPENDENCY_TYPES.find((t) => t.value === dependencyType)?.description}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="dark:text-slate-300">Depends On</Label>
              <Select value={selectedDependency} onValueChange={setSelectedDependency}>
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                  <SelectValue placeholder="Select task or subtask..." />
                </SelectTrigger>
                <SelectContent>
                  {availableItems.map((item) => {
                    const isTask = allTasks.some((t) => t.id === item.id);
                    return (
                      <SelectItem key={item.id} value={item.id}>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {isTask ? "Task" : "Subtask"}
                          </Badge>
                          <span>{item.title}</span>
                        </div>
                      </SelectItem>);

                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddDependency}
              disabled={!selectedDependency}
              className="bg-blue-600 hover:bg-blue-700">

              Add Dependency
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>);

}