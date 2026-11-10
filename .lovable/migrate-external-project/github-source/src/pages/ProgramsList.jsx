import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Calendar, LayoutDashboard, ListTodo, ListChecks, Plus } from "lucide-react";
import ProgramFullDetailsDialog from "../components/program/ProgramFullDetailsDialogNew";
import ProgramDialog from "../components/kanban/ProgramDialog";
import ProgramCardEnhanced from "../components/kanban/ProgramCardEnhanced";
import TaskDetailDialog from "../components/dialogs/TaskDetailDialog";
import CreateTaskDialog from "../components/program/CreateTaskDialog";
import EntityDataTable from "@/components/shared/EntityDataTable";
import DataToolbar from "@/components/shared/DataToolbar";
import { isPast, isToday } from "date-fns";
import { toast } from "sonner";

const programCsvFields = [
  { key: "unique_id", label: "Unique ID" },
  { key: "title", label: "Title" },
  { key: "description", label: "Description" },
  { key: "status", label: "Status" },
  { key: "priority", label: "Priority" },
  { key: "season", label: "Season" },
  { key: "branches", label: "Branches", isArray: true },
  { key: "assignee", label: "Assignee" },
  { key: "due_date", label: "Due Date" },
  { key: "suggested_start_date", label: "Start Date" },
  { key: "budget", label: "Budget", type: "number" },
  { key: "category", label: "Category" },
  { key: "age_eligibility", label: "Age Eligibility" },
  { key: "gender_eligibility", label: "Gender Eligibility" },
  { key: "field_location", label: "Field Location" },
  { key: "program_dates", label: "Program Dates" },
  { key: "program_time", label: "Program Time" },
  { key: "workstream", label: "Workstream" },
  { key: "year", label: "Year" },
];

const taskCsvFields = [
  { key: "unique_id", label: "Unique ID" },
  { key: "title", label: "Title" },
  { key: "description", label: "Description" },
  { key: "category", label: "Category" },
  { key: "assignee", label: "Assignee" },
  { key: "completed", label: "Completed", type: "boolean" },
  { key: "due_date", label: "Due Date" },
  { key: "program_id", label: "Program ID" },
];

