import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, AlertCircle, MapPin, Clock, Users, CalendarCheck, CalendarClock, ListTodo, FileText, DollarSign, UserPlus, Loader2, MoveRight } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const MOVE_COLUMNS = [
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "in_review", label: "In Review" },
  { id: "done", label: "Done" },
];

const priorityConfig = {
  low: { color: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900 dark:text-emerald-300 dark:border-emerald-800", label: "Low" },
  medium: { color: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900 dark:text-amber-300 dark:border-amber-800", label: "Medium" },
  high: { color: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-300 dark:border-red-800", label: "High" }
};

export default function ProgramCardEnhanced({ program, onClick, isDragging, currentUser, teamMembers = [], onMove, currentStatus }) {
  const priority = priorityConfig[program.priority] || priorityConfig.medium;
  const dueDate = program.due_date ? new Date(program.due_date) : null;
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate) && program.status !== 'done';
  
  const suggestedStartDate = program.suggested_start_date ? new Date(program.suggested_start_date) : null;
  const hasNotStartedPastSuggested = suggestedStartDate && 
    isPast(suggestedStartDate) && 
    !isToday(suggestedStartDate) && 
    !program.started_date && 
    program.status === 'todo';
  
  const completedDate = program.completed_date ? new Date(program.completed_date) : null;
  const canSeeBudget = currentUser?.role === 'admin' || currentUser?.role === 'director';

  // Resolve a staff email to a display name (falls back to the email prefix)
  const nameFor = (email) => {
    if (!email) return "";
    const m = teamMembers.find((t) => t.email === email);
    return m?.full_name || email.split("@")[0];
  };

  // Fetch related data for counts
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks", program.id],
    queryFn: () => base44.entities.Task.filter({ program_id: program.id }),
    enabled: !!program.id,
  });

  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ["expenses", program.id],
    queryFn: () => base44.entities.Expense.filter({ program_id: program.id }),
    enabled: !!program.id,
  });

  const { data: notes = [], isLoading: notesLoading } = useQuery({
    queryKey: ["notes", program.id],
    queryFn: () => base44.entities.Note.filter({ program_id: program.id }),
    enabled: !!program.id,
  });

  const { data: staffPay = [], isLoading: staffPayLoading } = useQuery({
    queryKey: ["staffpay", program.id],
    queryFn: () => base44.entities.StaffPay.filter({ program_id: program.id }),
    enabled: !!program.id,
  });

  const handleActionClick = (e, action) => {
    e.stopPropagation();
    onClick(program, `add_${action}`);
  };

  const isLoading = tasksLoading || expensesLoading || notesLoading || staffPayLoading;

  return (
    <Card 
      className={cn(
        "cursor-pointer hover:shadow-lg transition-all duration-200 group relative overflow-hidden",
        isDragging && "opacity-50 rotate-2 scale-105",
        isOverdue 
          ? "bg-red-600 text-white border-red-700 dark:bg-red-700 dark:border-red-800" 
          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
      )}
      onClick={() => onClick(program)}
    >
      {/* Red line indicator for not started past suggested date */}
      {hasNotStartedPastSuggested && !isOverdue && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-red-600 dark:bg-red-500" />
      )}
      
      <CardContent className={cn("p-4", hasNotStartedPastSuggested && !isOverdue && "pt-5")}>
        <div className="space-y-3">
          {/* Header with Title and Priority */}
          <div className="flex items-start justify-between gap-2">
            <h3 className={cn(
              "font-semibold text-sm leading-tight flex-1",
              isOverdue ? "text-white" : "text-slate-900 dark:text-white"
            )}>
              {program.title}
            </h3>
            <Badge 
              variant="secondary" 
              className={cn(
                "text-xs border",
                isOverdue 
                  ? "bg-red-800 text-white border-red-900 dark:bg-red-900 dark:text-white dark:border-red-950" 
                  : priority.color
              )}
            >
              {priority.label}
            </Badge>
          </div>

          {/* Season and Branch */}
          <div className="flex flex-wrap gap-1.5">
            {program.roadmap_task_id && (
              <Badge variant="outline" className={cn(
                "text-xs",
                isOverdue
                  ? "bg-red-700 text-white border-red-800 dark:bg-red-800 dark:text-white dark:border-red-900"
                  : "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900 dark:text-violet-300 dark:border-violet-800"
              )}>
                Roadmap
              </Badge>
            )}
            {program.season && (
              <Badge variant="outline" className={cn(
                "text-xs",
                isOverdue 
                  ? "bg-red-700 text-white border-red-800 dark:bg-red-800 dark:text-white dark:border-red-900" 
                  : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-800"
              )}>
                {program.season}
              </Badge>
            )}
            {program.branch && (
              <Badge variant="outline" className={cn(
                "text-xs",
                isOverdue 
                  ? "bg-red-700 text-white border-red-800 dark:bg-red-800 dark:text-white dark:border-red-900" 
                  : "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900 dark:text-purple-300 dark:border-purple-800"
              )}>
                {program.branch}
              </Badge>
            )}
            {canSeeBudget && program.budget && (
              <Badge variant="outline" className={cn(
                "text-xs",
                isOverdue 
                  ? "bg-red-700 text-white border-red-800 dark:bg-red-800 dark:text-white dark:border-red-900" 
                  : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900 dark:text-emerald-300 dark:border-emerald-800"
              )}>
                ${program.budget.toLocaleString()}
              </Badge>
            )}
          </div>

          {/* Important Dates */}
          {(suggestedStartDate || program.started_date || dueDate || completedDate) && (
            <div className="flex flex-wrap gap-2 text-xs">
              {suggestedStartDate && !isNaN(suggestedStartDate.getTime()) && (
                <div className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded",
                  isOverdue 
                    ? "text-white bg-red-700 dark:bg-red-800" 
                    : "text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-900"
                )}>
                  <CalendarCheck className="w-3 h-3" />
                  <span>Suggested: {format(suggestedStartDate, "MMM d")}</span>
                </div>
              )}
              {program.started_date && !isNaN(new Date(program.started_date).getTime()) && (
                <div className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded",
                  isOverdue 
                    ? "text-white bg-red-700 dark:bg-red-800" 
                    : "text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-900"
                )}>
                  <CalendarCheck className="w-3 h-3" />
                  <span>Started: {format(new Date(program.started_date), "MMM d")}</span>
                </div>
              )}
              {dueDate && !isNaN(dueDate.getTime()) && (
                <div className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded",
                  isOverdue 
                    ? "text-white bg-red-800 dark:bg-red-900 font-bold" 
                    : "text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-900"
                )}>
                  <CalendarClock className="w-3 h-3" />
                  <span>Due: {format(dueDate, "MMM d")}</span>
                </div>
              )}
              {completedDate && !isNaN(completedDate.getTime()) && (
                <div className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded",
                  isOverdue 
                    ? "text-white bg-red-700 dark:bg-red-800" 
                    : "text-green-700 bg-green-50 dark:text-green-300 dark:bg-green-900"
                )}>
                  <CalendarCheck className="w-3 h-3" />
                  <span>Completed: {format(completedDate, "MMM d")}</span>
                </div>
              )}
            </div>
          )}

          {/* Program Details */}
          <div className={cn(
            "space-y-1.5 text-xs",
            isOverdue ? "text-white/90" : "text-slate-600 dark:text-slate-300"
          )}>
            {program.program_dates && (
              <div className="flex items-start gap-1.5">
                <Calendar className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-1">{program.program_dates}</span>
              </div>
            )}
            
            {program.program_time && (
              <div className="flex items-start gap-1.5">
                <Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-1">{program.program_time}</span>
              </div>
            )}

            {program.field_location && (
              <div className="flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-1">{program.field_location}</span>
              </div>
            )}

            {program.age_eligibility && (
              <div className="flex items-start gap-1.5">
                <Users className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-1">Ages: {program.age_eligibility}</span>
              </div>
            )}
          </div>

          {/* Action Buttons with Counts */}
          <div className={cn(
            "pt-2 border-t",
            isOverdue ? "border-red-700 dark:border-red-800" : "border-slate-100 dark:border-slate-700"
          )}>
            {isLoading ? (
              <div className="flex items-center justify-center py-2">
                <Loader2 className={cn(
                  "w-4 h-4 animate-spin",
                  isOverdue ? "text-white/70" : "text-slate-400 dark:text-slate-500"
                )} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 px-2 text-xs justify-start",
                    isOverdue 
                      ? "hover:bg-red-700 text-white dark:hover:bg-red-800" 
                      : "hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-900 dark:hover:text-emerald-300"
                  )}
                  onClick={(e) => handleActionClick(e, 'tasks')}
                >
                  <ListTodo className="w-3 h-3 mr-1.5" />
                  Tasks ({tasks.length})
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 px-2 text-xs justify-start",
                    isOverdue 
                      ? "hover:bg-red-700 text-white dark:hover:bg-red-800" 
                      : "hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-900 dark:hover:text-emerald-300"
                  )}
                  onClick={(e) => handleActionClick(e, 'expenses')}
                >
                  <DollarSign className="w-3 h-3 mr-1.5" />
                  Expenses ({expenses.length})
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 px-2 text-xs justify-start",
                    isOverdue 
                      ? "hover:bg-red-700 text-white dark:hover:bg-red-800" 
                      : "hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-900 dark:hover:text-emerald-300"
                  )}
                  onClick={(e) => handleActionClick(e, 'notes')}
                >
                  <FileText className="w-3 h-3 mr-1.5" />
                  Notes ({notes.length})
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 px-2 text-xs justify-start",
                    isOverdue 
                      ? "hover:bg-red-700 text-white dark:hover:bg-red-800" 
                      : "hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-900 dark:hover:text-emerald-300"
                  )}
                  onClick={(e) => handleActionClick(e, 'staffpay')}
                >
                  <UserPlus className="w-3 h-3 mr-1.5" />
                  Staff Pay ({staffPay.length})
                </Button>
              </div>
            )}
          </div>

          {/* Footer with Gender and Assignee */}
          <div className={cn(
            "flex items-center justify-between pt-2 border-t",
            isOverdue ? "border-red-700 dark:border-red-800" : "border-slate-100 dark:border-slate-700"
          )}>
            <div className="flex items-center gap-2">
              {program.gender_eligibility && (
                <Badge variant="secondary" className={cn(
                  "text-xs",
                  isOverdue 
                    ? "bg-red-700 text-white dark:bg-red-800 dark:text-white" 
                    : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                )}>
                  {program.gender_eligibility}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {program.assignee && (
                <div className={cn(
                  "flex items-center gap-1.5",
                  isOverdue ? "text-white/90" : "text-slate-600 dark:text-slate-400"
                )}>
                  <User className="w-3 h-3" />
                  <span className="text-xs truncate max-w-[80px]">
                    {program.assignee.split('@')[0]}
                  </span>
                </div>
              )}
              {onMove && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className={cn(
                        "flex items-center gap-1 px-1.5 py-1 rounded text-xs min-h-[32px] min-w-[32px] touch-target",
                        isOverdue ? "text-white/80 hover:bg-red-700" : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-700"
                      )}
                    >
                      <MoveRight className="w-3 h-3" /> Move
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    {MOVE_COLUMNS.filter((c) => c.id !== currentStatus).map((c) => (
                      <DropdownMenuItem key={c.id} onClick={() => onMove(program, c.id)}>
                        {c.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* RACI staff summary */}
          {((program.accountable?.length || 0) + (program.responsible?.length || 0) + (program.consulted?.length || 0) + (program.informed?.length || 0)) > 0 && (
            <div className={cn(
              "flex flex-wrap items-center gap-1 pt-2 border-t",
              isOverdue ? "border-red-700 dark:border-red-800" : "border-slate-100 dark:border-slate-700"
            )}>
              {program.accountable?.length > 0 && (
                <Badge variant="outline" className={cn("text-[10px] max-w-[150px] truncate", isOverdue ? "bg-red-700 text-white border-red-800" : "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900 dark:text-violet-300 dark:border-violet-800")}>
                  A {nameFor(program.accountable[0])}{program.accountable.length > 1 ? ` +${program.accountable.length - 1}` : ""}
                </Badge>
              )}
              {program.responsible?.length > 0 && (
                <Badge variant="outline" className={cn("text-[10px] max-w-[150px] truncate", isOverdue ? "bg-red-700 text-white border-red-800" : "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900 dark:text-sky-300 dark:border-sky-800")}>
                  R {nameFor(program.responsible[0])}{program.responsible.length > 1 ? ` +${program.responsible.length - 1}` : ""}
                </Badge>
              )}
              {program.consulted?.length > 0 && (
                <Badge variant="outline" className={cn("text-[10px] max-w-[150px] truncate", isOverdue ? "bg-red-700 text-white border-red-800" : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900 dark:text-amber-300 dark:border-amber-800")}>
                  C {nameFor(program.consulted[0])}{program.consulted.length > 1 ? ` +${program.consulted.length - 1}` : ""}
                </Badge>
              )}
              {program.informed?.length > 0 && (
                <Badge variant="outline" className={cn("text-[10px] max-w-[150px] truncate", isOverdue ? "bg-red-700 text-white border-red-800" : "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700")}>
                  I {nameFor(program.informed[0])}{program.informed.length > 1 ? ` +${program.informed.length - 1}` : ""}
                </Badge>
              )}
            </div>
          )}

          {/* Overdue Warning */}
          {isOverdue && dueDate && !isNaN(dueDate.getTime()) && (
            <div className="flex items-center gap-1.5 text-white text-xs font-bold bg-red-800 dark:bg-red-900 px-2 py-1.5 rounded">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>OVERDUE: {format(dueDate, "MMM d")}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}