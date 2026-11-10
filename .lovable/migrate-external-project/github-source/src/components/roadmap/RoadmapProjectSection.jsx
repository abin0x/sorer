import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import RoadmapTaskRow from "./RoadmapTaskRow";

export default function RoadmapProjectSection({ project, tasks, canEdit, onChanged, onMarkFulfilled, onEditProject, onDeleteProject, onActivate, onEditTask }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const totalBudget = tasks.reduce((sum, t) => sum + (t.budget || 0), 0);
  const paidCount = tasks.filter((t) => t.payment_status === "paid").length;

  const toggleProjectActive = async (checked) => {
    await base44.entities.RoadmapProject.update(project.id, { is_active: checked });
    onChanged();
  };

  const handleDelete = async () => {
    if (confirmingDelete) {
      setDeleting(true);
      try {
        // Delete all tasks then the project
        for (const t of tasks) {
          await base44.entities.RoadmapTask.delete(t.id);
        }
        await base44.entities.RoadmapProject.delete(project.id);
        toast.success("Project deleted");
        setConfirmingDelete(false);
        if (onDeleteProject) onDeleteProject();
      } catch (e) {
        toast.error("Could not delete project: " + e.message);
      } finally {
        setDeleting(false);
      }
    } else {
      setConfirmingDelete(true);
    }
  };

  return (
    <Card className={`adisal-card ${!project.is_active ? "opacity-60" : ""}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
        <div>
          <CardTitle className="text-base">Project {project.number}: {project.title}</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {completedCount}/{tasks.length} tasks fulfilled · Budget ${totalBudget.toLocaleString()} · {paidCount} paid
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-[10px]">{project.is_active ? "Active" : "Inactive"}</Badge>
          {canEdit && (
            <>
              <Switch checked={project.is_active} onCheckedChange={toggleProjectActive} />
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => onEditProject(project)}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className={`h-8 px-2 text-xs ${confirmingDelete ? "text-red-600 hover:bg-red-50" : "text-muted-foreground"}`}
                onClick={handleDelete}
                disabled={deleting}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                {confirmingDelete ? (deleting ? "Deleting…" : "Confirm?") : ""}
              </Button>
              {confirmingDelete && (
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setConfirmingDelete(false)}>
                  Cancel
                </Button>
              )}
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Activate</TableHead>
              <TableHead className="text-xs">#</TableHead>
              <TableHead className="text-xs">Task</TableHead>
              <TableHead className="text-xs">Responsible</TableHead>
              <TableHead className="text-xs">Accountable</TableHead>
              <TableHead className="text-xs">Consulted</TableHead>
              <TableHead className="text-xs">Informed</TableHead>
              <TableHead className="text-xs">Budget</TableHead>
              <TableHead className="text-xs">Paid</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <RoadmapTaskRow key={task.id} task={task} canEdit={canEdit} onChanged={onChanged} onMarkFulfilled={onMarkFulfilled} onActivate={onActivate} onEdit={onEditTask} />
            ))}
            {tasks.length === 0 && (
              <TableRow>
                <td colSpan={11} className="text-center text-xs text-muted-foreground py-6">No tasks in this project.</td>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}