const statusBadgeMap = {
  todo: { label: "To Do", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  in_review: { label: "In Review", color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
  done: { label: "Done", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
};

const priorityBadgeMap = {
  low: { label: "Low", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  medium: { label: "Medium", color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
  high: { label: "High", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
};

const programTableColumns = [
  { key: "title", label: "Title", type: "text", editable: true, sortable: true },
  {
    key: "status", label: "Status", type: "select", editable: true, sortable: true,
    options: [
      { value: "todo", label: "To Do" },
      { value: "in_progress", label: "In Progress" },
      { value: "in_review", label: "In Review" },
      { value: "done", label: "Done" },
    ],
    badgeMap: statusBadgeMap,
  },
  {
    key: "priority", label: "Priority", type: "select", editable: true, sortable: true,
    options: [
      { value: "low", label: "Low" },
      { value: "medium", label: "Medium" },
      { value: "high", label: "High" },
    ],
    badgeMap: priorityBadgeMap,
  },
  {
    key: "season", label: "Season", type: "select", editable: true, sortable: true,
    options: ["Summer", "Fall", "Winter 1", "Winter 2", "Spring"].map((s) => ({ value: s, label: s })),
  },
  { key: "assignee", label: "Assignee", type: "text", editable: true, sortable: true },
  {
    key: "due_date", label: "Due Date", type: "date", editable: true, sortable: true,
    render: (v) => v ? new Date(v).toLocaleDateString() : "—",
  },
  {
    key: "budget", label: "Budget", type: "text", editable: true, sortable: true,
    render: (v) => v != null ? `$${Number(v).toLocaleString()}` : "—",
  },
];

const taskTableColumns = [
  { key: "title", label: "Title", type: "text", editable: true, sortable: true },
  { key: "category", label: "Category", type: "text", editable: true, sortable: true },
  { key: "assignee", label: "Assignee", type: "text", editable: true, sortable: true },
  {
    key: "completed", label: "Completed", type: "select", editable: true, sortable: true,
    options: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }],
  },
  {
    key: "due_date", label: "Due Date", type: "date", editable: true, sortable: true,
    render: (v) => v ? new Date(v).toLocaleDateString() : "—",
  },
];

export default function ProgramsList() {
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [programDialogOpen, setProgramDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState("cards");
  const [showOverdue, setShowOverdue] = useState(false);
  const [createProgramOpen, setCreateProgramOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  
  const queryClient = useQueryClient();

  useEffect(() => {
    const status = searchParams.get("status");
    const assignee = searchParams.get("assignee");
    const overdue = searchParams.get("overdue");
    
    if (status) setStatusFilter(status);
    if (assignee) setAssigneeFilter(assignee);
    if (overdue === "true") setShowOverdue(true);
  }, [searchParams]);

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me()
  });

  const { data: programs = [] } = useQuery({
    queryKey: ["programs"],
    queryFn: () => base44.entities.Program.list("-created_date")
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => base44.entities.Task.list("-created_date")
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list()
  });

  const updateProgramMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Program.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success("Program updated successfully");
      setEditDialogOpen(false);
    },
    onError: (error) => {
      console.error("Failed to update program:", error);
      toast.error("Failed to update program");
    }
  });

  const deleteProgramMutation = useMutation({
    mutationFn: (id) => base44.entities.Program.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success("Program deleted successfully");
      setEditDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Failed to delete program: " + (error?.message || "Unknown error"));
    },
  });

  const createProgramMutation = useMutation({
    mutationFn: (programData) => base44.entities.Program.create({ ...programData, created_by_email: currentUser?.email }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success("Program created successfully");
      setCreateProgramOpen(false);
    },
    onError: (error) => {
      console.error("Failed to create program:", error);
      toast.error("Failed to create program: " + (error?.message || "Unknown error"));
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (taskData) => base44.entities.Task.create(taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task created successfully");
      setCreateTaskOpen(false);
    },
    onError: (error) => {
      console.error("Failed to create task:", error);
      toast.error("Failed to create task: " + (error?.message || "Unknown error"));
    },
  });

  const handleCreateProgram = (programData) => {
    createProgramMutation.mutate(programData);
  };

  const handleSaveProgram = (programData) => {
    if (selectedProgram) {
      updateProgramMutation.mutate({
        id: selectedProgram.id,
        data: programData,
      });
    }
  };

  const handleDeleteProgram = (id) => {
    deleteProgramMutation.mutate(id);
  };

  // Check if Branch Director has no branch assigned
  if (currentUser?.custom_role === "branch_director" && !currentUser.branch) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <Card className="max-w-md dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6 text-center">
            <ListChecks className="w-12 h-12 text-amber-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Branch Assigned</h2>
            <p className="text-slate-600 dark:text-slate-400">
              You need to be assigned to a branch to access programs and tasks. Please contact your administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredPrograms = programs.filter((program) => {
    // Role-based filtering
    if (currentUser?.custom_role === "staff") {
      const isAssigned = program.assignee === currentUser.email;
      const isCreator = program.created_by_email === currentUser.email;
      if (!isAssigned && !isCreator) return false;
    } else if (currentUser?.custom_role === "branch_director") {
      // If the branch director has a branch assigned, filter by it.
      // The "no branch assigned" case is handled by the early return above.
      if (!program.branch || program.branch !== currentUser.branch) return false;
    }

    const matchesSearch = program.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    program.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || program.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || program.priority === priorityFilter;
    const matchesBranch = branchFilter === "all" || program.branch === branchFilter;
    const matchesAssignee = assigneeFilter === "all" || program.assignee === assigneeFilter;
    
    let matchesOverdue = true;
    if (showOverdue) {
      const dueDate = program.due_date ? new Date(program.due_date) : null;
      matchesOverdue = dueDate && isPast(dueDate) && !isToday(dueDate) && program.status !== 'done';
    }

    return matchesSearch && matchesStatus && matchesPriority && matchesBranch && matchesAssignee && matchesOverdue;
  });

  const filteredTasks = tasks.filter((task) => {
    // Filter tasks based on program access and user role
    const taskProgram = programs.find(p => p.id === task.program_id);
    if (!taskProgram) return false; // Task must belong to an existing program

    // Apply same role-based filtering as programs
    if (currentUser?.custom_role === "staff") {
      const isProgramAssigned = taskProgram.assignee === currentUser.email || taskProgram.created_by_email === currentUser.email;
      const isTaskAssigned = task.assignee === currentUser.email;
      if (!isProgramAssigned && !isTaskAssigned) return false;
    } else if (currentUser?.custom_role === "branch_director") {
      if (!taskProgram.branch || taskProgram.branch !== currentUser.branch) return false;
    }

    const matchesSearch = task.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAssignee = assigneeFilter === "all" || task.assignee === assigneeFilter;

    return matchesSearch && matchesAssignee;
  });

  const branches = [...new Set(programs.map((p) => p.branch).filter(Boolean))];

  const statusConfig = {
    todo: { label: "To Do", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
    in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
    in_review: { label: "In Review", color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
    done: { label: "Done", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" }
  };

  const priorityConfig = {
    low: { label: "Low", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
    medium: { label: "Medium", color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
    high: { label: "High", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs font-bold tracking-wider uppercase text-primary mb-1.5">Kanban</div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Programs & Tasks</h1>
            <p className="text-muted-foreground mt-1.5">Browse and search all programs and tasks</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={() => { setSelectedProgram(null); setCreateProgramOpen(true); }} className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-1" /> Create Program
            </Button>
            <Button onClick={() => setCreateTaskOpen(true)} variant="outline" className="border-border">
              <Plus className="w-4 h-4 mr-1" /> Create Task
            </Button>
            <DataToolbar
              entityName="Program"
              records={filteredPrograms}
              csvFields={programCsvFields}
              queryKey={["programs"]}
              viewMode={viewMode}
              setViewMode={setViewMode}
              importTitle="Import Programs from CSV"
              sampleRecords={filteredPrograms.slice(0, 1)}
            />
          </div>
        </div>

        {/* Filters */}
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 dark:bg-slate-800 dark:border-slate-700"
                  />
                </div>
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>

              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                  <SelectValue placeholder="Branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map((branch) => (
                    <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                  <SelectValue placeholder="Program Lead" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Leads</SelectItem>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.email}>
                      {member.full_name || member.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="programs" className="space-y-4">
          <TabsList className="dark:bg-slate-900">
            <TabsTrigger value="programs">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Programs ({filteredPrograms.length})
            </TabsTrigger>
            <TabsTrigger value="tasks">
              <ListTodo className="w-4 h-4 mr-2" />
              Tasks ({filteredTasks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="programs">
            {viewMode === "table" ? (
              <EntityDataTable
                entityName="Program"
                records={filteredPrograms}
                columns={programTableColumns}
                queryKey={["programs"]}
                onRowClick={(p) => { setSelectedProgram(p); setProgramDialogOpen(true); }}
                emptyIcon={LayoutDashboard}
                emptyMessage="No programs found"
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPrograms.map((program) => (
                  <ProgramCardEnhanced
                    key={program.id}
                    program={program}
                    onClick={(p, action) => {
                      setSelectedProgram(action ? { ...p, _openTab: action } : p);
                      setProgramDialogOpen(true);
                    }}
                    currentUser={currentUser}
                    teamMembers={teamMembers}
                  />
                ))}

                {filteredPrograms.length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <LayoutDashboard className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-700" />
                    <p className="text-slate-500 dark:text-slate-400">No programs found</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="tasks">
            <div className="mb-4">
              <DataToolbar
                entityName="Task"
                records={filteredTasks}
                csvFields={taskCsvFields}
                queryKey={["tasks"]}
                viewMode={viewMode}
                setViewMode={setViewMode}
                showViewToggle={false}
                importTitle="Import Tasks from CSV"
                sampleRecords={filteredTasks.slice(0, 1)}
              />
            </div>
            {viewMode === "table" ? (
              <EntityDataTable
                entityName="Task"
                records={filteredTasks}
                columns={taskTableColumns}
                queryKey={["tasks"]}
                onRowClick={(t) => { setSelectedTask(t); setTaskDialogOpen(true); }}
                emptyIcon={ListTodo}
                emptyMessage="No tasks found"
              />
            ) : (
              <div className="space-y-3">
                {filteredTasks.map((task) => {
                  const program = programs.find((p) => p.id === task.program_id);
                  return (
                    <Card
                      key={task.id}
                      className="cursor-pointer hover:shadow-lg transition-shadow dark:bg-slate-900 dark:border-slate-800"
                      onClick={() => {
                        setSelectedTask(task);
                        setTaskDialogOpen(true);
                      }}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                              {task.title}
                            </h3>
                            {task.description && (
                              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                                {task.description}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-2">
                              <Badge className={task.completed ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"}>
                                {task.completed ? "✓ Completed" : "○ Pending"}
                              </Badge>
                              {program && (
                                <Badge variant="outline" className="dark:border-slate-700">
                                  {program.title}
                                </Badge>
                              )}
                              {task.assignee && (
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  Assigned to: {task.assignee}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {filteredTasks.length === 0 && (
                  <div className="text-center py-12">
                    <ListTodo className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-700" />
                    <p className="text-slate-500 dark:text-slate-400">No tasks found</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <ProgramFullDetailsDialog
        open={programDialogOpen}
        onOpenChange={setProgramDialogOpen}
        program={selectedProgram}
        onEdit={(prog) => {
          setSelectedProgram(prog);
          setProgramDialogOpen(false);
          setEditDialogOpen(true);
        }}
        currentUser={currentUser}
      />

      <ProgramDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        program={selectedProgram}
        onSave={handleSaveProgram}
        onDelete={handleDeleteProgram}
        teamMembers={teamMembers}
        initialStatus={selectedProgram?.status || "todo"}
        currentUser={currentUser}
      />

      <ProgramDialog
        open={createProgramOpen}
        onOpenChange={setCreateProgramOpen}
        program={null}
        onSave={handleCreateProgram}
        teamMembers={teamMembers}
        initialStatus="todo"
        currentUser={currentUser}
      />

      <CreateTaskDialog
        open={createTaskOpen}
        onOpenChange={setCreateTaskOpen}
        programs={programs}
        teamMembers={teamMembers}
        onSave={(taskData) => createTaskMutation.mutate(taskData)}
      />

      <TaskDetailDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        task={selectedTask}
        programId={selectedTask?.program_id}
        onUpdate={() => {}}
      />
    </div>
  );
}