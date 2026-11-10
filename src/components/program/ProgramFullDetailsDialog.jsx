
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Edit,
  Calendar,
  Clock,
  DollarSign,
  Users,
  FileText,
  CheckCircle2,
  XCircle,
  ListTodo,
  MessageSquare,
  Timer,
  StickyNote,
  Receipt,
  Wallet,
  TrendingUp,
  LayoutDashboard
} from "lucide-react";
import { format } from "date-fns";
import TaskDialog from "./TaskDialog";
import NoteDialog from "./NoteDialog";
import ExpenseDialog from "./ExpenseDialog";
import StaffPayDialog from "./StaffPayDialog";
import TaskDetailDialog from "../dialogs/TaskDetailDialog";
import NoteDetailDialog from "../dialogs/NoteDetailDialog";
import ExpenseDetailDialog from "../dialogs/ExpenseDetailDialog";
import StaffPayDetailDialog from "../dialogs/StaffPayDetailDialog";
import ProjectChat from "../chat/ProjectChat";
import DocumentManager from "../documents/DocumentManager";
import TimeTracker from "../time/TimeTracker";
import BudgetTracker from "./BudgetTracker";
import TeamChat from "../chat/TeamChat";
import { toast } from "sonner";
import { formatTaskAssignmentEmail, formatExpenseSubmissionEmail, formatStaffPayEmail, sendEmail, sendBulkEmails } from "../utils/emailTemplates";
import EmailReminderButton from "../shared/EmailReminderButton";
import CriticalPathView from "../dependencies/CriticalPathView";

