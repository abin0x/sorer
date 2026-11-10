import React from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { TRYOUT_EVENT_STAGES } from "@/lib/tryoutDefaults";
import TryoutEventCard from "@/components/tryout/TryoutEventCard";

export default function TryoutKanbanBoard({ events, tasksByEventId, onSelectEvent }) {
  const queryClient = useQueryClient();

  // The Main Club Tryout card is always pinned to the top of whichever column it's in.
  const eventsByStage = (stage) =>
    events
      .filter((e) => e.stage === stage)
      .sort((a, b) => (b.type === "main_tryout") - (a.type === "main_tryout"));

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const eventId = result.draggableId;
    const newStage = result.destination.droppableId;
    const event = events.find((e) => e.id === eventId);
    if (!event || event.stage === newStage) return;
    await base44.entities.TryoutEvent.update(eventId, { stage: newStage });
    queryClient.invalidateQueries({ queryKey: ["tryoutEvents"] });
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {TRYOUT_EVENT_STAGES.map((col) => (
          <Droppable droppableId={col.key} key={col.key}>
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="bg-muted/40 rounded-xl p-2.5 min-h-[200px] space-y-2"
              >
                <p className="text-xs font-semibold uppercase text-muted-foreground px-1 pb-1">
                  {col.label} <span className="text-muted-foreground/70">({eventsByStage(col.key).length})</span>
                </p>
                {eventsByStage(col.key).map((event, index) => (
                  <Draggable draggableId={event.id} index={index} key={event.id}>
                    {(dragProvided) => (
                      <div ref={dragProvided.innerRef} {...dragProvided.draggableProps} {...dragProvided.dragHandleProps}>
                        <TryoutEventCard
                          event={event}
                          task={tasksByEventId[event.id]}
                          onClick={() => onSelectEvent(event)}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
}