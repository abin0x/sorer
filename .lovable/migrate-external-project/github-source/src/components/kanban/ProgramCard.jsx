import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, AlertCircle, MapPin, Clock, Users, CalendarCheck, CalendarClock, ListTodo, FileText, DollarSign, UserPlus, MessageSquare } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { cn } from "@/lib/utils";

const priorityConfig = {
  low: { color: "bg-green-100 text-green-700 border-green-200", label: "Low" },
  medium: { color: "bg-amber-100 text-amber-700 border-amber-200", label: "Medium" },
  high: { color: "bg-red-100 text-red-700 border-red-200", label: "High" }
};

export default function ProgramCard({ program, onClick, isDragging }) {
  const priority = priorityConfig[program.priority] || priorityConfig.medium;
  const dueDate = program.due_date ? new Date(program.due_date) : null;
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate) && program.status !== 'done';
  
  const suggestedStartDate = program.suggested_start_date ? new Date(program.suggested_start_date) : null;
  const completedDate = program.completed_date ? new Date(program.completed_date) : null;



  return (
    <Card 
      className={cn(
        "cursor-pointer hover:shadow-lg transition-all duration-200 border-slate-200 bg-white group",
        isDragging && "opacity-50 rotate-2 scale-105"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header with Title and Priority */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-slate-900 text-sm leading-tight flex-1">
              {program.title}
            </h3>
            <Badge 
              variant="secondary" 
              className={cn("text-xs border", priority.color)}
            >
              {priority.label}
            </Badge>
          </div>

          {/* Season and Branch */}
          <div className="flex flex-wrap gap-1.5">
            {program.season && (
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                {program.season}
              </Badge>
            )}
            {program.branch && (
              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                {program.branch}
              </Badge>
            )}
            {program.budget && (
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                ${program.budget.toLocaleString()}
              </Badge>
            )}
          </div>

          {/* Important Dates */}
          {(suggestedStartDate || dueDate || completedDate) && (
            <div className="flex flex-wrap gap-2 text-xs">
              {suggestedStartDate && (
                <div className="flex items-center gap-1.5 text-green-700 bg-green-50 px-2 py-1 rounded">
                  <CalendarCheck className="w-3 h-3" />
                  <span>Start: {format(suggestedStartDate, "MMM d")}</span>
                </div>
              )}
              {dueDate && (
                <div className="flex items-center gap-1.5 text-orange-700 bg-orange-50 px-2 py-1 rounded">
                  <CalendarClock className="w-3 h-3" />
                  <span>Due: {format(dueDate, "MMM d")}</span>
                </div>
              )}
              {completedDate && (
                <div className="flex items-center gap-1.5 text-green-700 bg-green-50 px-2 py-1 rounded">
                  <CalendarCheck className="w-3 h-3" />
                  <span>Completed: {format(completedDate, "MMM d")}</span>
                </div>
              )}
            </div>
          )}

          {/* Program Details */}
          <div className="space-y-1.5 text-xs text-slate-600">
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



          {/* Footer with Gender and Assignee */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              {program.gender_eligibility && (
                <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-700">
                  {program.gender_eligibility}
                </Badge>
              )}
            </div>
            
            {program.assignee && (
              <div className="flex items-center gap-1.5 text-slate-600">
                <User className="w-3 h-3" />
                <span className="text-xs truncate max-w-[80px]">
                  {program.assignee.split('@')[0]}
                </span>
              </div>
            )}
          </div>

          {/* Quick Actions - Only show on hover */}
          <div className="mt-2 pt-2 border-t border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="text-xs text-slate-500 mb-1">Quick Actions</div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs hover:bg-slate-100"
                onClick={onClick}
              >
                View Details
              </Button>
            </div>
          </div>

          {/* Overdue Warning */}
          {isOverdue && (
            <div className="flex items-center gap-1.5 text-red-600 text-xs font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Overdue: {format(dueDate, "MMM d")}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}