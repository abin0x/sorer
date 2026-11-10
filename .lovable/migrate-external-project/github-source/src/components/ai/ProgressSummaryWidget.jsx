import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, AlertCircle, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function ProgressSummaryWidget({ programId, programTitle }) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [stats, setStats] = useState(null);

  const generateSummary = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('generateProgressSummary', {
        programId
      });
      
      setSummary(data.summary);
      setStats(data.stats);
      toast.success("Progress summary generated");
    } catch (error) {
      console.error('Error generating summary:', error);
      toast.error('Failed to generate summary');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 border-blue-200 dark:border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-400">
              <TrendingUp className="w-5 h-5" />
              Progress Summary
            </CardTitle>
            <Button
              size="sm"
              onClick={generateSummary}
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  Summarize
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        {summary ? (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-white dark:bg-slate-700 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.completionRate}%</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">Complete</p>
              </div>
              <div className="bg-white dark:bg-slate-700 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.completedTasks}/{stats.totalTasks}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">Tasks</p>
              </div>
              <div className="bg-white dark:bg-slate-700 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">${stats.totalExpenses}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">Spent</p>
              </div>
              <div className="bg-white dark:bg-slate-700 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.daysUntilDue}d</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">Until Due</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-700 p-4 rounded-lg border-l-4 border-blue-500">
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {summary}
              </p>
            </div>
          </CardContent>
        ) : (
          <CardContent>
            <p className="text-sm text-slate-600 dark:text-slate-400 text-center py-4">
              Click "Summarize" to generate an automated progress analysis
            </p>
          </CardContent>
        )}
      </Card>
    </motion.div>
  );
}