import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Network, AlertCircle, Check, Clock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export default function DependencyGraph({ programId }) {
  const [selectedTask, setSelectedTask] = useState(null);

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", programId],
    queryFn: () => base44.entities.Task.filter({ program_id: programId }),
    enabled: !!programId
  });

  const { data: subtasks = [] } = useQuery({
    queryKey: ["subtasks", programId],
    queryFn: () => base44.entities.Subtask.filter({ program_id: programId }),
    enabled: !!programId
  });

  // Check if a task's dependencies are met
  const areDependenciesMet = (item, allItems) => {
    if (!item.dependencies || item.dependencies.length === 0) return true;
    
    return item.dependencies.every(depId => {
      const dep = allItems.find(i => i.id === depId);
      return dep && (dep.completed || dep.status === 'done');
    });
  };

  // Get blocked tasks/subtasks
  const getBlockedItems = () => {
    const allItems = [...tasks, ...subtasks];
    return allItems.filter(item => {
      if (item.completed || item.status === 'done') return false;
      return !areDependenciesMet(item, allItems);
    });
  };

  // Get dependency chain for an item
  const getDependencyChain = (itemId, allItems, visited = new Set()) => {
    if (visited.has(itemId)) return [];
    visited.add(itemId);

    const item = allItems.find(i => i.id === itemId);
    if (!item || !item.dependencies) return [];

    const chain = [];
    item.dependencies.forEach(depId => {
      const dep = allItems.find(i => i.id === depId);
      if (dep) {
        chain.push(dep);
        chain.push(...getDependencyChain(depId, allItems, visited));
      }
    });

    return chain;
  };

  const blockedItems = getBlockedItems();
  const allItems = [...tasks, ...subtasks];

  return (
    <Card className="dark:bg-slate-800 dark:border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg dark:text-white">
          <Network className="w-5 h-5" />
          Task Dependencies
          {blockedItems.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {blockedItems.length} Blocked
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {blockedItems.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <Check className="w-12 h-12 mx-auto mb-3 text-green-500" />
            <p>All dependencies met! No blocked tasks.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              <span>{blockedItems.length} item(s) blocked by incomplete dependencies</span>
            </div>

            {blockedItems.map(item => {
              const isTask = tasks.some(t => t.id === item.id);
              const dependencyChain = getDependencyChain(item.id, allItems);

              return (
                <Card key={item.id} className="p-4 dark:bg-slate-900 dark:border-slate-700">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-500" />
                          <h4 className="font-medium dark:text-white">{item.title}</h4>
                          <Badge variant="outline" className="dark:border-slate-600">
                            {isTask ? "Task" : "Subtask"}
                          </Badge>
                        </div>
                        {item.assignee && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            Assigned to: {item.assignee}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pl-6 border-l-2 border-amber-300 dark:border-amber-700 space-y-2">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Waiting on:
                      </p>
                      {dependencyChain.map(dep => (
                        <div key={dep.id} className="flex items-center gap-2 text-sm">
                          <div className={`w-2 h-2 rounded-full ${
                            dep.completed || dep.status === 'done' 
                              ? 'bg-green-500' 
                              : 'bg-red-500'
                          }`} />
                          <span className="text-slate-600 dark:text-slate-400">
                            {dep.title}
                          </span>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              dep.completed || dep.status === 'done'
                                ? 'border-green-500 text-green-700 dark:text-green-400'
                                : 'border-red-500 text-red-700 dark:text-red-400'
                            }`}
                          >
                            {dep.completed || dep.status === 'done' ? 'Done' : 'Incomplete'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* All Tasks with Dependencies */}
        <div className="pt-4 border-t dark:border-slate-700">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            All Tasks & Dependencies
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {allItems.filter(item => item.dependencies && item.dependencies.length > 0).map(item => {
              const isTask = tasks.some(t => t.id === item.id);
              const depsCount = item.dependencies.length;
              const completedDeps = item.dependencies.filter(depId => {
                const dep = allItems.find(i => i.id === depId);
                return dep && (dep.completed || dep.status === 'done');
              }).length;

              return (
                <div 
                  key={item.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant={item.completed || item.status === 'done' ? "default" : "outline"}>
                      {isTask ? "Task" : "Subtask"}
                    </Badge>
                    <span className="text-sm dark:text-white">{item.title}</span>
                  </div>
                  <Badge variant="outline" className={
                    completedDeps === depsCount 
                      ? "border-green-500 text-green-700 dark:text-green-400" 
                      : "border-amber-500 text-amber-700 dark:text-amber-400"
                  }>
                    {completedDeps}/{depsCount} deps
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}