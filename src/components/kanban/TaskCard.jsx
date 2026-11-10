import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, AlertCircle } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { cn } from "@/lib/utils";

const priorityConfig = {
  low: { color: "bg-green-100 text-green-700 border-green-200", label: "Low" },
  medium: { color: "bg-amber-100 text-amber-700 border-amber-200", label: "Medium" },
  high: { color: "bg-red-100 text-red-700 border-red-200", label: "High" }
};

export default function TaskCard({ task, onClick, isDragging }) {
  const priority = priorityConfig[task.priority] || priorityConfig.medium;
  const dueDate = task.due_date ? new Date(task.due_date) : null;
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate) && task.status !== 'done';

  return (
    <Card 
      className={cn(
        "cursor-pointer hover:shadow-lg transition-all duration-200 border-slate-200 bg-white",
        isDragging && "opacity-50 rotate-2 scale-105"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-slate-900 text-sm leading-tight flex-1">
              {task.title}
            </h3>
            <Badge 
              variant="secondary" 
              className={cn("text-xs border", priority.color)}
            >
              {priority.label}
            </Badge>
          </div>

          {task.description && (
            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}

          <div className="flex items-center gap-3 text-xs">
            {task.assignee && (
              <div className="flex items-center gap-1.5 text-slate-600">
                <User className="w-3.5 h-3.5" />
                <span className="truncate max-w-[120px]">
                  {task.assignee.split('@')[0]}
                </span>
              </div>
            )}

            {dueDate && (
              <div className={cn(
                "flex items-center gap-1.5",
                isOverdue ? "text-red-600 font-medium" : "text-slate-600"
              )}>
                {isOverdue && <AlertCircle className="w-3.5 h-3.5" />}
                <Calendar className="w-3.5 h-3.5" />
                <span>{format(dueDate, "MMM d")}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}