export default function ProgramFullDetailsDialog({ open, onOpenChange, program, onEdit, currentUser }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [staffPayDialogOpen, setStaffPayDialogOpen] = useState(false);
  
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedNote, setSelectedNote] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [selectedStaffPay, setSelectedStaffPay] = useState(null);

  const [taskDetailDialogOpen, setTaskDetailDialogOpen] = useState(false);
  const [noteDetailDialogOpen, setNoteDetailDialogOpen] = useState(false);
  const [expenseDetailDialogOpen, setExpenseDetailDialogOpen] = useState(false);
  const [staffPayDetailDialogOpen, setStaffPayDetailDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    if (open && program?._openTab) {
      setActiveTab(program._openTab);
    } else if (open) {
      setActiveTab("overview");
    }
  }, [open, program]);

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", program?.id],
    queryFn: () => base44.entities.Task.filter({ program_id: program.id }),
    enabled: !!program?.id,
  });

  const { data: subtasks = [] } = useQuery({
    queryKey: ["subtasks", program?.id],
    queryFn: () => base44.entities.Subtask.filter({ program_id: program.id }),
    enabled: !!program?.id,
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["notes", program?.id],
    queryFn: () => base44.entities.Note.filter({ program_id: program.id }),
    enabled: !!program?.id,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses", program?.id],
    queryFn: () => base44.entities.Expense.filter({ program_id: program.id }),
    enabled: !!program?.id,
  });

  const { data: staffPay = [] } = useQuery({
    queryKey: ["staffPay", program?.id],
    queryFn: () => base44.entities.StaffPay.filter({ program_id: program.id }),
    enabled: !!program?.id,
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list()
  });

  const createTaskMutation = useMutation({
    mutationFn: (taskData) => base44.entities.Task.create(taskData),
    onSuccess: async (newTask) => {
      const programId = newTask?.program_id;
      if (programId) {
        queryClient.invalidateQueries({ queryKey: ["tasks", programId] });
      }
      toast.success("Task created successfully");
      setTaskDialogOpen(false);
      
      if (newTask?.assignee && currentUser?.email && program?.id) {
        try {
          const assignee = teamMembers.find(m => m.email === newTask.assignee);
          const admins = teamMembers.filter(m => m.custom_role === 'admin' || m.custom_role === 'director');
          
          if (assignee) {
            const emailContent = formatTaskAssignmentEmail(newTask, program, assignee, currentUser);
            
            await sendEmail({
              to: assignee.email,
              subject: emailContent.subject,
              body: emailContent.body,
              from_name: "Jaguars Kanban",
              templateType: "task_assignment",
              programId: program.id,
              taskId: newTask.id,
              recipientName: assignee.full_name,
              sentBy: currentUser.email
            });
            
            if (admins.length > 0) {
              const adminEmails = admins.map(a => a.email).filter(email => email !== assignee.email);
              if (adminEmails.length > 0) {
                await sendBulkEmails({
                  recipients: adminEmails,
                  subject: emailContent.subject,
                  body: emailContent.body,
                  from_name: "Jaguars Kanban",
                  templateType: "task_assignment",
                  programId: program.id,
                  taskId: newTask.id,
                  sentBy: currentUser.email
                });
              }
            }
          }
        } catch (error) {
          console.error("Failed to send task assignment email", error);
        }
      }
    },
  });

  const createNoteMutation = useMutation({
    mutationFn: (noteData) => base44.entities.Note.create(noteData),
    onSuccess: (newNote) => {
      const programId = newNote?.program_id;
      if (programId) {
        queryClient.invalidateQueries({ queryKey: ["notes", programId] });
      }
      toast.success("Note created successfully");
      setNoteDialogOpen(false);
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: (expenseData) => base44.entities.Expense.create(expenseData),
    onSuccess: async (newExpense) => {
      const programId = newExpense?.program_id;
      if (programId) {
        queryClient.invalidateQueries({ queryKey: ["expenses", programId] });
      }
      toast.success("Expense created successfully");
      setExpenseDialogOpen(false);
      
      if (newExpense?.assigned_to && currentUser?.email && program?.id) {
        try {
          const payor = teamMembers.find(m => m.email === newExpense.assigned_to);
          const admins = teamMembers.filter(m => m.custom_role === 'admin' || m.custom_role === 'director');
          
          if (payor) {
            const emailContent = formatExpenseSubmissionEmail(newExpense, program, currentUser);
            
            await sendEmail({
              to: payor.email,
              subject: emailContent.subject,
              body: emailContent.body,
              from_name: "Jaguars Kanban",
              templateType: "expense_submission",
              programId: program.id,
              expenseId: newExpense.id,
              recipientName: payor.full_name,
              sentBy: currentUser.email
            });
            
            if (admins.length > 0) {
              const adminEmails = admins.map(a => a.email).filter(email => email !== payor.email);
              if (adminEmails.length > 0) {
                await sendBulkEmails({
                  recipients: adminEmails,
                  subject: emailContent.subject,
                  body: emailContent.body,
                  from_name: "Jaguars Kanban",
                  templateType: "expense_submission",
                  programId: program.id,
                  expenseId: newExpense.id,
                  sentBy: currentUser.email
                });
              }
            }
          }
        } catch (error) {
          console.error("Failed to send expense submission email", error);
        }
      }
    },
  });

  const createStaffPayMutation = useMutation({
    mutationFn: (staffPayData) => base44.entities.StaffPay.create(staffPayData),
    onSuccess: async (newStaffPay) => {
      const programId = newStaffPay?.program_id;
      if (programId) {
        queryClient.invalidateQueries({ queryKey: ["staffPay", programId] });
      }
      toast.success("Staff pay created successfully");
      setStaffPayDialogOpen(false);
      
      if (newStaffPay?.staff_email && currentUser?.email && program?.id) {
        try {
          const payee = teamMembers.find(m => m.email === newStaffPay.staff_email);
          const payor = teamMembers.find(m => m.email === newStaffPay.payor_email);
          const admins = teamMembers.filter(m => m.custom_role === 'admin' || m.custom_role === 'director');
          
          if (payee) {
            const emailContent = formatStaffPayEmail(newStaffPay, program, payee, payor || currentUser);
            
            await sendEmail({
              to: payee.email,
              subject: emailContent.subject,
              body: emailContent.body,
              from_name: "Jaguars Kanban",
              templateType: "staffpay_record",
              programId: program.id,
              staffPayId: newStaffPay.id,
              recipientName: payee.full_name,
              sentBy: currentUser.email
            });
            
            if (admins.length > 0) {
              const adminEmails = admins.map(a => a.email).filter(email => email !== payee.email);
              if (adminEmails.length > 0) {
                await sendBulkEmails({
                  recipients: adminEmails,
                  subject: emailContent.subject,
                  body: emailContent.body,
                  from_name: "Jaguars Kanban",
                  templateType: "staffpay_record",
                  programId: program.id,
                  staffPayId: newStaffPay.id,
                  sentBy: currentUser.email
                });
              }
            }
          }
        } catch (error) {
          console.error("Failed to send staff pay email", error);
        }
      }
    },
  });

  if (!program) return null;

  const statusConfig = {
    todo: { label: "To Do", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", icon: Clock },
    in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300", icon: TrendingUp },
    in_review: { label: "In Review", color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300", icon: FileText },
    done: { label: "Done", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300", icon: CheckCircle2 }
  };

  const priorityConfig = {
    low: { label: "Low", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
    medium: { label: "Medium", color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
    high: { label: "High", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" }
  };

  const StatusIcon = statusConfig[program.status]?.icon || Clock;

  const completedTasks = tasks.filter(t => t.completed).length;
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalStaffPay = staffPay.reduce((sum, s) => sum + (s.amount || 0), 0);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col dark:bg-slate-900">
          <DialogHeader className="border-b dark:border-slate-800 pb-4">
            <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span>{program?.title}</span>
              <div className="flex gap-2">
                <EmailReminderButton
                  item={program}
                  type="program"
                  currentUser={currentUser}
                  size="sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(program)}
                  className="dark:border-slate-700"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </div>
            </DialogTitle>
            {/* The badges previously here are removed as per the outline's new header structure */}
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="w-full justify-start border-b dark:border-slate-800 rounded-none bg-transparent p-0">
              <TabsTrigger value="overview" className="dark:data-[state=active]:bg-slate-700">
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="tasks" className="dark:data-[state=active]:bg-slate-700">
                <ListTodo className="w-4 h-4 mr-2" />
                Tasks ({tasks.length})
              </TabsTrigger>
              <TabsTrigger value="chat" className="dark:data-[state=active]:bg-slate-700">
                <MessageSquare className="w-4 h-4 mr-2" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="documents" className="dark:data-[state=active]:bg-slate-700">
                <FileText className="w-4 h-4 mr-2" />
                Documents
              </TabsTrigger>
              <TabsTrigger value="time" className="dark:data-[state=active]:bg-slate-700">
                <Timer className="w-4 h-4 mr-2" />
                Time
              </TabsTrigger>
              <TabsTrigger value="notes" className="dark:data-[state=active]:bg-slate-700">
                <StickyNote className="w-4 h-4 mr-2" />
                Notes ({notes.length})
              </TabsTrigger>
              <TabsTrigger value="expenses" className="dark:data-[state=active]:bg-slate-700">
                <Receipt className="w-4 h-4 mr-2" />
                Expenses ({expenses.length})
              </TabsTrigger>
              <TabsTrigger value="staffpay" className="dark:data-[state=active]:bg-slate-700">
                <Wallet className="w-4 h-4 mr-2" />
                Staff Pay ({staffPay.length})
              </TabsTrigger>
              <TabsTrigger value="critical-path" className="data-[state=active]:border-b-2 data-[state=active]:border-amber-600">
                Critical Path
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto p-6"> {/* New wrapper div for TabsContent */}
              <TabsContent value="overview" className="space-y-6"> {/* mt-6 removed */}
                <div className="flex flex-wrap items-center gap-2 mb-4"> {/* Re-added badges for overview */}
                  <Badge className={statusConfig[program.status]?.color}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusConfig[program.status]?.label}
                  </Badge>
                  {program.priority && (
                    <Badge className={priorityConfig[program.priority]?.color}>
                      {program.priority}
                    </Badge>
                  )}
                  {program.branch && (
                    <Badge variant="outline" className="dark:border-slate-700">
                      {program.branch}
                    </Badge>
                  )}
                  {program.season && (
                    <Badge variant="outline" className="dark:border-slate-700">
                      {program.season}
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column - Program Details */}
                  <div className="space-y-6">
                    {/* Program Information */}
                    <Card className="dark:bg-slate-800 dark:border-slate-700">
                      <CardHeader>
                        <CardTitle className="dark:text-white">Program Details</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {program.description && (
                          <div>
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Description</p>
                            <p className="text-sm text-slate-900 dark:text-white mt-1">{program.description}</p>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          {program.suggested_start_date && (
                            <div>
                              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Start Date</p>
                              <p className="text-sm text-slate-900 dark:text-white mt-1">
                                {format(new Date(program.suggested_start_date), 'MMM d, yyyy')}
                              </p>
                            </div>
                          )}
                          {program.due_date && (
                            <div>
                              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Due Date</p>
                              <p className="text-sm text-slate-900 dark:text-white mt-1">
                                {format(new Date(program.due_date), 'MMM d, yyyy')}
                              </p>
                            </div>
                          )}
                        </div>

                        {program.program_dates && (
                          <div>
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Program Dates</p>
                            <p className="text-sm text-slate-900 dark:text-white mt-1">{program.program_dates}</p>
                          </div>
                        )}

                        {program.program_time && (
                          <div>
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Program Time</p>
                            <p className="text-sm text-slate-900 dark:text-white mt-1">{program.program_time}</p>
                          </div>
                        )}

                        {program.field_location && (
                          <div>
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Location</p>
                            <p className="text-sm text-slate-900 dark:text-white mt-1">
                              {program.field_location}
                              {program.field_number && ` - Field ${program.field_number}`}
                            </p>
                          </div>
                        )}

                        {program.age_eligibility && (
                          <div>
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Age Eligibility</p>
                            <p className="text-sm text-slate-900 dark:text-white mt-1">{program.age_eligibility}</p>
                          </div>
                        )}

                        {program.gender_eligibility && (
                          <div>
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Gender</p>
                            <p className="text-sm text-slate-900 dark:text-white mt-1">{program.gender_eligibility}</p>
                          </div>
                        )}

                        {program.assignee && (
                          <div>
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Program Lead</p>
                            <p className="text-sm text-slate-900 dark:text-white mt-1">{program.assignee}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-3 gap-4">
                      <Card className="dark:bg-slate-800 dark:border-slate-700">
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <ListTodo className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                              {completedTasks}/{tasks.length}
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-400">Tasks Done</p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="dark:bg-slate-800 dark:border-slate-700">
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <Receipt className="w-8 h-8 mx-auto text-amber-500 mb-2" />
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                              ${totalExpenses.toFixed(2)}
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-400">Expenses</p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="dark:bg-slate-800 dark:border-slate-700">
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <Wallet className="w-8 h-8 mx-auto text-green-500 mb-2" />
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                              ${totalStaffPay.toFixed(2)}
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-400">Staff Pay</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Budget Tracker */}
                    {program.budget && (
                      <BudgetTracker
                        program={program}
                        expenses={expenses}
                        staffPay={staffPay}
                      />
                    )}
                  </div>

                  {/* Right Column - Team Chat */}
                  <div>
                    <TeamChat program={program} currentUser={currentUser} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="tasks" className="space-y-4"> {/* mt-6 removed */}
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Tasks</h3>
                  <Button
                    onClick={() => {
                      setSelectedTask(null);
                      setTaskDialogOpen(true);
                    }}
                    size="sm"
                    className="bg-gradient-to-r from-blue-600 to-blue-700"
                  >
                    <ListTodo className="w-4 h-4 mr-2" />
                    Add Task
                  </Button>
                </div>
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <Card
                      key={task.id}
                      className="dark:bg-slate-800 dark:border-slate-700 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => {
                        setSelectedTask(task);
                        setTaskDetailDialogOpen(true);
                      }}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {task.completed ? (
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                              ) : (
                                <XCircle className="w-5 h-5 text-slate-400" />
                              )}
                              <h4 className="font-semibold text-slate-900 dark:text-white">{task.title}</h4>
                            </div>
                            {task.description && (
                              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{task.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                              {task.assignee && <span>Assigned to: {task.assignee}</span>}
                              {task.due_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {format(new Date(task.due_date), 'MMM d, yyyy')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {tasks.length === 0 && (
                    <div className="text-center py-12">
                      <ListTodo className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-700" />
                      <p className="text-slate-500 dark:text-slate-400">No tasks yet</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="chat"> {/* mt-6 removed */}
                {program?.id && <ProjectChat programId={program.id} currentUser={currentUser} />}
              </TabsContent>

              <TabsContent value="documents"> {/* mt-6 removed */}
                {program?.id && <DocumentManager programId={program.id} />}
              </TabsContent>

              <TabsContent value="time"> {/* mt-6 removed */}
                {program?.id && <TimeTracker programId={program.id} currentUser={currentUser} />}
              </TabsContent>

              <TabsContent value="notes" className="space-y-4"> {/* mt-6 removed */}
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Notes</h3>
                  <Button
                    onClick={() => {
                      setSelectedNote(null);
                      setNoteDialogOpen(true);
                    }}
                    size="sm"
                    className="bg-gradient-to-r from-amber-600 to-amber-700"
                  >
                    <StickyNote className="w-4 h-4 mr-2" />
                    Add Note
                  </Button>
                </div>
                <div className="space-y-3">
                  {notes.map((note) => (
                    <Card
                      key={note.id}
                      className="dark:bg-slate-800 dark:border-slate-700 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => {
                        setSelectedNote(note);
                        setNoteDetailDialogOpen(true);
                      }}
                    >
                      <CardContent className="pt-6">
                        <p className="text-sm text-slate-900 dark:text-white whitespace-pre-wrap">{note.content}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                          {format(new Date(note.created_date), 'MMM d, yyyy h:mm a')}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                  {notes.length === 0 && (
                    <div className="text-center py-12">
                      <StickyNote className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-700" />
                      <p className="text-slate-500 dark:text-slate-400">No notes yet</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="expenses" className="space-y-4"> {/* mt-6 removed */}
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Expenses</h3>
                  <Button
                    onClick={() => {
                      setSelectedExpense(null);
                      setExpenseDialogOpen(true);
                    }}
                    size="sm"
                    className="bg-gradient-to-r from-amber-600 to-amber-700"
                  >
                    <Receipt className="w-4 h-4 mr-2" />
                    Add Expense
                  </Button>
                </div>
                <div className="space-y-3">
                  {expenses.map((expense) => (
                    <Card
                      key={expense.id}
                      className="dark:bg-slate-800 dark:border-slate-700 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => {
                        setSelectedExpense(expense);
                        setExpenseDetailDialogOpen(true);
                      }}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-slate-900 dark:text-white">{expense.description}</h4>
                              <Badge className={
                                expense.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                                expense.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                                'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                              }>
                                {expense.status}
                              </Badge>
                              {expense.payment_status && (
                                <Badge variant="outline" className="dark:border-slate-600">
                                  {expense.payment_status === 'paid' ? 'Paid' : 'To Be Paid'}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                              <span className="flex items-center gap-1">
                                <DollarSign className="w-4 h-4" />
                                ${expense.amount}
                              </span>
                              {expense.category && <span>{expense.category}</span>}
                              {expense.date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {format(new Date(expense.date), 'MMM d, yyyy')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {expenses.length === 0 && (
                    <div className="text-center py-12">
                      <Receipt className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-700" />
                      <p className="text-slate-500 dark:text-slate-400">No expenses yet</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="staffpay" className="space-y-4"> {/* mt-6 removed */}
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Staff Pay</h3>
                  <Button
                    onClick={() => {
                      setSelectedStaffPay(null);
                      setStaffPayDialogOpen(true);
                    }}
                    size="sm"
                    className="bg-gradient-to-r from-green-600 to-green-700"
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    Add Staff Pay
                  </Button>
                </div>
                <div className="space-y-3">
                  {staffPay.map((pay) => (
                    <Card
                      key={pay.id}
                      className="dark:bg-slate-800 dark:border-slate-700 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => {
                        setSelectedStaffPay(pay);
                        setStaffPayDetailDialogOpen(true);
                      }}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-slate-900 dark:text-white">
                                {pay.staff_name || pay.staff_email}
                              </h4>
                              <Badge variant="outline" className="dark:border-slate-600">
                                {pay.payment_status === 'paid' ? 'Paid' : 'To Be Paid'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                              <span className="flex items-center gap-1">
                                <DollarSign className="w-4 h-4" />
                                ${pay.amount}
                              </span>
                              {pay.role && <span>{pay.role}</span>}
                              {pay.hours_worked && <span>{pay.hours_worked} hours</span>}
                              {pay.date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {format(new Date(pay.date), 'MMM d, yyyy')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {staffPay.length === 0 && (
                    <div className="text-center py-12">
                      <Wallet className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-700" />
                      <p className="text-slate-500 dark:text-slate-400">No staff pay records yet</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="critical-path" className="mt-0 space-y-4">
                <CriticalPathView tasks={tasks} subtasks={subtasks} />
              </TabsContent>
            </div> {/* End of new wrapper div for TabsContent */}
          </Tabs>
        </DialogContent>
      </Dialog>

      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        programId={program?.id}
        onSave={(taskData) => createTaskMutation.mutate(taskData)}
      />

      <NoteDialog
        open={noteDialogOpen}
        onOpenChange={setNoteDialogOpen}
        programId={program?.id}
        onSave={(noteData) => createNoteMutation.mutate(noteData)}
      />

      <ExpenseDialog
        open={expenseDialogOpen}
        onOpenChange={setExpenseDialogOpen}
        programId={program?.id}
        onSave={(expenseData) => createExpenseMutation.mutate(expenseData)}
      />

      <StaffPayDialog
        open={staffPayDialogOpen}
        onOpenChange={setStaffPayDialogOpen}
        programId={program?.id}
        onSave={(staffPayData) => createStaffPayMutation.mutate(staffPayData)}
      />

      <TaskDetailDialog
        open={taskDetailDialogOpen}
        onOpenChange={setTaskDetailDialogOpen}
        task={selectedTask}
        programId={program?.id}
        onUpdate={() => queryClient.invalidateQueries({ queryKey: ["tasks", program?.id] })}
      />

      <NoteDetailDialog
        open={noteDetailDialogOpen}
        onOpenChange={setNoteDetailDialogOpen}
        note={selectedNote}
        programId={program?.id}
        onUpdate={() => queryClient.invalidateQueries({ queryKey: ["notes", program?.id] })}
      />

      <ExpenseDetailDialog
        open={expenseDetailDialogOpen}
        onOpenChange={setExpenseDetailDialogOpen}
        expense={selectedExpense}
        programId={program?.id}
        onUpdate={() => queryClient.invalidateQueries({ queryKey: ["expenses", program?.id] })}
      />

      <StaffPayDetailDialog
        open={staffPayDetailDialogOpen}
        onOpenChange={setStaffPayDetailDialogOpen}
        staffPay={selectedStaffPay}
        programId={program?.id}
        onUpdate={() => queryClient.invalidateQueries({ queryKey: ["staffPay", program?.id] })}
      />
    </>
  );
}
