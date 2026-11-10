import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Clock, AlertCircle, GitBranch } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";

export default function CriticalPathView({ tasks, subtasks }) {
  const allItems = [...tasks, ...subtasks];

  // Calculate critical path using longest path algorithm
  const calculateCriticalPath = () => {
    if (allItems.length === 0) return [];

    // Build adjacency list
    const graph = {};
    const inDegree = {};
    const duration = {};

    allItems.forEach(item => {
      graph[item.id] = item.dependencies || [];
      inDegree[item.id] = 0;
      
      // Calculate duration in days
      if (item.due_date && item.created_date) {
        duration[item.id] = differenceInDays(
          parseISO(item.due_date),
          parseISO(item.created_date)
        );
      } else {
        duration[item.id] = item.estimated_hours ? Math.ceil(item.estimated_hours / 8) : 1;
      }
    });

    // Calculate in-degrees
    Object.values(graph).forEach(deps => {
      deps.forEach(dep => {
        inDegree[dep] = (inDegree[dep] || 0) + 1;
      });
    });

    // Find start nodes (no dependencies)
    const queue = allItems.filter(item => (item.dependencies || []).length === 0).map(i => i.id);
    const distances = {};
    const paths = {};

    allItems.forEach(item => {
      distances[item.id] = 0;
      paths[item.id] = [item.id];
    });

    // Topological sort with longest path
    const processed = [];
    while (queue.length > 0) {
      const current = queue.shift();
      processed.push(current);

      // Find all items that depend on current
      allItems.forEach(item => {
        if ((item.dependencies || []).includes(current)) {
          const newDistance = distances[current] + duration[current];
          if (newDistance > distances[item.id]) {
            distances[item.id] = newDistance;
            paths[item.id] = [...paths[current], item.id];
          }

          inDegree[item.id]--;
          if (inDegree[item.id] === 0) {
            queue.push(item.id);
          }
        }
      });
    }

    // Find the longest path (critical path)
    let maxDistance = 0;
    let criticalPathIds = [];

    Object.entries(distances).forEach(([id, dist]) => {
      if (dist > maxDistance) {
        maxDistance = dist;
        criticalPathIds = paths[id];
      }
    });

    return criticalPathIds.map(id => allItems.find(item => item.id === id)).filter(Boolean);
  };

  const criticalPath = calculateCriticalPath();
  const totalDuration = criticalPath.reduce((sum, item) => {
    if (item.estimated_hours) return sum + Math.ceil(item.estimated_hours / 8);
    if (item.due_date && item.created_date) {
      return sum + differenceInDays(parseISO(item.due_date), parseISO(item.created_date));
    }
    return sum + 1;
  }, 0);

  const completedInPath = criticalPath.filter(item => item.completed || item.status === 'done').length;
  const pathProgress = criticalPath.length > 0 ? (completedInPath / criticalPath.length) * 100 : 0;

  return (
    <Card className="dark:bg-slate-800 dark:border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg dark:text-white">
          <Zap className="w-5 h-5 text-amber-500" />
          Critical Path Analysis
          {criticalPath.length > 0 && (
            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
              {totalDuration} days
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {criticalPath.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No critical path identified</p>
            <p className="text-xs mt-1">Add task dependencies to see the critical path</p>
          </div>
        ) : (
          <>
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Path Progress
                </span>
                <span className="text-sm font-bold text-blue-700 dark:text-blue-400">
                  {pathProgress.toFixed(0)}%
                </span>
              </div>
              <div className="h-2 bg-white dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                  style={{ width: `${pathProgress}%` }}
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <Clock className="w-3 h-3" />
                <span>
                  Est. completion: {totalDuration} days • {completedInPath}/{criticalPath.length} completed
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Critical Path Sequence
              </h4>
              {criticalPath.map((item, idx) => {
                const isComplete = item.completed || item.status === 'done';
                const isTask = tasks.some(t => t.id === item.id);

                return (
                  <div key={item.id} className="relative">
                    {idx > 0 && (
                      <div className="absolute left-4 -top-2 w-0.5 h-4 bg-slate-300 dark:bg-slate-600" />
                    )}
                    <div className={`flex items-center gap-3 p-3 rounded-lg border ${
                      isComplete 
                        ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950' 
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                    }`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        isComplete 
                          ? 'bg-green-500 text-white' 
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium dark:text-white ${isComplete ? 'line-through text-slate-500' : ''}`}>
                            {item.title}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {isTask ? "Task" : "Subtask"}
                          </Badge>
                        </div>
                        {item.assignee && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                            {item.assignee}
                          </p>
                        )}
                      </div>
                      {item.due_date && (
                        <Badge variant="outline" className="text-xs">
                          {parseISO(item.due_date).toLocaleDateString()}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {pathProgress < 100 && (
              <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 mt-0.5" />
                <span>
                  Delays in critical path items will directly impact project completion time
                </span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}