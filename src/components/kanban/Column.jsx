import React from "react";
import { Droppable } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

const columnConfig = {
  todo: { title: "To Do", color: "bg-slate-100 dark:bg-slate-800", accentColor: "bg-slate-600 dark:bg-slate-500" },
  in_progress: { title: "In Progress", color: "bg-blue-50 dark:bg-blue-950", accentColor: "bg-blue-600 dark:bg-blue-500" },
  in_review: { title: "In Review", color: "bg-amber-50 dark:bg-amber-950", accentColor: "bg-amber-600 dark:bg-amber-500" },
  done: { title: "Done", color: "bg-emerald-50 dark:bg-emerald-950", accentColor: "bg-emerald-600 dark:bg-emerald-500" }
};

export default function Column({ columnId, tasks, onAddTask, children }) {
  const config = columnConfig[columnId] || columnConfig.todo;

  return (
    <div className="flex flex-col h-full min-w-[280px] w-[320px]">
      <div className={cn("rounded-t-xl p-4 border-b-2", config.color)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", config.accentColor)} />
            <h2 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wide">
              {config.title}
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-2 py-1 rounded-full">
            {tasks.length}
          </span>
        </div>
      </div>

      <Droppable droppableId={columnId}>
        {(provided, snapshot) => (
          <ScrollArea className="flex-1 rounded-b-xl">
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={cn(
                "p-3 space-y-3 min-h-[200px]",
                snapshot.isDraggingOver ? config.color : "bg-slate-50 dark:bg-slate-900"
              )}
            >
              {children}
              {provided.placeholder}
            </div>
          </ScrollArea>
        )}
      </Droppable>
    </div>
  );
}