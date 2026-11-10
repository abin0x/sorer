import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Calendar, User, ZoomIn, ZoomOut, Search, Filter } from "lucide-react";
import MultiBranchSelect from "../components/shared/MultiBranchSelect";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, differenceInDays, addMonths, subMonths } from "date-fns";
import ProgramFullDetailsDialog from "../components/program/ProgramFullDetailsDialog";
import TaskDetailDialog from "../components/dialogs/TaskDetailDialog";

export default function Timeline() {
  const [viewStart, setViewStart] = useState(new Date(2025, 7, 1)); // August 2025
  const [viewMonths, setViewMonths] = useState(12);
  const [groupBy, setGroupBy] = useState("assignee");
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemType, setItemType] = useState(null);
  const [programDialogOpen, setProgramDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [branchFilters, setBranchFilters] = useState([]);
  const [assigneeFilter, setAssigneeFilter] = useState("all");

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me()
  });

  const { data: programs = [] } = useQuery({
    queryKey: ["programs"],
    queryFn: () => base44.entities.Program.list()
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => base44.entities.Task.list()
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list()
  });

  const viewEnd = addMonths(viewStart, viewMonths);
  const months = eachMonthOfInterval({ start: viewStart, end: viewEnd });

  // Get unique branches
  const branches = [...new Set(programs.map(p => p.branch).filter(Boolean))];

  // Filter and prepare timeline items
  const timelineData = useMemo(() => {
    const items = [];

    programs.forEach(program => {
      const startDate = program.started_date || program.suggested_start_date;
      const endDate = program.completed_date || program.due_date;
      
      if (startDate && endDate) {
        // Apply filters
        const matchesSearch = program.title?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || program.status === statusFilter;
        const matchesPriority = priorityFilter === "all" || program.priority === priorityFilter;
        const matchesBranch = branchFilters.length === 0 || (program.branches && program.branches.some(b => branchFilters.includes(b)));
        const matchesAssignee = assigneeFilter === "all" || program.assignee === assigneeFilter;

        if (matchesSearch && matchesStatus && matchesPriority && matchesBranch && matchesAssignee) {
          items.push({
            id: program.id,
            type: "program",
            title: program.title,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            assignee: program.assignee,
            branch: program.branch,
            status: program.status,
            priority: program.priority,
            data: program
          });
        }
      }
    });

    tasks.forEach(task => {
      if (task.due_date) {
        const program = programs.find(p => p.id === task.program_id);
        const startDate = program?.started_date || program?.suggested_start_date || task.due_date;
        
        // Apply filters
        const matchesSearch = task.title?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesAssignee = assigneeFilter === "all" || task.assignee === assigneeFilter;
        
        if (matchesSearch && matchesAssignee) {
          items.push({
            id: task.id,
            type: "task",
            title: task.title,
            startDate: new Date(startDate),
            endDate: new Date(task.due_date),
            assignee: task.assignee,
            branch: program?.branch,
            status: task.completed ? "done" : "in_progress",
            priority: "medium",
            data: task,
            programTitle: program?.title
          });
        }
      }
    });

    return items;
  }, [programs, tasks, searchTerm, statusFilter, priorityFilter, branchFilters, assigneeFilter]);

  const groupedData = useMemo(() => {
    const groups = {};

    timelineData.forEach(item => {
      const key = groupBy === "assignee" 
        ? item.assignee || "Unassigned"
        : item.branch || "No Branch";

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    });

    return groups;
  }, [timelineData, groupBy]);

  const calculateBarStyle = (startDate, endDate) => {
    const totalDays = differenceInDays(viewEnd, viewStart);
    const startOffset = differenceInDays(startDate, viewStart);
    const duration = differenceInDays(endDate, startDate);

    const left = Math.max(0, (startOffset / totalDays) * 100);
    const width = Math.min((duration / totalDays) * 100, 100 - left);

    return {
      left: `${left}%`,
      width: `${width}%`
    };
  };

  // Calculate today's position
  const getTodayPosition = () => {
    const today = new Date();
    const totalDays = differenceInDays(viewEnd, viewStart);
    const todayOffset = differenceInDays(today, viewStart);
    return (todayOffset / totalDays) * 100;
  };

  const todayPosition = getTodayPosition();
  const showTodayLine = todayPosition >= 0 && todayPosition <= 100;

  const statusColors = {
    todo: "bg-slate-400 dark:bg-slate-600",
    in_progress: "bg-blue-500 dark:bg-blue-600",
    in_review: "bg-amber-500 dark:bg-amber-600",
    done: "bg-emerald-500 dark:bg-emerald-600"
  };

  const handleItemClick = (item) => {
    setSelectedItem(item.data);
    setItemType(item.type);
    if (item.type === "program") {
      setProgramDialogOpen(true);
    } else {
      setTaskDialogOpen(true);
    }
  };

  const getTeamMemberName = (email) => {
    const member = teamMembers.find(m => m.email === email);
    return member?.full_name || email?.split('@')[0] || email;
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[98vw] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold tracking-wider uppercase text-primary mb-1.5">Kanban</div>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Project Timeline</h1>
              <p className="text-muted-foreground mt-1.5">Gantt chart view of programs and tasks</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={groupBy} onValueChange={setGroupBy}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assignee">Group by Assignee</SelectItem>
                  <SelectItem value="branch">Group by Branch</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMonths(Math.max(3, viewMonths - 3))}
                  className="dark:border-slate-700"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm text-slate-600 dark:text-slate-400 min-w-[80px] text-center">
                  {viewMonths} months
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMonths(Math.min(24, viewMonths + 3))}
                  className="dark:border-slate-700"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewStart(subMonths(viewStart, 3))}
                  className="dark:border-slate-700"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewStart(new Date(2025, 7, 1))}
                  className="dark:border-slate-700"
                >
                  Reset
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewStart(addMonths(viewStart, 3))}
                  className="dark:border-slate-700"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-4 h-4 text-slate-500" />
                <span className="font-semibold text-slate-900 dark:text-white">Filters</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 dark:bg-slate-800 dark:border-slate-700"
                  />
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

                <MultiBranchSelect
                  value={branchFilters}
                  onValueChange={setBranchFilters}
                  placeholder="All Branches"
                />

                <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                  <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                    <SelectValue placeholder="Assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Assignees</SelectItem>
                    {teamMembers.map(member => (
                      <SelectItem key={member.id} value={member.email}>
                        {member.full_name || member.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Legend */}
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-6 text-sm flex-wrap">
              <span className="font-semibold text-slate-900 dark:text-white">Legend:</span>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-slate-400 dark:bg-slate-600"></div>
                <span className="text-slate-600 dark:text-slate-400">To Do</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-500 dark:bg-blue-600"></div>
                <span className="text-slate-600 dark:text-slate-400">In Progress</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-amber-500 dark:bg-amber-600"></div>
                <span className="text-slate-600 dark:text-slate-400">In Review</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-emerald-500 dark:bg-emerald-600"></div>
                <span className="text-slate-600 dark:text-slate-400">Done</span>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <div className="w-4 h-1 bg-red-500"></div>
                <span className="text-slate-600 dark:text-slate-400">Today</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gantt Chart */}
        <Card className="dark:bg-slate-900 dark:border-slate-800 shadow-xl">
          <CardHeader className="border-b border-slate-200 dark:border-slate-700">
            <CardTitle className="flex items-center gap-2 dark:text-white">
              <Calendar className="w-5 h-5" />
              Timeline View ({format(viewStart, 'MMM yyyy')} - {format(viewEnd, 'MMM yyyy')})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <div className="min-w-[1200px]">
                {/* Timeline Header */}
                <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                  <div className="w-56 flex-shrink-0 p-4 border-r border-slate-200 dark:border-slate-700">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {groupBy === "assignee" ? "Team Member" : "Branch"}
                    </span>
                  </div>
                  <div className="flex-1 flex">
                    {months.map((month, idx) => (
                      <div
                        key={idx}
                        className="flex-1 p-4 text-center border-r border-slate-200 dark:border-slate-700 last:border-r-0"
                      >
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {format(month, 'MMM')}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {format(month, 'yyyy')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Timeline Rows */}
                <div className="divide-y divide-slate-200 dark:divide-slate-700 relative">
                  {Object.entries(groupedData).map(([group, items]) => (
                    <div key={group} className="flex hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="w-56 flex-shrink-0 p-4 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400" />
                          <span className="font-medium text-slate-900 dark:text-white truncate">
                            {groupBy === "assignee" ? getTeamMemberName(group) : group}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {items.length} {items.length === 1 ? 'item' : 'items'}
                        </div>
                      </div>
                      <div className="flex-1 relative p-4" style={{ minHeight: '100px' }}>
                        {/* Month dividers */}
                        <div className="absolute inset-0 flex">
                          {months.map((_, idx) => (
                            <div
                              key={idx}
                              className="flex-1 border-r border-slate-200 dark:border-slate-700 last:border-r-0"
                            />
                          ))}
                        </div>

                        {/* Today line */}
                        {showTodayLine && (
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                            style={{ left: `${todayPosition}%` }}
                          >
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full"></div>
                          </div>
                        )}

                        {/* Timeline bars */}
                        <div className="relative h-full">
                          {items.map((item, idx) => {
                            const style = calculateBarStyle(item.startDate, item.endDate);
                            const colorClass = statusColors[item.status] || "bg-slate-400";

                            return (
                              <div
                                key={item.id}
                                className="absolute cursor-pointer group z-10"
                                style={{
                                  ...style,
                                  top: `${idx * 35}px`,
                                  height: '28px'
                                }}
                                onClick={() => handleItemClick(item)}
                              >
                                <div
                                  className={`${colorClass} h-full rounded-lg px-3 flex items-center justify-between shadow-md hover:shadow-lg transition-all hover:scale-105`}
                                >
                                  <span className="text-xs font-semibold text-white truncate">
                                    {item.title}
                                  </span>
                                  {item.type === "task" && (
                                    <Badge className="ml-2 bg-white/30 text-white text-xs border-0">Task</Badge>
                                  )}
                                </div>

                                {/* Tooltip on hover */}
                                <div className="absolute left-0 top-full mt-2 hidden group-hover:block z-30">
                                  <div className="bg-slate-900 dark:bg-slate-800 text-white text-xs rounded-lg p-3 shadow-xl whitespace-nowrap border border-slate-700">
                                    <div className="font-semibold mb-1">{item.title}</div>
                                    <div className="text-slate-300 space-y-0.5">
                                      <div>📅 {format(item.startDate, 'MMM d, yyyy')} - {format(item.endDate, 'MMM d, yyyy')}</div>
                                      <div>📊 Status: {item.status.replace(/_/g, ' ')}</div>
                                      {item.programTitle && (
                                        <div>📁 Program: {item.programTitle}</div>
                                      )}
                                      {item.priority && (
                                        <div>⚡ Priority: {item.priority}</div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}

                  {Object.keys(groupedData).length === 0 && (
                    <div className="text-center py-16 text-slate-500 dark:text-slate-400">
                      <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">No timeline data available</p>
                      <p className="text-sm mt-2">Try adjusting your filters</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <ProgramFullDetailsDialog
        open={programDialogOpen}
        onOpenChange={setProgramDialogOpen}
        program={selectedItem}
        currentUser={currentUser}
      />

      <TaskDetailDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        task={selectedItem}
        programId={selectedItem?.program_id}
        onUpdate={() => {}}
      />
    </div>
  );
}