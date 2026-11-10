import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { format, eachMonthOfInterval, differenceInDays, addMonths, subMonths } from "date-fns";

export default function UserGanttChart({ programs, tasks }) {
  const [viewStart, setViewStart] = useState(new Date(2025, 7, 1)); // August 2025
  const viewMonths = 12;
  const viewEnd = addMonths(viewStart, viewMonths);
  const months = eachMonthOfInterval({ start: viewStart, end: viewEnd });

  const timelineData = useMemo(() => {
    const items = [];

    programs.forEach(program => {
      const startDate = program.started_date || program.suggested_start_date;
      const endDate = program.completed_date || program.due_date;
      
      if (startDate && endDate) {
        items.push({
          id: program.id,
          type: "program",
          title: program.title,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          status: program.status,
          priority: program.priority,
          branch: program.branch
        });
      }
    });

    tasks.forEach(task => {
      if (task.due_date) {
        const program = programs.find(p => p.id === task.program_id);
        const startDate = program?.started_date || program?.suggested_start_date || task.due_date;
        
        items.push({
          id: task.id,
          type: "task",
          title: task.title,
          startDate: new Date(startDate),
          endDate: new Date(task.due_date),
          status: task.completed ? "done" : "in_progress",
          programTitle: program?.title
        });
      }
    });

    return items.sort((a, b) => a.startDate - b.startDate);
  }, [programs, tasks]);

  const calculateBarStyle = (startDate, endDate) => {
    const totalDays = differenceInDays(viewEnd, viewStart);
    const startOffset = differenceInDays(startDate, viewStart);
    const duration = differenceInDays(endDate, startDate);

    const left = Math.max(0, (startOffset / totalDays) * 100);
    const width = Math.min((duration / totalDays) * 100, 100 - left);

    return {
      left: `${left}%`,
      width: `${width}%`
    };
  };

  const getTodayPosition = () => {
    const today = new Date();
    const totalDays = differenceInDays(viewEnd, viewStart);
    const todayOffset = differenceInDays(today, viewStart);
    return (todayOffset / totalDays) * 100;
  };

  const todayPosition = getTodayPosition();
  const showTodayLine = todayPosition >= 0 && todayPosition <= 100;

  const statusColors = {
    todo: "bg-slate-400 dark:bg-slate-600",
    in_progress: "bg-blue-500 dark:bg-blue-600",
    in_review: "bg-amber-500 dark:bg-amber-600",
    done: "bg-emerald-500 dark:bg-emerald-600"
  };

  if (timelineData.length === 0) {
    return (
      <Card className="modern-card shadow-lg">
        <CardContent className="pt-6 text-center py-16">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-700" />
          <p className="text-slate-500 dark:text-slate-400 text-lg">No timeline data available</p>
          <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">Programs and tasks will appear here</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="modern-card shadow-xl">
      <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-amber-50 to-transparent dark:from-amber-950/20">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 dark:text-white">
            <Calendar className="w-5 h-5 text-amber-600" />
            Personal Timeline ({format(viewStart, 'MMM yyyy')} - {format(viewEnd, 'MMM yyyy')})
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewStart(subMonths(viewStart, 3))}
              className="dark:border-slate-700"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewStart(new Date(2025, 7, 1))}
              className="dark:border-slate-700"
            >
              Reset
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewStart(addMonths(viewStart, 3))}
              className="dark:border-slate-700"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Horizontal and Vertical Scroll Container */}
        <div className="overflow-auto max-h-[600px] relative" style={{ scrollBehavior: 'smooth' }}>
          <div className="min-w-[1000px]">
            {/* Timeline Header */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
              <div className="w-56 flex-shrink-0 p-4 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                <span className="font-semibold text-sm text-slate-900 dark:text-white">Item</span>
              </div>
              <div className="flex-1 flex relative">
                {months.map((month, idx) => (
                  <div
                    key={idx}
                    className="flex-1 p-4 text-center border-r border-slate-200 dark:border-slate-700 last:border-r-0"
                  >
                    <div className="font-semibold text-xs text-slate-900 dark:text-white">
                      {format(month, 'MMM')}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      {format(month, 'yyyy')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline Items Container with Today Line */}
            <div className="divide-y divide-slate-200 dark:divide-slate-700 relative">
              {/* Today line positioned absolutely relative to this container */}
              {showTodayLine && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
                  style={{ left: `calc(${todayPosition}% + 14rem)` }}
                >
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full shadow-md"></div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full shadow-md"></div>
                </div>
              )}

              {timelineData.map((item) => {
                const style = calculateBarStyle(item.startDate, item.endDate);
                const colorClass = statusColors[item.status] || "bg-slate-400";

                return (
                  <div key={item.id} className="flex hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-200">
                    <div className="w-56 flex-shrink-0 p-4 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                      <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {item.title}
                      </div>
                      <div className="flex items-center gap-1 mt-2">
                        {item.type === "task" && (
                          <Badge className="text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                            Task
                          </Badge>
                        )}
                        {item.type === "program" && (
                          <Badge className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                            Program
                          </Badge>
                        )}
                        {item.branch && (
                          <Badge variant="outline" className="text-[10px] dark:border-slate-600">
                            {item.branch}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 relative p-4" style={{ minHeight: '80px' }}>
                      {/* Month dividers */}
                      <div className="absolute inset-0 flex">
                        {months.map((_, idx) => (
                          <div
                            key={idx}
                            className="flex-1 border-r border-slate-200 dark:border-slate-700 last:border-r-0"
                          />
                        ))}
                      </div>

                      {/* Timeline bar */}
                      <div className="relative h-full flex items-center">
                        <div
                          tabIndex={0}
                          className="absolute z-10 group cursor-pointer outline-none"
                          style={{
                            ...style,
                            height: '32px'
                          }}
                        >
                          <div
                            className={`${colorClass} h-full rounded-lg px-3 flex items-center shadow-md hover:shadow-xl transition-all duration-200 hover:scale-105`}
                          >
                            <span className="text-xs font-semibold text-white truncate">
                              {format(item.startDate, 'MMM d')} - {format(item.endDate, 'MMM d')}
                            </span>
                          </div>
                          
                          {/* Tooltip — hover on desktop, tap (focus) on touch */}
                          <div className="absolute left-0 top-full mt-2 hidden group-hover:block group-focus-within:block z-40">
                            <div className="bg-slate-900 dark:bg-slate-800 text-white text-xs rounded-lg p-3 shadow-xl whitespace-nowrap border border-slate-700">
                              <div className="font-semibold mb-1">{item.title}</div>
                              <div className="text-slate-300 space-y-0.5">
                                <div>📅 {format(item.startDate, 'MMM d, yyyy')} - {format(item.endDate, 'MMM d, yyyy')}</div>
                                <div>📊 Status: {item.status.replace(/_/g, ' ')}</div>
                                {item.programTitle && (
                                  <div>📁 Program: {item.programTitle}</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Footer info */}
        <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
          Showing {timelineData.length} {timelineData.length === 1 ? 'item' : 'items'} • Scroll horizontally and vertically to view all
        </div>
      </CardContent>
    </Card>
  );
}