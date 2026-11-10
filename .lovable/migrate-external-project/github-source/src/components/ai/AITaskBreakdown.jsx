import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AITaskBreakdown({ open, onOpenChange, program, onTasksGenerated }) {
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [selectedTasks, setSelectedTasks] = useState(new Set());

  const generateTasks = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('generateTasksWithAI', {
        programTitle: program.title,
        programDescription: program.description,
        complexity: program.priority || 'medium'
      });
      
      setTasks(data.tasks || []);
      toast.success(`Generated ${data.tasks.length} tasks with AI`);
    } catch (error) {
      console.error('Error generating tasks:', error);
      toast.error('Failed to generate tasks');
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = (index) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedTasks(newSelected);
  };

  const createSelectedTasks = async () => {
    const tasksToCreate = Array.from(selectedTasks).map(idx => {
      const task = tasks[idx];
      const dueDate = new Date(program.suggested_start_date);
      dueDate.setDate(dueDate.getDate() + (task.days_offset || 0));
      
      return {
        program_id: program.id,
        title: task.title,
        description: task.description,
        category: task.category,
        priority: task.priority,
        due_date: dueDate.toISOString().split('T')[0],
        completed: false
      };
    });

    try {
      await base44.entities.Task.bulkCreate(tasksToCreate);
      toast.success(`Created ${tasksToCreate.length} tasks`);
      onTasksGenerated();
      onOpenChange(false);
      setTasks([]);
      setSelectedTasks(new Set());
    } catch (error) {
      console.error('Error creating tasks:', error);
      toast.error('Failed to create tasks');
    }
  };

  const priorityColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800'
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 dark:text-white">
            Automated Task Generation
          </DialogTitle>
        </DialogHeader>

        {tasks.length === 0 ? (
          <div className="space-y-4 py-8">
            <p className="text-slate-600 dark:text-slate-400 text-center">
              Generate a detailed task breakdown for <strong>{program.title}</strong> using AI
            </p>
            <Button
              onClick={generateTasks}
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  Generate Tasks
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {tasks.map((task, idx) => (
              <Card
                key={idx}
                className={`cursor-pointer transition-all ${
                  selectedTasks.has(idx)
                    ? 'ring-2 ring-amber-500 bg-amber-50 dark:bg-amber-950'
                    : 'hover:shadow-lg'
                } dark:bg-slate-800 dark:border-slate-700`}
                onClick={() => toggleTask(idx)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded border-2 flex items-center justify-center mt-1 transition-all ${
                      selectedTasks.has(idx)
                        ? 'bg-amber-500 border-amber-500'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {selectedTasks.has(idx) && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900 dark:text-white">{task.title}</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{task.description}</p>
                      <div className="flex gap-2 mt-3">
                        <Badge variant="outline" className="text-xs">{task.category}</Badge>
                        <Badge className={`text-xs ${priorityColors[task.priority]}`}>{task.priority}</Badge>
                        <Badge variant="outline" className="text-xs text-slate-500">Day {task.days_offset}</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setTasks([]);
              setSelectedTasks(new Set());
              onOpenChange(false);
            }}
          >
            Close
          </Button>
          {tasks.length > 0 && (
            <Button
              onClick={createSelectedTasks}
              disabled={selectedTasks.size === 0}
              className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white"
            >
              Create {selectedTasks.size} Tasks
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}