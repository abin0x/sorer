import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingDown, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function BudgetForecastWidget({ program, currentUser }) {
  const [loading, setLoading] = useState(false);
  const [forecast, setForecast] = useState(null);

  const generateForecast = async () => {
    setLoading(true);
    try {
      const daysUntilDue = program.due_date 
        ? Math.ceil((new Date(program.due_date) - new Date()) / (1000 * 60 * 60 * 24))
        : 30;

      const { data } = await base44.functions.invoke('predictProjectBudget', {
        programId: program.id,
        programTitle: program.title,
        description: program.description,
        season: program.season,
        daysUntilDue: Math.max(0, daysUntilDue),
        teamSize: 3
      });

      setForecast(data);
      toast.success("Budget forecast generated");
    } catch (error) {
      console.error('Error generating forecast:', error);
      toast.error("Failed to generate forecast");
    } finally {
      setLoading(false);
    }
  };

  if (!forecast) {
    return (
      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-blue-600" />
            Budget Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
           Automate budget prediction based on historical project data
          </p>
          <Button
            onClick={generateForecast}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                Generate Forecast
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { estimates, currentStatus, projection, risk, comparison } = forecast;

  const getRiskColor = (level) => {
    switch(level) {
      case 'high': return 'from-red-500 to-red-600';
      case 'medium': return 'from-yellow-500 to-yellow-600';
      default: return 'from-green-500 to-green-600';
    }
  };

  const getRiskBg = (level) => {
    switch(level) {
      case 'high': return 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800';
      case 'medium': return 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800';
      default: return 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-blue-600" />
            Budget Forecast & Analysis
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Budget Estimates */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Min Budget</p>
              <p className="text-xl font-bold text-blue-900 dark:text-blue-100">${estimates.minBudget}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 p-3 rounded-lg border-2 border-blue-400 dark:border-blue-600">
              <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Estimated</p>
              <p className="text-xl font-bold text-blue-900 dark:text-blue-100">${estimates.estimatedCost}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Max Budget</p>
              <p className="text-xl font-bold text-blue-900 dark:text-blue-100">${estimates.maxBudget}</p>
            </div>
          </div>

          {/* Current Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Spent So Far</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">${currentStatus.actualCost}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{currentStatus.budgetUtilization}% of budget</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Time Spent</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{currentStatus.actualHours}h</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Progress: {currentStatus.daysElapsed}/{currentStatus.estimatedDays} days</p>
            </div>
          </div>

          {/* Projection */}
          <div className={`p-4 rounded-lg border ${
            risk.level === 'high' ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800' :
            risk.level === 'medium' ? 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800' :
            'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
          }`}>
            <div className="flex items-start gap-3">
              {risk.level === 'high' && <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />}
              {risk.level === 'medium' && <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />}
              {risk.level === 'low' && <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />}
              <div className="flex-1">
                <p className={`font-bold ${
                  risk.level === 'high' ? 'text-red-900 dark:text-red-100' :
                  risk.level === 'medium' ? 'text-yellow-900 dark:text-yellow-100' :
                  'text-green-900 dark:text-green-100'
                }`}>
                  {risk.level === 'high' ? 'High Risk' : risk.level === 'medium' ? 'Medium Risk' : 'On Track'}
                </p>
                <p className={`text-sm mt-1 ${
                  risk.level === 'high' ? 'text-red-700 dark:text-red-300' :
                  risk.level === 'medium' ? 'text-yellow-700 dark:text-yellow-300' :
                  'text-green-700 dark:text-green-300'
                }`}>
                  Projected final cost: <strong>${projection.projectedFinalCost}</strong>
                  {risk.budgetOverrun && ` (+$${risk.overrunAmount} overrun)`}
                </p>
              </div>
            </div>
          </div>

          {/* Burn Rate */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-400">Burn Rate</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">${projection.burnRate}/day</p>
            </div>
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-400">Similar Projects (avg)</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">${comparison.avgCostPerDay}/day</p>
            </div>
          </div>

          {/* AI Forecast */}
          <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-lg border border-purple-200 dark:border-purple-800">
            <p className="text-xs text-purple-700 dark:text-purple-300 font-semibold mb-2">AI Forecast</p>
            <p className="text-sm text-purple-900 dark:text-purple-100 leading-relaxed whitespace-pre-wrap">
              {forecast.forecast}
            </p>
          </div>

          <Button
            onClick={generateForecast}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Refresh Forecast
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}