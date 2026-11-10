import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  ListChecks,
  TrendingUp,
  TrendingDown
} from "lucide-react";

export default function MetricsWidget({ programs = [], tasks = [], expenses = [], staffPay = [] }) {
  // Calculate metrics
  const totalPrograms = programs.length;
  const completedPrograms = programs.filter(p => p.status === 'done').length;
  const inProgressPrograms = programs.filter(p => p.status === 'in_progress').length;
  
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const overdueTasks = tasks.filter(t => {
    if (!t.due_date || t.completed) return false;
    return new Date(t.due_date) < new Date();
  }).length;
  
  const totalBudget = programs.reduce((sum, p) => sum + (p.budget || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalStaffPay = staffPay.reduce((sum, s) => sum + (s.amount || 0), 0);
  const totalSpent = totalExpenses + totalStaffPay;
  const budgetRemaining = totalBudget - totalSpent;
  const budgetUsedPercent = totalBudget > 0 ? (totalSpent / totalBudget * 100).toFixed(1) : 0;

  const pendingExpenses = expenses.filter(e => e.status === 'pending').length;
  const completionRate = totalPrograms > 0 ? ((completedPrograms / totalPrograms) * 100).toFixed(1) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Program Completion */}
      <Card className="dark:bg-slate-900 dark:border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Programs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900 dark:text-white">
                {completedPrograms}/{totalPrograms}
              </span>
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                {completionRate}%
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {inProgressPrograms} in progress
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tasks Status */}
      <Card className="dark:bg-slate-900 dark:border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
            <ListChecks className="w-4 h-4" />
            Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900 dark:text-white">
                {completedTasks}/{totalTasks}
              </span>
            </div>
            {overdueTasks > 0 && (
              <div className="flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-red-500" />
                <p className="text-xs text-red-600 dark:text-red-400">
                  {overdueTasks} overdue
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Budget Status */}
      <Card className="dark:bg-slate-900 dark:border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Budget
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900 dark:text-white">
                {budgetUsedPercent}%
              </span>
              {budgetUsedPercent > 90 ? (
                <TrendingUp className="w-4 h-4 text-red-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-emerald-500" />
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ${budgetRemaining.toLocaleString()} remaining
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Pending Approvals */}
      <Card className="dark:bg-slate-900 dark:border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Pending
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900 dark:text-white">
                {pendingExpenses}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Expenses awaiting approval
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}