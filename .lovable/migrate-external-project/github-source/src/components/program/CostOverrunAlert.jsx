import React from "react";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

export default function CostOverrunAlert({ program, expenses, staffPay, timeEntries }) {
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalStaffPay = staffPay.reduce((sum, s) => sum + (s.amount || 0), 0);
  const actualCost = totalExpenses + totalStaffPay;
  const budget = program.budget || actualCost * 1.2;

  const isOverBudget = actualCost > budget;
  const overrunPercent = ((actualCost - budget) / budget * 100).toFixed(0);
  const utilization = (actualCost / budget * 100).toFixed(0);

  const isApproachingLimit = utilization >= 80;

  if (!isOverBudget && !isApproachingLimit) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Alert className={`border-2 ${
        isOverBudget 
          ? 'border-red-500 bg-red-50 dark:bg-red-950' 
          : 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950'
      }`}>
        <div className="flex items-start gap-3">
          <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
            isOverBudget ? 'text-red-600' : 'text-yellow-600'
          }`} />
          <div className="flex-1">
            <AlertDescription className={`${
              isOverBudget ? 'text-red-800 dark:text-red-200' : 'text-yellow-800 dark:text-yellow-200'
            }`}>
              <p className="font-bold mb-1">
                {isOverBudget ? '⚠️ Budget Overrun!' : '⚠️ Budget Approaching Limit'}
              </p>
              <p className="text-sm">
                {isOverBudget 
                  ? `Spent $${actualCost.toFixed(0)} of $${budget.toFixed(0)} (+${overrunPercent}% over)`
                  : `Spent $${actualCost.toFixed(0)} of $${budget.toFixed(0)} (${utilization}% utilized)`
                }
              </p>
            </AlertDescription>
          </div>
          <TrendingUp className={`w-5 h-5 flex-shrink-0 ${
            isOverBudget ? 'text-red-600' : 'text-yellow-600'
          }`} />
        </div>
      </Alert>
    </motion.div>
  );
}