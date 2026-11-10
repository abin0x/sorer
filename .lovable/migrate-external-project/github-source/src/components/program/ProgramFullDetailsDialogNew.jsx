import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Edit, X, Calendar, Clock, MapPin, Users, DollarSign, 
  CheckCircle2, ListTodo, StickyNote, Receipt, Wallet, 
  MessageSquare, TrendingUp, Target, FileText, Send, Star, Sparkles, AlertTriangle
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
import TeamChat from "../chat/TeamChat";
import DocumentManager from "../documents/DocumentManager";
import TimeTracker from "../time/TimeTracker";
import FeedbackDialog from "./FeedbackDialog";
import AITaskBreakdown from "../ai/AITaskBreakdown";
import ProgressSummaryWidget from "../ai/ProgressSummaryWidget";
import RealtimeCollaboration from "../collaboration/RealtimeCollaboration";
import BudgetForecastWidget from "./BudgetForecastWidget";
import CostOverrunAlert from "./CostOverrunAlert";
import RiskDashboard from "../risk/RiskDashboard";
import ResourceAllocationVisualizer from "../resource/ResourceAllocationVisualizer";
import { toast } from "sonner";

export default function ProgramFullDetailsDialog({ open, onOpenChange, program, onEdit, currentUser }) {
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [staffPayDialogOpen, setStaffPayDialogOpen] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedNote, setSelectedNote] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [selectedStaffPay, setSelectedStaffPay] = useState(null);

  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [noteDetailOpen, setNoteDetailOpen] = useState(false);
  const [expenseDetailOpen, setExpenseDetailOpen] = useState(false);
  const [staffPayDetailOpen, setStaffPayDetailOpen] = useState(false);
  const [aiTaskDialogOpen, setAiTaskDialogOpen] = useState(false);
  const [projectRisks, setProjectRisks] = useState(null);
  const [resourceData, setResourceData] = useState(null);

  const queryClient = useQueryClient();

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", program?.id],
    queryFn: () => base44.entities.Task.filter({ program_id: program.id }),
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

  const loadProjectRisks = async () => {
    try {
      const response = await base44.functions.invoke('identifyProjectRisks');
      const programRisks = response.data.risks.filter(r => r.programId === program.id);
      setProjectRisks(programRisks);
    } catch (error) {
      console.error('Error loading risks:', error);
    }
  };

  const loadResourceData = async () => {
    try {
      const response = await base44.functions.invoke('suggestResourceAllocation', { programId: program.id });
      setResourceData(response.data);
    } catch (error) {
      console.error('Error loading resources:', error);
    }
  };

  const createTaskMutation = useMutation({
    mutationFn: (taskData) => base44.entities.Task.create(taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", program?.id] });
      toast.success("Task created");
      setTaskDialogOpen(false);
    },
  });

  const createNoteMutation = useMutation({
    mutationFn: (noteData) => base44.entities.Note.create(noteData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", program?.id] });
      toast.success("Note created");
      setNoteDialogOpen(false);
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: (expenseData) => base44.entities.Expense.create(expenseData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", program?.id] });
      toast.success("Expense created");
      setExpenseDialogOpen(false);
    },
  });

  const createStaffPayMutation = useMutation({
    mutationFn: (staffPayData) => base44.entities.StaffPay.create(staffPayData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staffPay", program?.id] });
      toast.success("Staff pay created");
      setStaffPayDialogOpen(false);
    },
  });

  const createFeedbackMutation = useMutation({
    mutationFn: (feedbackData) => base44.entities.ProgramFeedback.create(feedbackData),
    onSuccess: () => {
      toast.success("Feedback submitted successfully!");
      setFeedbackDialogOpen(false);
    },
  });

  if (!program) return null;

  const statusConfig = {
    todo: { label: "To Do", color: "bg-slate-100 text-slate-700" },
    in_progress: { label: "In Progress", color: "bg-blue-50 text-blue-700 border border-blue-200" },
    in_review: { label: "In Review", color: "bg-amber-50 text-amber-700 border border-amber-200" },
    done: { label: "Done", color: "bg-emerald-50 text-emerald-700 border border-emerald-200" }
  };

  const priorityConfig = {
    low: { color: "bg-slate-50 text-slate-600 border border-slate-200" },
    medium: { color: "bg-amber-50 text-amber-700 border border-amber-200" },
    high: { color: "bg-red-50 text-red-700 border border-red-200" }
  };

  const completedTasks = tasks.filter(t => t.completed).length;
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalStaffPay = staffPay.reduce((sum, s) => sum + (s.amount || 0), 0);
  const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] h-[95vh] p-0 gap-0 bg-white">
          {/* Header — ADISAL: clean white, navy text, uppercase meta */}
          <div className="sticky top-0 z-10 bg-white border-b border-slate-200 p-6 flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-extrabold text-slate-900 mb-2">{program.title}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <RealtimeCollaboration programId={program?.id} currentUser={currentUser} />
                <span className={`status-pill ${statusConfig[program.status]?.color}`}>
                  {statusConfig[program.status]?.label}
                </span>
                {program.priority && (
                  <span className={`status-pill ${priorityConfig[program.priority]?.color}`}>
                    {program.priority} priority
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              {program.assignee && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await base44.integrations.Core.SendEmail({
                        to: program.assignee,
                        subject: `Reminder: ${program.title}`,
                        body: `This is a reminder about the program: ${program.title}\n\nDue Date: ${program.due_date || 'Not set'}\nStatus: ${program.status}\n\nPlease check the program details in the system.`
                      });
                      toast.success("Reminder sent!");
                    } catch (error) {
                      toast.error("Failed to send reminder");
                    }
                  }}
                  className="border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Remind
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setFeedbackDialogOpen(true)}
                className="border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <Star className="w-3.5 h-3.5 mr-1.5" />
                Feedback
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEdit(program)}
                className="border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <Edit className="w-3.5 h-3.5 mr-1.5" />
                Edit
              </Button>
              <Button
                size="sm"
                onClick={() => setAiTaskDialogOpen(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white"
              >
               Automate Tasks
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="text-slate-500 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Main Info */}
              <div className="lg:col-span-2 space-y-6">
                {/* Alerts and Forecasts */}
                <div className="space-y-4">
                  <CostOverrunAlert 
                    program={program}
                    expenses={expenses}
                    staffPay={staffPay}
                    timeEntries={[]}
                  />

                  {projectRisks && projectRisks.length > 0 && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="font-bold text-red-900 mb-2">⚠️ {projectRisks.length} Risk(s) Identified</p>
                      {projectRisks.slice(0, 2).map((risk, idx) => (
                        <p key={idx} className="text-sm text-red-800 dark:text-red-200 mb-1">
                          • {risk.title}: {risk.description.substring(0, 50)}...
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                {/* Stats Cards — ADISAL metric tiles */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="metric-card text-center">
                    <ListTodo className="w-5 h-5 mx-auto text-slate-400 mb-2" />
                    <p className="text-2xl font-extrabold text-slate-900">{completedTasks}/{tasks.length}</p>
                    <p className="text-[10px] font-bold tracking-wider uppercase text-slate-500 mt-0.5">Tasks Done</p>
                  </div>
                  <div className="metric-card text-center">
                    <Receipt className="w-5 h-5 mx-auto text-slate-400 mb-2" />
                    <p className="text-2xl font-extrabold text-slate-900">${totalExpenses.toFixed(0)}</p>
                    <p className="text-[10px] font-bold tracking-wider uppercase text-slate-500 mt-0.5">Expenses</p>
                  </div>
                  <div className="metric-card text-center">
                    <Wallet className="w-5 h-5 mx-auto text-slate-400 mb-2" />
                    <p className="text-2xl font-extrabold text-slate-900">${totalStaffPay.toFixed(0)}</p>
                    <p className="text-[10px] font-bold tracking-wider uppercase text-slate-500 mt-0.5">Staff Pay</p>
                  </div>
                  <div className="metric-card text-center" style={{ borderColor: "hsl(157 47% 42% / 0.5)" }}>
                    <Target className="w-5 h-5 mx-auto mb-2" style={{ color: "hsl(157 47% 42%)" }} />
                    <p className="text-2xl font-extrabold" style={{ color: "hsl(157 47% 42%)" }}>{completionRate}%</p>
                    <p className="text-[10px] font-bold tracking-wider uppercase text-slate-500 mt-0.5">Complete</p>
                  </div>
                </div>

                {/* Budget Forecast */}
                <BudgetForecastWidget program={program} currentUser={currentUser} />

                {/* Program Details */}
                <ProgressSummaryWidget programId={program?.id} programTitle={program?.title} />

                <Card className="adisal-card">
                  <CardContent className="pt-6">
                    <h3 className="section-title mb-4 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Program Details
                    </h3>
                    {program.description && (
                      <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                        <p className="text-sm font-medium text-slate-700 mb-1">Description</p>
                        <p className="text-sm text-slate-600">{program.description}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {program.season && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-500" />
                          <span className="font-medium">Season:</span>
                          <span>{program.season}</span>
                        </div>
                      )}
                      {program.branches && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-slate-500" />
                          <span className="font-medium">Branches:</span>
                          <div className="flex flex-wrap gap-1">
                            {program.branches.map((b, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{b}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {program.assignee && (
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-slate-500" />
                          <span className="font-medium">Lead:</span>
                          <span>{program.assignee}</span>
                        </div>
                      )}
                      {program.budget && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-slate-500" />
                          <span className="font-medium">Budget:</span>
                          <span>${program.budget.toLocaleString()}</span>
                        </div>
                      )}
                      {program.suggested_start_date && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-slate-500" />
                          <span className="font-medium">Start:</span>
                          <span>{format(new Date(program.suggested_start_date), 'MMM d, yyyy')}</span>
                        </div>
                      )}
                      {program.due_date && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-slate-500" />
                          <span className="font-medium">Due:</span>
                          <span>{format(new Date(program.due_date), 'MMM d, yyyy')}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Tasks */}
                <Card className="adisal-card">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="section-title flex items-center gap-2">
                        <ListTodo className="w-4 h-4" />
                        Tasks ({tasks.length})
                      </h3>
                      <Button size="sm" variant="outline" onClick={() => setTaskDialogOpen(true)} className="border-slate-200">
                        Add Task
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {tasks.map((task) => (
                        <div
                          key={task.id}
                          className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                          onClick={() => { setSelectedTask(task); setTaskDetailOpen(true); }}
                        >
                          <div className="flex items-center gap-2">
                            {task.completed ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
                            )}
                            <span className={`flex-1 ${task.completed ? 'line-through text-slate-500' : ''}`}>
                              {task.title}
                            </span>
                            {task.due_date && (
                              <span className="text-xs text-slate-500">
                                {format(new Date(task.due_date), 'MMM d')}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {tasks.length === 0 && (
                        <p className="text-center py-8 text-slate-500">No tasks yet</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Staff Pay, Time Tracking, Documents */}
                <Card className="adisal-card">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="section-title flex items-center gap-2">
                        <Wallet className="w-4 h-4" />
                        Staff Pay
                      </h3>
                      <Button size="sm" variant="outline" onClick={() => setStaffPayDialogOpen(true)} className="border-slate-200">
                        Add Payment
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {staffPay.slice(0, 3).map((pay) => (
                        <div
                          key={pay.id}
                          className="p-2 bg-emerald-50 rounded text-sm hover:bg-emerald-100 cursor-pointer flex justify-between"
                          onClick={() => { setSelectedStaffPay(pay); setStaffPayDetailOpen(true); }}
                        >
                          <span className="truncate">{pay.staff_name}</span>
                          <span className="font-bold">${pay.amount}</span>
                        </div>
                      ))}
                      {staffPay.length === 0 && (
                        <p className="text-center py-4 text-slate-500 text-sm">No staff payments yet</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <TimeTracker programId={program?.id} currentUser={currentUser} />

                <DocumentManager programId={program?.id} currentUser={currentUser} />
              </div>

              {/* Right Column - Quick Actions */}
              <div className="lg:col-span-1 space-y-4">
                <Card className="adisal-card sticky top-6">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button
                      onClick={loadProjectRisks}
                      variant="outline"
                      className="w-full justify-start text-sm"
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      View Risks
                    </Button>
                    <Button
                      onClick={loadResourceData}
                      variant="outline"
                      className="w-full justify-start text-sm"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Resource Plan
                    </Button>
                  </CardContent>
                </Card>

                {projectRisks && projectRisks.length > 0 && (
                  <Card className="adisal-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Project Risks</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {projectRisks.map((risk, idx) => (
                          <div key={idx} className="p-2 bg-red-50 dark:bg-red-950 rounded border border-red-200 dark:border-red-800">
                            <p className="text-xs font-bold text-red-900 dark:text-red-100">{risk.title}</p>
                            <p className="text-xs text-red-700 dark:text-red-300 mt-1">{risk.recommendation}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="adisal-card sticky top-96">
                  <CardContent className="pt-6">
                    <h3 className="section-title mb-4 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Team Chat
                    </h3>
                    <TeamChat program={program} currentUser={currentUser} />
                  </CardContent>
                </Card>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Sub-dialogs */}
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
        open={taskDetailOpen}
        onOpenChange={setTaskDetailOpen}
        task={selectedTask}
        programId={program?.id}
        onUpdate={() => queryClient.invalidateQueries({ queryKey: ["tasks", program?.id] })}
      />

      <NoteDetailDialog
        open={noteDetailOpen}
        onOpenChange={setNoteDetailOpen}
        note={selectedNote}
        programId={program?.id}
        onUpdate={() => queryClient.invalidateQueries({ queryKey: ["notes", program?.id] })}
      />

      <ExpenseDetailDialog
        open={expenseDetailOpen}
        onOpenChange={setExpenseDetailOpen}
        expense={selectedExpense}
        programId={program?.id}
        onUpdate={() => queryClient.invalidateQueries({ queryKey: ["expenses", program?.id] })}
      />

      <StaffPayDetailDialog
        open={staffPayDetailOpen}
        onOpenChange={setStaffPayDetailOpen}
        staffPay={selectedStaffPay}
        programId={program?.id}
        onUpdate={() => queryClient.invalidateQueries({ queryKey: ["staffPay", program?.id] })}
      />

      <FeedbackDialog
        open={feedbackDialogOpen}
        onOpenChange={setFeedbackDialogOpen}
        program={program}
        currentUser={currentUser}
        onSubmit={(feedbackData) => createFeedbackMutation.mutate(feedbackData)}
      />

      <AITaskBreakdown
        open={aiTaskDialogOpen}
        onOpenChange={setAiTaskDialogOpen}
        program={program}
        onTasksGenerated={() => {
          queryClient.invalidateQueries({ queryKey: ["tasks", program?.id] });
        }}
      />
      </>
      );
      }