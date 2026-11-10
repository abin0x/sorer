import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GripVertical, ArrowRight, Layers } from "lucide-react";

export default function StepPriority({ platforms, config, setConfig, onPrev, onNext }) {
  const [priorities, setPriorities] = useState(
    config.platform_priorities?.length
      ? config.platform_priorities
      : platforms.map((p) => p.id)
  );
  const [mode, setMode] = useState(config.mode || "strict");

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const reordered = Array.from(priorities);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setPriorities(reordered);
    setConfig({ ...config, platform_priorities: reordered, mode });
  };

  const handleNext = () => {
    setConfig({ ...config, platform_priorities: priorities, mode });
    onNext();
  };

  const platformMap = {};
  platforms.forEach((p) => { platformMap[p.id] = p; });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" /> Platform Priority & Mode
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Drag platforms into rank order. Higher-priority platforms get premium time slots first.
        </p>

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="platforms">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                {priorities.map((pid, index) => {
                  const p = platformMap[pid];
                  if (!p) return null;
                  return (
                    <Draggable key={pid} draggableId={pid} index={index}>
                      {(prov) => (
                        <div
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          {...prov.dragHandleProps}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:shadow-sm transition-all"
                        >
                          <GripVertical className="w-4 h-4 text-muted-foreground" />
                          <Badge className="bg-primary text-primary-foreground w-7 justify-center">{index + 1}</Badge>
                          <span className="font-medium text-foreground flex-1">{p.name}</span>
                          {p.gender && <Badge variant="outline" className="text-xs">{p.gender}</Badge>}
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        <div className="pt-2">
          <p className="text-sm font-semibold text-foreground mb-2">Scheduling Mode</p>
          <div className="flex gap-2">
            <button
              onClick={() => setMode("strict")}
              className={`flex-1 p-3 rounded-lg border text-left transition-all ${mode === "strict" ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border"}`}
            >
              <p className="font-semibold text-sm">Strict Priority</p>
              <p className="text-xs text-muted-foreground">Higher-priority platforms always win premium slots, even if it fragments lower-priority teams.</p>
            </button>
            <button
              onClick={() => setMode("weighted")}
              className={`flex-1 p-3 rounded-lg border text-left transition-all ${mode === "weighted" ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border"}`}
            >
              <p className="font-semibold text-sm">Weighted</p>
              <p className="text-xs text-muted-foreground">Priority is a weight factor; the algorithm balances overall quality across all teams.</p>
            </button>
          </div>
        </div>

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={onPrev}>Back</Button>
          <Button onClick={handleNext}>Continue to Rules <ArrowRight className="w-4 h-4" /></Button>
        </div>
      </CardContent>
    </Card>
  );
}