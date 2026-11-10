import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from '@/lib/router-compat';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  LayoutDashboard,
  ListTodo,
  DollarSign,
  Calendar,
  FileText,
  Receipt,
  MessageSquare,
  Activity,
  ArrowLeft,
  Shield
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { Link, useNavigate } from '@/lib/router-compat';
import TaskDetailDialog from "../components/dialogs/TaskDetailDialog";
import NoteDetailDialog from "../components/dialogs/NoteDetailDialog";
import ExpenseDetailDialog from "../components/dialogs/ExpenseDetailDialog";
import StaffPayDetailDialog from "../components/dialogs/StaffPayDetailDialog";
import MessageDetailDialog from "../components/dialogs/MessageDetailDialog";
import UserGanttChart from "../components/user/UserGanttChart";
import DeleteAccount from "../components/settings/DeleteAccount";
import SubPageLayout from "@/components/layout/SubPageLayout";

const ROLE_LABELS = {
  admin: "Administrator",
  director: "Director",
  branch_director: "Branch Director",
  staff: "Staff Member"
};

export default function UserProfileView() {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get("id");
  const navigate = useNavigate();

  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedNote, setSelectedNote] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [selectedStaffPay, setSelectedStaffPay] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [staffPayDialogOpen, setStaffPayDialogOpen] = useState(false);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);

  // If no userId provided, get current user
  const { data: currentUser, isLoading: currentUserLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me().catch(() => null),
    enabled: !userId,
  });

  const effectiveUserId = userId || currentUser?.id;

  const { data: user, isLoading: userLoading, error: userError } = useQuery({
    queryKey: ["user", effectiveUserId],
    queryFn: async () => {
      // If viewing own profile, just use auth.me() directly — no need to
      // list all users (which may be empty or RLS-restricted).
      if (!userId && currentUser) return currentUser;
      // For a specific user, fetch by id directly.
      return await base44.entities.User.get(effectiveUserId);
    },
    enabled: !!effectiveUserId,
    retry: false
  });

  const { data: programs = [] } = useQuery({
    queryKey: ["programs"],
    queryFn: () => base44.entities.Program.list("-created_date")
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => base44.entities.Task.list()
  });

  const { data: subtasks = [] } = useQuery({
    queryKey: ["subtasks"],
    queryFn: () => base44.entities.Subtask.list()
  });

  const { data: staffPay = [] } = useQuery({
    queryKey: ["staffpay"],
    queryFn: () => base44.entities.StaffPay.list()
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["notes"],
    queryFn: () => base44.entities.Note.list()
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list()
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["messages"],
    queryFn: () => base44.entities.Message.list()
  });

  if (userLoading || (!userId && currentUserLoading)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800" />
      </div>
    );
  }

  if (!user || userError) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <Card className="max-w-md dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6 text-center">
            <User className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">User Not Found</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              The user profile you're looking for doesn't exist or has been removed.
            </p>
            <Link to={createPageUrl("RoleDashboard")}>
              <Button className="bg-amber-600 hover:bg-amber-700">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const myPrograms = programs.filter((p) => p.assignee === user.email || p.created_by_email === user.email);
  const myProgramIds = myPrograms.map((p) => p.id);
  const myTasks = tasks.filter((t) => t.assignee === user.email || t.created_by === user.email);
  const mySubtasks = subtasks.filter((st) => st.assignee === user.email || st.created_by === user.email);
  const myNotes = notes.filter((n) => myProgramIds.includes(n.program_id));
  const myExpenses = expenses.filter((e) => myProgramIds.includes(e.program_id));
  const myStaffPay = staffPay.filter((sp) => sp.staff_name === user.email || sp.created_by === user.email);
  const myMessages = messages.filter((m) => m.sender_email === user.email);
  const totalStaffPay = myStaffPay.reduce((sum, sp) => sum + (sp.amount || 0), 0);

  // Program stats by status
  const programStats = {
    todo: myPrograms.filter(p => p.status === 'todo').length,
    in_progress: myPrograms.filter(p => p.status === 'in_progress').length,
    in_review: myPrograms.filter(p => p.status === 'in_review').length,
    done: myPrograms.filter(p => p.status === 'done').length,
  };

  // Task stats by status
  const taskStats = {
    completed: myTasks.filter(t => t.completed).length,
    pending: myTasks.filter(t => !t.completed).length,
  };

  // Subtask stats by status
  const subtaskStats = {
    completed: mySubtasks.filter(st => st.completed).length,
    pending: mySubtasks.filter(st => !st.completed).length,
  };

  // Activity feed - combine all recent activities
  const activities = [
    ...myPrograms.map((p) => ({ type: 'program', date: p.created_date, data: p })),
    ...myTasks.map((t) => ({ type: 'task', date: t.created_date, data: t })),
    ...myNotes.map((n) => ({ type: 'note', date: n.created_date, data: n })),
    ...myExpenses.map((e) => ({ type: 'expense', date: e.created_date, data: e })),
    ...myStaffPay.map((sp) => ({ type: 'staffpay', date: sp.created_date, data: sp })),
    ...myMessages.map((m) => ({ type: 'message', date: m.created_date, data: m }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20);

  const getActivityIcon = (type) => {
    switch (type) {
      case 'program': return <LayoutDashboard className="w-4 h-4 text-emerald-600" />;
      case 'task': return <ListTodo className="w-4 h-4 text-blue-600" />;
      case 'note': return <FileText className="w-4 h-4 text-purple-600" />;
      case 'expense': return <Receipt className="w-4 h-4 text-orange-600" />;
      case 'staffpay': return <DollarSign className="w-4 h-4 text-emerald-600" />;
      case 'message': return <MessageSquare className="w-4 h-4 text-indigo-600" />;
      default: return <Activity className="w-4 h-4 text-slate-600" />;
    }
  };

  const getActivityText = (activity) => {
    switch (activity.type) {
      case 'program':
        return `Created program: ${activity.data.title}`;
      case 'task':
        return `${activity.data.completed ? 'Completed' : 'Created'} task: ${activity.data.title}`;
      case 'note':
        return `Added a note`;
      case 'expense':
        return `Submitted expense: $${activity.data.amount}`;
      case 'staffpay':
        return `Staff pay recorded: $${activity.data.amount}`;
      case 'message':
        return activity.data.is_announcement ? 'Posted an announcement' : 'Sent a message';
      default:
        return 'Activity';
    }
  };

  return (
    <SubPageLayout
      title="User Profile"
      backTo={createPageUrl("RoleDashboard")}
      className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900"
      contentClassName="max-w-7xl mx-auto space-y-6"
    >

        {/* Profile Header Card */}
        <Card className="dark:bg-slate-900 dark:border-slate-800 shadow-lg">
          <CardHeader className="border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-start gap-6">
              <div className="w-24 h-24 bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-3xl">
                  {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {user.full_name || 'Unnamed User'}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="bg-slate-800 text-white dark:bg-amber-600">
                    {ROLE_LABELS[user.custom_role] || 'Staff Member'}
                  </Badge>
                  {user.branch && user.custom_role === 'branch_director' && (
                    <Badge variant="outline" className="dark:border-emerald-600 dark:text-slate-300">{user.branch}</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {user.title && (
                <div className="flex items-center gap-3">
                  <Briefcase className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Job Title</p>
                    <p className="text-slate-900 dark:text-white">{user.title}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Email</p>
                  <p className="text-slate-900 dark:text-white">{user.email}</p>
                </div>
              </div>
              {user.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Phone</p>
                    <p className="text-slate-900 dark:text-white">{user.phone}</p>
                  </div>
                </div>
              )}
              {user.address && (
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Address</p>
                    <p className="text-slate-900 dark:text-white">{user.address}</p>
                  </div>
                </div>
              )}
            </div>

            {user.bio && (
              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">About</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{user.bio}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Overview with better contrast */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card 
            className="dark:bg-slate-900 dark:border-slate-800 col-span-2 cursor-pointer hover:shadow-lg transition-all shadow-md"
            onClick={() => navigate(createPageUrl("ProgramsList") + `?assignee=${user.email}`)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <LayoutDashboard className="w-5 h-5 text-emerald-600" />
                <CardTitle className="text-lg text-slate-900 dark:text-white">Programs</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-slate-900 dark:text-white mb-4">{myPrograms.length}</div>
              <div className="grid grid-cols-4 gap-2">
                <Button
                  variant="ghost"
                  className="h-auto flex-col p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(createPageUrl("ProgramsList") + `?assignee=${user.email}&status=todo`);
                  }}
                >
                  <div className="text-xl font-bold text-slate-700 dark:text-slate-200">{programStats.todo}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">Todo</div>
                </Button>
                <Button
                  variant="ghost"
                  className="h-auto flex-col p-3 bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-lg shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(createPageUrl("ProgramsList") + `?assignee=${user.email}&status=in_progress`);
                  }}
                >
                  <div className="text-xl font-bold text-blue-700 dark:text-blue-200">{programStats.in_progress}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">In Progress</div>
                </Button>
                <Button
                  variant="ghost"
                  className="h-auto flex-col p-3 bg-amber-100 dark:bg-amber-900 hover:bg-amber-200 dark:hover:bg-amber-800 rounded-lg shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(createPageUrl("ProgramsList") + `?assignee=${user.email}&status=in_review`);
                  }}
                >
                  <div className="text-xl font-bold text-amber-700 dark:text-amber-200">{programStats.in_review}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">In Review</div>
                </Button>
                <Button
                  variant="ghost"
                  className="h-auto flex-col p-3 bg-emerald-100 dark:bg-emerald-900 hover:bg-emerald-200 dark:hover:bg-emerald-800 rounded-lg shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(createPageUrl("ProgramsList") + `?assignee=${user.email}&status=done`);
                  }}
                >
                  <div className="text-xl font-bold text-emerald-700 dark:text-emerald-200">{programStats.done}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">Done</div>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="dark:bg-slate-900 dark:border-slate-800 cursor-pointer hover:shadow-lg transition-all shadow-md"
            onClick={() => navigate(createPageUrl("ProgramsList") + `?assignee=${user.email}&view=tasks`)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <ListTodo className="w-5 h-5 text-blue-600" />
                <CardTitle className="text-lg text-slate-900 dark:text-white">Tasks</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-4">{myTasks.length}</div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="ghost"
                  className="h-auto flex-col p-3 bg-emerald-100 dark:bg-emerald-900 hover:bg-emerald-200 dark:hover:bg-emerald-800 rounded-lg shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(createPageUrl("ProgramsList") + `?assignee=${user.email}&view=tasks&completed=true`);
                  }}
                >
                  <div className="text-xl font-bold text-emerald-700 dark:text-emerald-200">{taskStats.completed}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">Done</div>
                </Button>
                <Button
                  variant="ghost"
                  className="h-auto flex-col p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(createPageUrl("ProgramsList") + `?assignee=${user.email}&view=tasks&completed=false`);
                  }}
                >
                  <div className="text-xl font-bold text-slate-700 dark:text-slate-200">{taskStats.pending}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">Pending</div>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="dark:bg-slate-900 dark:border-slate-800 cursor-pointer hover:shadow-lg transition-all shadow-md"
            onClick={() => navigate(createPageUrl("ProgramsList") + `?assignee=${user.email}&view=subtasks`)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <ListTodo className="w-5 h-5 text-purple-600" />
                <CardTitle className="text-lg text-slate-900 dark:text-white">Subtasks</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-4">{mySubtasks.length}</div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="ghost"
                  className="h-auto flex-col p-3 bg-emerald-100 dark:bg-emerald-900 hover:bg-emerald-200 dark:hover:bg-emerald-800 rounded-lg shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(createPageUrl("ProgramsList") + `?assignee=${user.email}&view=subtasks&completed=true`);
                  }}
                >
                  <div className="text-xl font-bold text-emerald-700 dark:text-emerald-200">{subtaskStats.completed}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">Done</div>
                </Button>
                <Button
                  variant="ghost"
                  className="h-auto flex-col p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(createPageUrl("ProgramsList") + `?assignee=${user.email}&view=subtasks&completed=false`);
                  }}
                >
                  <div className="text-xl font-bold text-slate-700 dark:text-slate-200">{subtaskStats.pending}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">Pending</div>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="dark:bg-slate-900 dark:border-slate-800 shadow-md">
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{myNotes.length}</div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Notes</div>
            </CardContent>
          </Card>
          <Card className="dark:bg-slate-900 dark:border-slate-800 shadow-md">
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">{myExpenses.length}</div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Expenses</div>
            </CardContent>
          </Card>
          <Card className="dark:bg-slate-900 dark:border-slate-800 shadow-md">
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">${totalStaffPay.toLocaleString()}</div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Staff Pay</div>
            </CardContent>
          </Card>
        </div>

        {/* Gantt Chart */}
        <UserGanttChart programs={myPrograms} tasks={myTasks} />

        {/* Detailed Tabs */}
        <Tabs defaultValue="activity" className="space-y-4">
          <TabsList className="overflow-x-auto overflow-y-hidden flex-nowrap w-full justify-start sm:grid sm:grid-cols-8 dark:bg-slate-900">
            <TabsTrigger value="activity" className="dark:text-slate-300 data-[state=active]:dark:text-white">Activity</TabsTrigger>
            <TabsTrigger value="programs" className="dark:text-slate-300 data-[state=active]:dark:text-white">Programs</TabsTrigger>
            <TabsTrigger value="tasks" className="dark:text-slate-300 data-[state=active]:dark:text-white">Tasks</TabsTrigger>
            <TabsTrigger value="subtasks" className="dark:text-slate-300 data-[state=active]:dark:text-white">Subtasks</TabsTrigger>
            <TabsTrigger value="notes" className="dark:text-slate-300 data-[state=active]:dark:text-white">Notes</TabsTrigger>
            <TabsTrigger value="expenses" className="dark:text-slate-300 data-[state=active]:dark:text-white">Expenses</TabsTrigger>
            <TabsTrigger value="staffpay" className="dark:text-slate-300 data-[state=active]:dark:text-white">Staff Pay</TabsTrigger>
            <TabsTrigger value="messages" className="dark:text-slate-300 data-[state=active]:dark:text-white">Messages</TabsTrigger>
          </TabsList>

          <TabsContent value="activity">
            <Card className="dark:bg-slate-900 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="dark:text-white flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Activity Feed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {activities.length === 0 ? (
                    <p className="text-center py-8 text-slate-500 dark:text-slate-400">No activity yet</p>
                  ) : (
                    <div className="space-y-3">
                      {activities.map((activity, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          {getActivityIcon(activity.type)}
                          <div className="flex-1">
                            <p className="text-sm text-slate-900 dark:text-white">{getActivityText(activity)}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {new Date(activity.date).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="programs">
            <Card className="dark:bg-slate-900 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="dark:text-slate-100">Programs ({myPrograms.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {myPrograms.length === 0 ?
                <p className="text-center py-8 text-slate-500 dark:text-slate-400">No programs</p> :

                <div className="space-y-3">
                    {myPrograms.map((program) =>
                  <div
                    key={program.id}
                    className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                    onClick={() => {
                      navigate(createPageUrl(`Kanban`));
                    }}>

                        <div className="font-medium text-slate-900 dark:text-white mb-2">{program.title}</div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">{program.status.replace(/_/g, ' ')}</Badge>
                          {program.priority &&
                      <Badge className={`${
                      program.priority === 'high' ? 'bg-red-100 text-red-700' :
                      program.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-emerald-100 text-emerald-700'}`
                      }>
                              {program.priority}
                            </Badge>
                      }
                          {program.branch &&
                      <Badge variant="outline">{program.branch}</Badge>
                      }
                        </div>
                      </div>
                  )}
                  </div>
                }
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks">
            <Card className="dark:bg-slate-900 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="dark:text-slate-100">Tasks ({myTasks.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {myTasks.length === 0 ?
                <p className="text-center py-8 text-slate-500 dark:text-slate-400">No tasks</p> :

                <div className="space-y-2">
                    {myTasks.map((task) =>
                  <div
                    key={task.id}
                    onClick={() => {
                      setSelectedTask(task);
                      setTaskDialogOpen(true);
                    }}
                    className="p-3 bg-blue-50 dark:bg-slate-800 rounded-lg hover:bg-blue-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">

                        <div className="font-medium text-slate-900 dark:text-white">{task.title}</div>
                        <Badge className={task.completed ? "bg-emerald-100 text-emerald-700 mt-2" : "bg-slate-200 text-slate-700 mt-2"}>
                          {task.completed ? "✓ Completed" : "○ Pending"}
                        </Badge>
                      </div>
                  )}
                  </div>
                }
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subtasks">
            <Card className="dark:bg-slate-900 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="dark:text-slate-100">Subtasks ({mySubtasks.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {mySubtasks.length === 0 ?
                <p className="text-center py-8 text-slate-500 dark:text-slate-400">No subtasks</p> :

                <div className="space-y-2">
                    {mySubtasks.map((subtask) =>
                  <div
                    key={subtask.id}
                    className="p-3 bg-purple-50 dark:bg-slate-800 rounded-lg hover:bg-purple-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">

                        <div className="font-medium text-slate-900 dark:text-white">{subtask.title}</div>
                        <Badge className={subtask.completed ? "bg-emerald-100 text-emerald-700 mt-2" : "bg-slate-200 text-slate-700 mt-2"}>
                          {subtask.completed ? "✓ Completed" : "○ Pending"}
                        </Badge>
                      </div>
                  )}
                  </div>
                }
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes">
            <Card className="dark:bg-slate-900 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="dark:text-slate-100">Notes ({myNotes.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {myNotes.length === 0 ?
                <p className="text-center py-8 text-slate-500 dark:text-slate-400">No notes</p> :

                <div className="space-y-2">
                    {myNotes.map((note) =>
                  <div
                    key={note.id}
                    onClick={() => {
                      setSelectedNote(note);
                      setNoteDialogOpen(true);
                    }}
                    className="p-3 bg-purple-50 dark:bg-slate-800 rounded-lg hover:bg-purple-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">

                        <p className="text-slate-700 dark:text-white line-clamp-2">{note.content}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                          {new Date(note.created_date).toLocaleString()}
                        </p>
                      </div>
                  )}
                  </div>
                }
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expenses">
            <Card className="dark:bg-slate-900 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="dark:text-slate-100">Expenses ({myExpenses.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {myExpenses.length === 0 ?
                <p className="text-center py-8 text-slate-500 dark:text-slate-400">No expenses</p> :

                <div className="space-y-2">
                    {myExpenses.map((expense) =>
                  <div
                    key={expense.id}
                    onClick={() => {
                      setSelectedExpense(expense);
                      setExpenseDialogOpen(true);
                    }}
                    className="p-3 bg-orange-50 dark:bg-slate-800 rounded-lg hover:bg-orange-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">

                        <div className="flex justify-between items-start">
                          <div className="font-medium text-slate-900 dark:text-white">{expense.description}</div>
                          <div className="font-bold text-orange-600 dark:text-orange-400">${expense.amount.toLocaleString()}</div>
                        </div>
                        <Badge className={
                    expense.status === 'approved' ? 'bg-emerald-100 text-emerald-700 mt-2' :
                    expense.status === 'rejected' ? 'bg-red-100 text-red-700 mt-2' :
                    'bg-amber-100 text-amber-700 mt-2'
                    }>
                          {expense.status}
                        </Badge>
                      </div>
                  )}
                  </div>
                }
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="staffpay">
            <Card className="dark:bg-slate-900 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="dark:text-slate-100">Staff Pay ({myStaffPay.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {myStaffPay.length === 0 ?
                <p className="text-center py-8 text-slate-500 dark:text-slate-400">No staff pay records</p> :

                <>
                    <div className="text-center p-4 bg-emerald-50 dark:bg-slate-800 rounded-lg mb-4">
                      <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
                        ${totalStaffPay.toLocaleString()}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">Total</div>
                    </div>
                    <div className="space-y-2">
                      {myStaffPay.map((pay) =>
                    <div
                      key={pay.id}
                      onClick={() => {
                        setSelectedStaffPay(pay);
                        setStaffPayDialogOpen(true);
                      }}
                      className="p-3 bg-emerald-50 dark:bg-emerald-900 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-950 transition-colors cursor-pointer">

                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium text-slate-900 dark:text-slate-100">{pay.role || 'Staff'}</div>
                              {pay.notes &&
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{pay.notes}</p>
                          }
                            </div>
                            <div className="font-bold text-emerald-600 dark:text-emerald-400">${pay.amount.toLocaleString()}</div>
                          </div>
                        </div>
                    )}
                    </div>
                  </>
                }
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages">
            <Card className="dark:bg-slate-900 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="dark:text-slate-100">Messages ({myMessages.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {myMessages.length === 0 ?
                <p className="text-center py-8 text-slate-500 dark:text-slate-400">No messages sent</p> :

                <div className="space-y-2">
                    {myMessages.map((message) =>
                  <div
                    key={message.id}
                    onClick={() => {
                      setSelectedMessage(message);
                      setMessageDialogOpen(true);
                    }}
                    className="p-3 bg-indigo-50 dark:bg-slate-800 rounded-lg hover:bg-indigo-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">

                        {message.is_announcement &&
                    <Badge className="bg-indigo-600 text-white mb-2">Announcement</Badge>
                    }
                        <p className="text-slate-700 dark:text-white line-clamp-2">{message.content}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                          {new Date(message.created_date).toLocaleString()}
                        </p>
                      </div>
                  )}
                  </div>
                }
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      {/* Detail Dialogs */}
      <TaskDetailDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        task={selectedTask}
        onUpdate={() => {}}
      />

      <NoteDetailDialog
        open={noteDialogOpen}
        onOpenChange={setNoteDialogOpen}
        note={selectedNote}
        onUpdate={() => {}}
      />

      <ExpenseDetailDialog
        open={expenseDialogOpen}
        onOpenChange={setExpenseDialogOpen}
        expense={selectedExpense}
        onUpdate={() => {}}
      />

      <StaffPayDetailDialog
        open={staffPayDialogOpen}
        onOpenChange={setStaffPayDialogOpen}
        staffPay={selectedStaffPay}
        onUpdate={() => {}}
      />

      <MessageDetailDialog
        open={messageDialogOpen}
        onOpenChange={setMessageDialogOpen}
        message={selectedMessage}
      />

      {/* Account & Legal — accessible from the Profile tab on mobile */}
      <div className="space-y-4">
        <div className="rounded-xl border border-border p-5 space-y-3">
          <h3 className="font-semibold text-foreground">Legal & Privacy</h3>
          <Link to="/privacy-policy" className="flex items-center gap-3 py-2 min-h-[44px] text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Shield className="w-4 h-4" /> Privacy Policy
          </Link>
          <Link to="/terms-of-service" className="flex items-center gap-3 py-2 min-h-[44px] text-sm text-muted-foreground hover:text-foreground transition-colors">
            <FileText className="w-4 h-4" /> Terms of Service
          </Link>
        </div>
        <DeleteAccount user={user} />
      </div>
    </SubPageLayout>
  );
}