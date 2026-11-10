import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

export default function BudgetTracker({ program, expenses = [] }) {
  const budget = program?.budget || 0;
  const approvedExpenses = expenses.filter(e => e.status === "approved");
  const pendingExpenses = expenses.filter(e => e.status === "pending");
  
  const totalApproved = approvedExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalPending = pendingExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalSpent = totalApproved;
  const committed = totalApproved + totalPending;
  const remaining = budget - committed;
  const percentSpent = budget > 0 ? (totalSpent / budget) * 100 : 0;
  const percentCommitted = budget > 0 ? (committed / budget) * 100 : 0;

  const getStatusColor = () => {
    if (percentCommitted > 100) return "text-red-600";
    if (percentCommitted > 90) return "text-amber-600";
    if (percentCommitted > 75) return "text-yellow-600";
    return "text-green-600";
  };

  const getStatusIcon = () => {
    if (percentCommitted > 100) return <AlertTriangle className="w-5 h-5" />;
    if (remaining > 0) return <TrendingUp className="w-5 h-5" />;
    return <TrendingDown className="w-5 h-5" />;
  };

  if (!budget) {
    return (
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="pt-6 text-center">
          <DollarSign className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-600 text-sm">No budget set for this program</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-slate-200">
      <CardHeader className="border-b border-slate-100">
        <CardTitle className="flex items-center gap-2 text-lg">
          <DollarSign className="w-5 h-5" />
          Budget Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Budget Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900">
              ${budget.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 mt-1">Total Budget</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              ${totalSpent.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 mt-1">Spent</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">
              ${totalPending.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 mt-1">Pending</div>
          </div>
          
          <div className="text-center">
            <div className={`text-2xl font-bold ${getStatusColor()}`}>
              ${remaining.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 mt-1">Remaining</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Budget Usage</span>
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className={`font-semibold ${getStatusColor()}`}>
                {percentCommitted.toFixed(1)}%
              </span>
            </div>
          </div>
          <Progress 
            value={Math.min(percentCommitted, 100)} 
            className="h-3"
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>Approved: {percentSpent.toFixed(1)}%</span>
            <span>Committed: {percentCommitted.toFixed(1)}%</span>
          </div>
        </div>

        {/* Status Alert */}
        {percentCommitted > 90 && (
          <div className={`p-3 rounded-lg border ${
            percentCommitted > 100 
              ? 'bg-red-50 border-red-200' 
              : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-start gap-2">
              <AlertTriangle className={`w-4 h-4 mt-0.5 ${
                percentCommitted > 100 ? 'text-red-600' : 'text-amber-600'
              }`} />
              <div>
                <p className={`text-sm font-semibold ${
                  percentCommitted > 100 ? 'text-red-900' : 'text-amber-900'
                }`}>
                  {percentCommitted > 100 ? 'Budget Exceeded' : 'Budget Warning'}
                </p>
                <p className={`text-xs ${
                  percentCommitted > 100 ? 'text-red-700' : 'text-amber-700'
                }`}>
                  {percentCommitted > 100 
                    ? `Over budget by $${Math.abs(remaining).toLocaleString()}`
                    : `Only $${remaining.toLocaleString()} remaining in budget`
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Expense Breakdown */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-slate-900 text-sm">Expenses</h4>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs">
                {approvedExpenses.length} Approved
              </Badge>
              {pendingExpenses.length > 0 && (
                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                  {pendingExpenses.length} Pending
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}