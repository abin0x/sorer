import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from '@/lib/router-compat';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DashboardHeader from "./shared/DashboardHeader";
import QuickActionsBar from "./shared/QuickActionsBar";
import DrillDownLinks from "./shared/DrillDownLinks";
import PriorityActions from "./shared/PriorityActions";
import ActionTimeline from "./shared/ActionTimeline";
import DashboardStatCard from "./DashboardStatCard";
import { PROJECT_MANAGER_WORKFLOW } from "./shared/roleWorkflows";
import { FolderKanban, ListChecks, Users, CalendarClock, ArrowRight, AlertCircle, ClipboardList, Plus, CheckCircle2, Send, Download } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function ProjectManagerDashboard({ user }) {
  const { data: programs = [] } = useQuery({
    queryKey: ["pm-programs"],
    queryFn: () => base44.entities.Program.list("-created_date", 200),
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ["pm-tasks"],
    queryFn: () => base44.entities.Task.list("-created_date", 200),
  });
  const { data: teams = [] } = useQuery({
    queryKey: ["pm-teams"],
    queryFn: () => base44.entities.Team.list("-created_date", 100),
  });

  const myEmail = user?.email;
  const myPrograms = programs.filter(
    (p) => p.assignee === myEmail || p.created_by_email === myEmail
  );
  const myProgramIds = myPrograms.map((p) => p.id);
  const myTasks = tasks.filter((t) => myProgramIds.includes(t.program_id));

  const inProgress = myPrograms.filter((p) => p.status === "in_progress");
  const todo = myPrograms.filter((p) => p.status === "todo");
  const overdue = myPrograms.filter((p) => {
    if (!p.due_date || p.status === "done") return false;
    return p.due_date < new Date().toISOString().split("T")[0];
  });
  const openTasks = myTasks.filter((t) => t.status !== "done");

  const timelineSteps = PROJECT_MANAGER_WORKFLOW.timelineSteps({ myPrograms, overdue, openTasks });
  const priorityActions = PROJECT_MANAGER_WORKFLOW.priorityActions({ overdue, openTasks, myPrograms });

  const quickActions = [
    { label: "Open Kanban", desc: "Manage tasks & approvals", icon: FolderKanban, to: createPageUrl("Kanban"), cardColor: "bg-blue-50 border-blue-200 text-blue-700", iconBg: "bg-blue-500", iconColor: "text-white" },
    { label: "Create Program", desc: "New project or task", icon: Plus, to: createPageUrl("ProgramsList"), cardColor: "bg-emerald-50 border-emerald-200 text-emerald-700", iconBg: "bg-emerald-500", iconColor: "text-white" },
    { label: "Timeline", desc: "View project timeline", icon: CalendarClock, to: createPageUrl("Timeline"), cardColor: "bg-amber-50 border-amber-200 text-amber-700", iconBg: "bg-amber-500", iconColor: "text-white" },
    { label: "Export Report", desc: "Download project data", icon: Download, to: createPageUrl("Analytics"), cardColor: "bg-violet-50 border-violet-200 text-violet-700", iconBg: "bg-violet-500", iconColor: "text-white" },
  ];

  const drillDowns = [
    { label: "Program Detail", description: "Registration, capacity, budget", to: createPageUrl("ProgramsList") },
    { label: "Task Detail", description: "Assignments, status, dependencies", to: createPageUrl("Kanban") },
    { label: "Timeline", description: "Project milestones and deadlines", to: createPageUrl("Timeline") },
    { label: "Analytics", description: "Reports and insights", to: createPageUrl("Analytics") },
  ];

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-[1400px] mx-auto bg-surface-page min-h-screen">
      <DashboardHeader
        roleLabel="Project Manager Dashboard"
        userName={user?.full_name}
        subtitle={`${myPrograms.length} programs · ${openTasks.length} open tasks${overdue.length > 0 ? ` · ${overdue.length} overdue` : ""}`}
        primaryQuestion="What needs my attention across my programs and tasks today?"
      />

      {/* Priority Actions — the hero widget */}
      <PriorityActions actions={priorityActions} />

      {/* Workflow Timeline */}
      <ActionTimeline steps={timelineSteps} title="Project Workflow" />

      {/* Quick Actions */}
      <QuickActionsBar actions={quickActions} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardStatCard icon={FolderKanban} label="My Programs" value={myPrograms.length} sublabel={`${inProgress.length} in progress`} tone="primary" to={createPageUrl("ProgramsList")} />
        <DashboardStatCard icon={ListChecks} label="Open Tasks" value={openTasks.length} sublabel={`${myTasks.length} total`} tone="sky" to={createPageUrl("Kanban")} />
        <DashboardStatCard icon={CalendarClock} label="To Do" value={todo.length} sublabel="Not started" tone="amber" to={createPageUrl("Kanban")} />
        <DashboardStatCard icon={AlertCircle} label="Overdue" value={overdue.length} sublabel="Needs attention" tone="violet" to={createPageUrl("ProgramsList")} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Programs */}
        <Card className="border-border-subtle shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-bold text-text-primary">My Programs</CardTitle>
            <Link to={createPageUrl("ProgramsList")} className="text-sm text-action font-medium hover:underline">View All</Link>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {myPrograms.length === 0 ? (
              <div className="py-8 text-center">
                <FolderKanban className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                <p className="text-sm text-text-secondary mb-3">No programs assigned yet</p>
                <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                  <Link to={createPageUrl("Kanban")}>Create a Program <ArrowRight className="w-3 h-3 ml-1" /></Link>
                </Button>
              </div>
            ) : (
              myPrograms.slice(0, 6).map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    p.status === "done" ? "bg-emerald-500" : p.status === "in_progress" ? "bg-blue-500" : p.status === "in_review" ? "bg-amber-500" : "bg-slate-300"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-text-primary truncate">{p.title}</p>
                    <p className="text-xs text-text-secondary truncate">
                      {p.category || "—"} · Due {p.due_date || "—"}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] capitalize shrink-0">{p.status?.replace("_", " ")}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Open Tasks */}
        <Card className="border-border-subtle shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-bold text-text-primary">Open Tasks</CardTitle>
            <Link to={createPageUrl("ProgramsList")} className="text-sm text-action font-medium hover:underline">View All</Link>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {openTasks.length === 0 ? (
              <p className="text-sm text-text-secondary py-8 text-center">No open tasks. All caught up!</p>
            ) : (
              openTasks.slice(0, 8).map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50">
                  <ClipboardList className="w-4 h-4 text-neutral-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-text-primary truncate">{t.title}</p>
                    <p className="text-xs text-text-secondary truncate">
                      {programs.find((p) => p.id === t.program_id)?.title || "—"}
                      {t.due_date && ` · Due ${t.due_date}`}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] capitalize shrink-0">{t.priority || "medium"}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {overdue.length > 0 && (
        <Card className="border-rose-200 bg-rose-50/50 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-text-primary text-sm">{overdue.length} Overdue Program{overdue.length > 1 ? "s" : ""}</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  {overdue.map((p) => (
                    <Badge key={p.id} variant="outline" className="bg-surface-card border-rose-300 text-rose-700 text-xs">
                      {p.title} · was due {p.due_date}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Drill-Down Views */}
      <DrillDownLinks items={drillDowns} />
    </div>
  );
}