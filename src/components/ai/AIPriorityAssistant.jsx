import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, AlertTriangle, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function AIPriorityAssistant({ programs, tasks, onApplySuggestion }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateInsights = async () => {
    setLoading(true);
    try {
      const programData = programs.map(p => ({
        id: p.id,
        title: p.title,
        status: p.status,
        priority: p.priority,
        due_date: p.due_date,
        suggested_start_date: p.suggested_start_date,
        branch: p.branch
      }));

      const taskData = tasks.map(t => ({
        id: t.id,
        title: t.title,
        program_id: t.program_id,
        completed: t.completed,
        due_date: t.due_date,
        dependencies: t.dependencies
      }));

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this project data and provide actionable insights:

Programs: ${JSON.stringify(programData)}
Tasks: ${JSON.stringify(taskData)}

Provide a JSON response with:
1. priority_suggestions: Array of {program_id, current_priority, suggested_priority, reason}
2. bottlenecks: Array of {program_id, issue, impact}
3. at_risk_programs: Array of {program_id, risk_level, reasons}
4. quick_wins: Array of {program_id, opportunity}

Focus on due dates, dependencies, and current status to identify issues.`,
        response_json_schema: {
          type: "object",
          properties: {
            priority_suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  program_id: { type: "string" },
                  current_priority: { type: "string" },
                  suggested_priority: { type: "string" },
                  reason: { type: "string" }
                }
              }
            },
            bottlenecks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  program_id: { type: "string" },
                  issue: { type: "string" },
                  impact: { type: "string" }
                }
              }
            },
            at_risk_programs: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  program_id: { type: "string" },
                  risk_level: { type: "string" },
                  reasons: { type: "array", items: { type: "string" } }
                }
              }
            },
            quick_wins: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  program_id: { type: "string" },
                  opportunity: { type: "string" }
                }
              }
            }
          }
        }
      });

      setInsights(response);
      toast.success("AI insights generated");
    } catch (error) {
      console.error("Failed to generate insights:", error);
      toast.error("Failed to generate AI insights");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="dark:bg-slate-900 dark:border-slate-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 dark:text-white">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Priority Assistant
          </CardTitle>
          <Button
            onClick={generateInsights}
            disabled={loading}
            size="sm"
            className="bg-gradient-to-r from-purple-600 to-purple-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Insights
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!insights && !loading && (
          <p className="text-sm text-slate-600 dark:text-slate-400 text-center py-8">
            Click "Generate Insights" to get AI-powered recommendations
          </p>
        )}

        {insights && (
          <>
            {insights.priority_suggestions?.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2 dark:text-white">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  Priority Suggestions
                </h4>
                <div className="space-y-2">
                  {insights.priority_suggestions.map((sug, idx) => {
                    const program = programs.find(p => p.id === sug.program_id);
                    return (
                      <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm dark:text-white">{program?.title}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{sug.reason}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onApplySuggestion(sug.program_id, { priority: sug.suggested_priority })}
                            className="ml-2"
                          >
                            Apply
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {insights.bottlenecks?.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2 dark:text-white">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  Bottlenecks Detected
                </h4>
                <div className="space-y-2">
                  {insights.bottlenecks.map((bottleneck, idx) => {
                    const program = programs.find(p => p.id === bottleneck.program_id);
                    return (
                      <div key={idx} className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                        <p className="font-medium text-sm dark:text-white">{program?.title}</p>
                        <p className="text-xs text-orange-800 dark:text-orange-300 mt-1">{bottleneck.issue}</p>
                        <Badge variant="outline" className="mt-2 text-xs border-orange-300 dark:border-orange-700">
                          Impact: {bottleneck.impact}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {insights.at_risk_programs?.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2 dark:text-white">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  At Risk Programs
                </h4>
                <div className="space-y-2">
                  {insights.at_risk_programs.map((risk, idx) => {
                    const program = programs.find(p => p.id === risk.program_id);
                    return (
                      <div key={idx} className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                        <div className="flex items-start justify-between">
                          <p className="font-medium text-sm dark:text-white">{program?.title}</p>
                          <Badge className="bg-red-600 text-white">{risk.risk_level}</Badge>
                        </div>
                        <ul className="mt-2 space-y-1">
                          {risk.reasons.map((reason, ridx) => (
                            <li key={ridx} className="text-xs text-red-800 dark:text-red-300">• {reason}</li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}