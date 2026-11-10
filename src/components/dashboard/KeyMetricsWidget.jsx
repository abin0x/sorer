import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, AlertTriangle, TrendingUp, DollarSign, Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function KeyMetricsWidget({ programs, tasks, expenses, staffPay }) {
  const completedPrograms = programs.filter(p => p.status === 'done').length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const overduePrograms = programs.filter(p => {
    if (!p.due_date || p.status === 'done') return false;
    return new Date(p.due_date) < new Date();
  }).length;
  const overdueTasks = tasks.filter(t => {
    if (!t.due_date || t.completed) return false;
    return new Date(t.due_date) < new Date();
  }).length;
  
  const totalBudget = programs.reduce((sum, p) => sum + (p.budget || 0), 0);
  const totalSpent = expenses
    .filter(e => e.status === 'approved')
    .reduce((sum, e) => sum + (e.amount || 0), 0) +
    staffPay.reduce((sum, sp) => sum + (sp.amount || 0), 0);
  
  const budgetUtilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const completionRate = programs.length > 0 ? (completedPrograms / programs.length) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Tasks Completed */}
      <Card className="dark:bg-slate-900 dark:border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            Tasks Completed
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-end justify-between">
            <div className="text-3xl font-bold text-slate-900 dark:text-white">
              {completedTasks}/{tasks.length}
            </div>
            <div className="text-sm text-slate-500">
              {tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0}%
            </div>
          </div>
          <Progress value={tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0} className="h-2" />
        </CardContent>
      </Card>

      {/* Overdue Items */}
      <Card className="dark:bg-slate-900 dark:border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            Overdue Items
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-3xl font-bold text-red-600 dark:text-red-400">
            {overduePrograms + overdueTasks}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {overduePrograms} programs, {overdueTasks} tasks
          </div>
        </CardContent>
      </Card>

      {/* Budget Status */}
      <Card className="dark:bg-slate-900 dark:border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-blue-600" />
            Budget Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-end justify-between">
            <div className="text-3xl font-bold text-slate-900 dark:text-white">
              ${totalSpent.toLocaleString()}
            </div>
            <div className="text-sm text-slate-500">
              of ${totalBudget.toLocaleString()}
            </div>
          </div>
          <Progress 
            value={budgetUtilization} 
            className={`h-2 ${budgetUtilization > 90 ? 'bg-red-200' : budgetUtilization > 75 ? 'bg-amber-200' : ''}`}
          />
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {budgetUtilization.toFixed(1)}% utilized
          </div>
        </CardContent>
      </Card>

      {/* Program Completion */}
      <Card className="dark:bg-slate-900 dark:border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-600" />
            Program Completion
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-end justify-between">
            <div className="text-3xl font-bold text-slate-900 dark:text-white">
              {completedPrograms}/{programs.length}
            </div>
            <div className="text-sm text-slate-500">
              {completionRate.toFixed(0)}%
            </div>
          </div>
          <Progress value={completionRate} className="h-2" />
        </CardContent>
      </Card>

      {/* In Progress */}
      <Card className="dark:bg-slate-900 dark:border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            In Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {programs.filter(p => p.status === 'in_progress').length}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Active programs
          </div>
        </CardContent>
      </Card>

      {/* Task Success Rate */}
      <Card className="dark:bg-slate-900 dark:border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            Task Success Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {tasks.length > 0 ? ((completedTasks / tasks.length) * 100).toFixed(0) : 0}%
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Overall completion
          </div>
        </CardContent>
      </Card>
    </div>
  );
}