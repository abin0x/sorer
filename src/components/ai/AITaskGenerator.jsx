import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function AITaskGenerator({ open, onOpenChange, program, onTasksGenerated }) {
  const [generating, setGenerating] = useState(false);
  const [generatedTasks, setGeneratedTasks] = useState([]);
  const [selectedTasks, setSelectedTasks] = useState([]);

  const generateTasks = async () => {
    setGenerating(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Based on this program, generate 5-8 actionable tasks with subtasks:

Program Title: ${program.title}
Description: ${program.description || 'N/A'}
Branch: ${program.branch}
Season: ${program.season}
Category: ${program.category || 'General'}

Generate a JSON array of tasks. Each task should have:
- title: Clear, actionable task name
- description: Brief description
- category: Relevant category
- subtasks: Array of 2-4 subtasks with title and description
- estimated_hours: Estimated time to complete

Make tasks specific to sports program management.`,
        response_json_schema: {
          type: "object",
          properties: {
            tasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  category: { type: "string" },
                  estimated_hours: { type: "number" },
                  subtasks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      setGeneratedTasks(response.tasks || []);
      setSelectedTasks(response.tasks?.map((_, idx) => idx) || []);
      toast.success("Tasks generated successfully");
    } catch (error) {
      console.error("Failed to generate tasks:", error);
      toast.error("Failed to generate tasks");
    } finally {
      setGenerating(false);
    }
  };

  const toggleTask = (idx) => {
    setSelectedTasks(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const handleAddTasks = () => {
    const tasksToAdd = generatedTasks.filter((_, idx) => selectedTasks.includes(idx));
    onTasksGenerated(tasksToAdd);
    setGeneratedTasks([]);
    setSelectedTasks([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 dark:text-white">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Task Generator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {generatedTasks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Generate tasks and subtasks using AI based on the program details
              </p>
              <Button
                onClick={generateTasks}
                disabled={generating}
                className="bg-gradient-to-r from-purple-600 to-purple-700"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Tasks
                  </>
                )}
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {generatedTasks.map((task, idx) => (
                  <div key={idx} className="p-4 border rounded-lg dark:border-slate-700">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedTasks.includes(idx)}
                        onCheckedChange={() => toggleTask(idx)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold dark:text-white">{task.title}</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{task.description}</p>
                        {task.subtasks?.length > 0 && (
                          <div className="mt-2 pl-4 border-l-2 border-slate-200 dark:border-slate-700">
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Subtasks:</p>
                            {task.subtasks.map((sub, sidx) => (
                              <p key={sidx} className="text-xs text-slate-600 dark:text-slate-400">• {sub.title}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between pt-4 border-t dark:border-slate-700">
                <Button
                  variant="outline"
                  onClick={() => {
                    setGeneratedTasks([]);
                    setSelectedTasks([]);
                  }}
                >
                  Regenerate
                </Button>
                <Button
                  onClick={handleAddTasks}
                  disabled={selectedTasks.length === 0}
                  className="bg-gradient-to-r from-emerald-600 to-emerald-700"
                >
                  Add {selectedTasks.length} Task{selectedTasks.length !== 1 ? 's' : ''}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}