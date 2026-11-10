import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Calendar, 
  User, 
  MapPin, 
  Clock, 
  Users, 
  Edit,
  ListTodo,
  FileText,
  DollarSign,
  UserPlus,
  MessageSquare,
  Wallet
} from "lucide-react";
import { format } from "date-fns";
import BudgetTracker from "./BudgetTracker";
import CommunicationPanel from "./CommunicationPanel";
import TaskDetailDialog from "../dialogs/TaskDetailDialog";
import NoteDetailDialog from "../dialogs/NoteDetailDialog";
import ExpenseDetailDialog from "../dialogs/ExpenseDetailDialog";
import StaffPayDetailDialog from "../dialogs/StaffPayDetailDialog";
import MessageDetailDialog from "../dialogs/MessageDetailDialog";

export default function ProgramDetailsDialog({ 
  open, 
  onOpenChange, 
  program, 
  onEdit,
  currentUser 
}) {
  const [activeTab, setActiveTab] = useState("overview");
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

  // Check if program has _openTab property to auto-open specific tab
  React.useEffect(() => {
    if (program?._openTab) {
      const tabMap = {
        'add_tasks': 'tasks',
        'add_expenses': 'expenses',
        'add_notes': 'notes',
        'add_staffpay': 'staffpay'
      };
      setActiveTab(tabMap[program._openTab] || 'overview');
    } else {
      setActiveTab('overview');
    }
  }, [program]);

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", program?.id],
    queryFn: () => base44.entities.Task.filter({ program_id: program?.id }),
    enabled: !!program?.id,
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["notes", program?.id],
    queryFn: () => base44.entities.Note.filter({ program_id: program?.id }),
    enabled: !!program?.id,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses", program?.id],
    queryFn: () => base44.entities.Expense.filter({ program_id: program?.id }),
    enabled: !!program?.id,
  });

  const { data: staffPay = [] } = useQuery({
    queryKey: ["staffpay", program?.id],
    queryFn: () => base44.entities.StaffPay.filter({ program_id: program?.id }),
    enabled: !!program?.id,
  });

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setTaskDialogOpen(true);
  };

  const handleNoteClick = (note) => {
    setSelectedNote(note);
    setNoteDialogOpen(true);
  };

  const handleExpenseClick = (expense) => {
    setSelectedExpense(expense);
    setExpenseDialogOpen(true);
  };

  const handleStaffPayClick = (staffPay) => {
    setSelectedStaffPay(staffPay);
    setStaffPayDialogOpen(true);
  };

  const handleMessageClick = (message) => {
    setSelectedMessage(message);
    setMessageDialogOpen(true);
  };

  if (!program) return null;

  // Calculate budget metrics
  const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const approvedExpenses = expenses
    .filter(exp => exp.status === 'approved')
    .reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const pendingExpenses = expenses
    .filter(exp => exp.status === 'pending')
    .reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const budgetRemaining = (program.budget || 0) - approvedExpenses;
  const budgetUsagePercent = program.budget ? (approvedExpenses / program.budget) * 100 : 0;

  const priorityConfig = {
    low: { label: "Low", color: "bg-green-100 text-green-700" },
    medium: { label: "Medium", color: "bg-amber-100 text-amber-700" },
    high: { label: "High", color: "bg-red-100 text-red-700" }
  };

  const statusConfig = {
    todo: { label: "To Do", color: "bg-slate-100 text-slate-700" },
    in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700" },
    in_review: { label: "In Review", color: "bg-amber-100 text-amber-700" },
    done: { label: "Done", color: "bg-green-100 text-green-700" }
  };

  const priority = priorityConfig[program.priority] || priorityConfig.medium;
  const status = statusConfig[program.status] || statusConfig.todo;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1200px] max-h-[95vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold text-slate-900 mb-2">
                {program.title}
              </DialogTitle>
              <div className="flex flex-wrap gap-2">
                <Badge className={priority.color}>{priority.label}</Badge>
                <Badge className={status.color}>{status.label}</Badge>
                {program.season && (
                  <Badge variant="outline">{program.season}</Badge>
                )}
                {program.branch && (
                  <Badge variant="outline">{program.branch}</Badge>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onEdit(program);
                onOpenChange(false);
              }}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Program
            </Button>
          </div>
        </DialogHeader>

        <div className="px-6 pb-6 overflow-y-auto max-h-[calc(95vh-100px)]">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-7 mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="tasks">
                Tasks ({tasks.length})
              </TabsTrigger>
              <TabsTrigger value="notes">
                Notes ({notes.length})
              </TabsTrigger>
              <TabsTrigger value="expenses">
                Expenses ({expenses.length})
              </TabsTrigger>
              <TabsTrigger value="staffpay">
                Staff Pay ({staffPay.length})
              </TabsTrigger>
              <TabsTrigger value="budget">Budget</TabsTrigger>
              <TabsTrigger value="communication">Chat</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Program Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {program.description && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-2">Description</h4>
                      <p className="text-slate-600">{program.description}</p>
                    </div>
                  )}

                  {/* Budget Summary */}
                  {program.budget && (
                    <div className="p-4 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-lg border border-slate-200">
                      <h4 className="text-sm font-semibold text-slate-700 mb-3">Budget Overview</h4>
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-slate-600 mb-1">Total Budget</p>
                          <p className="text-lg font-bold text-slate-900">${program.budget.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-600 mb-1">Spent</p>
                          <p className="text-lg font-bold text-red-600">${approvedExpenses.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-600 mb-1">Pending</p>
                          <p className="text-lg font-bold text-amber-600">${pendingExpenses.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-600 mb-1">Remaining</p>
                          <p className="text-lg font-bold text-emerald-600">${budgetRemaining.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-slate-600 mb-1">
                          <span>Budget Usage</span>
                          <span>{budgetUsagePercent.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all ${
                              budgetUsagePercent > 90 ? 'bg-red-600' :
                              budgetUsagePercent > 75 ? 'bg-amber-500' :
                              'bg-emerald-600'
                            }`}
                            style={{ width: `${Math.min(budgetUsagePercent, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {program.program_dates && (
                      <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 text-slate-500 mt-0.5" />
                        <div>
                          <p className="text-xs text-slate-500">Program Dates</p>
                          <p className="text-sm text-slate-900">{program.program_dates}</p>
                        </div>
                      </div>
                    )}

                    {program.program_time && (
                      <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 text-slate-500 mt-0.5" />
                        <div>
                          <p className="text-xs text-slate-500">Time</p>
                          <p className="text-sm text-slate-900">{program.program_time}</p>
                        </div>
                      </div>
                    )}

                    {program.field_location && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-slate-500 mt-0.5" />
                        <div>
                          <p className="text-xs text-slate-500">Location</p>
                          <p className="text-sm text-slate-900">{program.field_location}</p>
                        </div>
                      </div>
                    )}

                    {program.age_eligibility && (
                      <div className="flex items-start gap-2">
                        <Users className="w-4 h-4 text-slate-500 mt-0.5" />
                        <div>
                          <p className="text-xs text-slate-500">Age Eligibility</p>
                          <p className="text-sm text-slate-900">{program.age_eligibility}</p>
                        </div>
                      </div>
                    )}

                    {program.assignee && (
                      <div className="flex items-start gap-2">
                        <User className="w-4 h-4 text-slate-500 mt-0.5" />
                        <div>
                          <p className="text-xs text-slate-500">Assigned To</p>
                          <p className="text-sm text-slate-900">{program.assignee}</p>
                        </div>
                      </div>
                    )}

                    {program.due_date && (
                      <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 text-slate-500 mt-0.5" />
                        <div>
                          <p className="text-xs text-slate-500">Due Date</p>
                          <p className="text-sm text-slate-900">
                            {format(new Date(program.due_date), "PPP")}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tasks">
              <div className="space-y-2">
                {tasks.length === 0 ? (
                  <p className="text-center py-8 text-slate-500">No tasks yet</p>
                ) : (
                  tasks.map(task => (
                    <div
                      key={task.id}
                      onClick={() => handleTaskClick(task)}
                      className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                    >
                      <div className="font-medium text-slate-900 mb-1">{task.title}</div>
                      {task.description && (
                        <p className="text-sm text-slate-600 mb-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <Badge className={task.completed ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}>
                          {task.completed ? "✓ Completed" : "○ Pending"}
                        </Badge>
                        {task.assignee && (
                          <span className="text-xs text-slate-500">{task.assignee}</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="notes">
              <div className="space-y-2">
                {notes.length === 0 ? (
                  <p className="text-center py-8 text-slate-500">No notes yet</p>
                ) : (
                  notes.map(note => (
                    <div
                      key={note.id}
                      onClick={() => handleNoteClick(note)}
                      className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer"
                    >
                      <p className="text-slate-700">{note.content}</p>
                      <p className="text-xs text-slate-500 mt-2">
                        {new Date(note.created_date).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="expenses">
              <div className="space-y-2">
                {expenses.length === 0 ? (
                  <p className="text-center py-8 text-slate-500">No expenses yet</p>
                ) : (
                  expenses.map(expense => (
                    <div
                      key={expense.id}
                      onClick={() => handleExpenseClick(expense)}
                      className="p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium text-slate-900">{expense.description}</div>
                        <div className="font-bold text-orange-600">${expense.amount.toLocaleString()}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={
                          expense.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                          expense.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }>
                          {expense.status}
                        </Badge>
                        {expense.category && (
                          <span className="text-xs text-slate-500">{expense.category}</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="staffpay">
              <div className="space-y-2">
                {staffPay.length === 0 ? (
                  <p className="text-center py-8 text-slate-500">No staff pay records yet</p>
                ) : (
                  <>
                    <div className="p-4 bg-emerald-50 rounded-lg text-center mb-4">
                      <div className="text-2xl font-bold text-emerald-700">
                        ${staffPay.reduce((sum, sp) => sum + (sp.amount || 0), 0).toLocaleString()}
                      </div>
                      <div className="text-sm text-slate-600">Total Staff Pay</div>
                    </div>
                    {staffPay.map(pay => (
                      <div
                        key={pay.id}
                        onClick={() => handleStaffPayClick(pay)}
                        className="p-4 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-slate-900">{pay.staff_name}</div>
                            {pay.role && <div className="text-sm text-slate-600">{pay.role}</div>}
                          </div>
                          <div className="font-bold text-emerald-600">${pay.amount.toLocaleString()}</div>
                        </div>
                        {pay.date && (
                          <div className="text-xs text-slate-500 mt-2">
                            {new Date(pay.date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="budget">
              <BudgetTracker program={program} expenses={expenses} />
            </TabsContent>

            <TabsContent value="communication">
              <CommunicationPanel 
                program={program} 
                currentUser={currentUser}
                tasks={tasks}
              />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>

      {/* Detail Dialogs */}
      <TaskDetailDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        task={selectedTask}
        programId={program?.id}
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
    </Dialog>
  );
}