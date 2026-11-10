import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Map, Loader2, ShieldCheck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ROLES } from "@/lib/rbac";
import RoadmapProjectSection from "@/components/roadmap/RoadmapProjectSection";
import RoadmapProjectDialog from "@/components/roadmap/RoadmapProjectDialog";
import TaskCompletionDialog from "@/components/roadmap/TaskCompletionDialog";
import ProgramDialog from "@/components/kanban/ProgramDialog";

const EDIT_ROLES = [
  ROLES.MASTER_ADMIN,
  ROLES.ADMIN,
  ROLES.CLUB_DIRECTOR,
  ROLES.CLUB_ADMIN,
  ROLES.BRANCH_DIRECTOR,
  ROLES.PROJECT_MANAGER,
];

export default function Roadmap() {
  const queryClient = useQueryClient();
  const [fulfillingTask, setFulfillingTask] = useState(null);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [programDialog, setProgramDialog] = useState({
    open: false, program: null, initialData: null, task: null, mode: "create",
  });

  const { data: user } = useQuery({ queryKey: ["current-user-roadmap"], queryFn: () => base44.auth.me() });
  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ["roadmap-projects"],
    queryFn: () => base44.entities.RoadmapProject.list("order", 50),
  });
  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ["roadmap-tasks"],
    queryFn: () => base44.entities.RoadmapTask.list("order", 200),
  });
  const { data: programs = [] } = useQuery({
    queryKey: ["programs"],
    queryFn: () => base44.entities.Program.list("-created_date", 200),
  });

  const role = user?.custom_role || user?.role;
  const canEdit = EDIT_ROLES.includes(role);

  const tasksByProject = useMemo(() => {
    const map = {};
    for (const t of tasks) {
      map[t.project_id] = map[t.project_id] || [];
      map[t.project_id].push(t);
    }
    return map;
  }, [tasks]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["roadmap-tasks"] });
    queryClient.invalidateQueries({ queryKey: ["roadmap-projects"] });
    queryClient.invalidateQueries({ queryKey: ["programs"] });
  };

  const totalTasks = tasks.length;
  const totalCompleted = tasks.filter((t) => t.status === "completed").length;
  const totalActive = tasks.filter((t) => t.is_active).length;

  const openAddProject = () => { setEditingProject(null); setProjectDialogOpen(true); };
  const openEditProject = (project) => { setEditingProject(project); setProjectDialogOpen(true); };

  const closeProgramDialog = () =>
    setProgramDialog({ open: false, program: null, initialData: null, task: null, mode: "create" });

  const handleActivateClick = (task) => {
    const today = new Date().toISOString().split("T")[0];
    const due = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
    const initialData = {
      title: `${task.task_number} — ${task.title}`,
      description: task.title,
      suggested_start_date: today,
      due_date: due,
      status: "todo",
      priority: "medium",
      responsible: Array.isArray(task.responsible) ? task.responsible : [],
      accountable: Array.isArray(task.accountable) ? task.accountable : [],
      consulted: Array.isArray(task.consulted) ? task.consulted : [],
      informed: Array.isArray(task.informed) ? task.informed : [],
      budget: task.budget ?? "",
    };
    setProgramDialog({ open: true, program: null, initialData, task, mode: "create" });
  };

  const handleEditTask = (task) => {
    const program = programs.find((p) => p.id === task.kanban_program_id);
    if (!program) { toast.error("Linked program not found"); return; }
    setProgramDialog({ open: true, program, initialData: null, task, mode: "edit" });
  };

  const handleProgramSave = async (data) => {
    const task = programDialog.task;
    if (programDialog.mode === "create") {
      try {
        const me = await base44.auth.me().catch(() => null);
        const program = await base44.entities.Program.create({
          ...data,
          roadmap_task_id: task.id,
          roadmap_project_id: task.project_id,
          created_by_email: me?.email,
        });
        await base44.entities.RoadmapTask.update(task.id, {
          is_active: true,
          activated_by: me?.email,
          activated_date: new Date().toISOString(),
          kanban_program_id: program.id,
          responsible: data.responsible || [],
          accountable: data.accountable || [],
          consulted: data.consulted || [],
          informed: data.informed || [],
        });
        const project = projects.find((p) => p.id === task.project_id);
        if (project && !project.is_active) {
          await base44.entities.RoadmapProject.update(project.id, {
            is_active: true,
            activated_by: me?.email,
            activated_date: new Date().toISOString(),
          });
        }
        toast.success("Task activated and added to the Kanban board");
        closeProgramDialog();
        refresh();
      } catch (e) {
        toast.error("Could not activate task: " + e.message);
      }
    } else {
      try {
        await base44.entities.Program.update(programDialog.program.id, data);
        if (task) {
          await base44.entities.RoadmapTask.update(task.id, {
            responsible: data.responsible || [],
            accountable: data.accountable || [],
            consulted: data.consulted || [],
            informed: data.informed || [],
            budget: data.budget ?? null,
          });
        }
        toast.success("Program updated");
        closeProgramDialog();
        refresh();
      } catch (e) {
        toast.error("Could not save program: " + e.message);
      }
    }
  };

  const handleProgramDelete = async (id) => {
    const task = tasks.find((t) => t.kanban_program_id === id);
    try {
      await base44.entities.Program.delete(id);
      if (task) {
        await base44.entities.RoadmapTask.update(task.id, { is_active: false, kanban_program_id: "" });
      }
      toast.success("Program removed and task deactivated");
      closeProgramDialog();
      refresh();
    } catch (e) {
      toast.error("Could not delete program: " + e.message);
    }
  };

  if (loadingProjects || loadingTasks) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="glass-wellness rounded-3xl p-6 lg:p-8 soft-shadow-lg animate-fadeInUp">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Map className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Master Roadmap</h1>
              <p className="text-sm text-muted-foreground">
                {totalCompleted}/{totalTasks} tasks fulfilled · {totalActive} active on Kanban · Click Activate to assign RACI staff and push a task to the Kanban board.
                {!canEdit && " (View only — Admins and the Club Director can make changes.)"}
              </p>
            </div>
          </div>
          {canEdit && (
            <Button onClick={openAddProject} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="w-4 h-4 mr-1" /> Add Project
            </Button>
          )}
        </div>
        <div className="mt-4 flex items-start gap-3 p-4 rounded-2xl border border-violet-200 dark:border-violet-800 bg-violet-50/60 dark:bg-violet-900/20">
          <ShieldCheck className="w-5 h-5 text-violet-600 dark:text-violet-300 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold text-violet-900 dark:text-violet-200">Kanban Module — 4-Level RACI Access</p>
            <p className="text-violet-700/80 dark:text-violet-300/80 mt-0.5">
              Projects and tasks are <span className="font-medium">inactive by default</span>. Click <span className="font-medium">Activate</span> to open the program form, assign RACI staff (at least one Responsible and one Accountable), and the task is automatically added to the Kanban board. A project becomes active automatically when one of its tasks is activated.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {projects.map((project) => (
          <RoadmapProjectSection
            key={project.id}
            project={project}
            tasks={(tasksByProject[project.id] || []).sort((a, b) => (a.order || 0) - (b.order || 0))}
            canEdit={canEdit}
            onChanged={refresh}
            onMarkFulfilled={setFulfillingTask}
            onEditProject={openEditProject}
            onDeleteProject={refresh}
            onActivate={handleActivateClick}
            onEditTask={handleEditTask}
          />
        ))}
        {projects.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No roadmap projects yet. {canEdit && "Click \"Add Project\" to create one."}
          </div>
        )}
      </div>

      <RoadmapProjectDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        project={editingProject}
        onSaved={refresh}
      />

      <TaskCompletionDialog
        open={!!fulfillingTask}
        onOpenChange={(v) => !v && setFulfillingTask(null)}
        task={fulfillingTask}
        onCompleted={refresh}
      />

      <ProgramDialog
        open={programDialog.open}
        onOpenChange={(v) => !v && closeProgramDialog()}
        program={programDialog.program}
        initialData={programDialog.initialData}
        dialogTitle={programDialog.mode === "create" ? `Activate Task — ${programDialog.task?.task_number || ""}` : null}
        hideTemplate={programDialog.mode === "create"}
        saveLabel={programDialog.mode === "create" ? "Activate & Add to Kanban" : null}
        onSave={handleProgramSave}
        onDelete={handleProgramDelete}
        currentUser={user}
      />
    </div>
  );
}