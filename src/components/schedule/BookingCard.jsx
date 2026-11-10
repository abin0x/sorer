import React from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Trash2, AlertTriangle } from "lucide-react";
import { format, parseISO } from "date-fns";
import PropagationBadges from "./PropagationBadges";

export default function BookingCard({ event, index, hasConflict, onEdit, onDelete }) {
  return (
    <Draggable draggableId={event.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onEdit(event)}
          className={`group relative p-2 rounded-lg border text-xs cursor-pointer transition-shadow ${
            hasConflict ? "border-red-400 bg-red-50" : "border-emerald-200 bg-emerald-50"
          } ${snapshot.isDragging ? "shadow-lg ring-2 ring-emerald-400" : ""}`}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="font-semibold text-emerald-800">
              {format(parseISO(event.start_datetime), "h:mm a")}
              {event.end_datetime ? ` – ${format(parseISO(event.end_datetime), "h:mm a")}` : ""}
            </span>
            {hasConflict && <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />}
          </div>
          <p className="text-emerald-900 font-medium truncate">{event.team_names?.filter(Boolean).join(" vs ") || event.title}</p>
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-[9px] capitalize px-1 py-0">{event.event_type}</Badge>
              <PropagationBadges calendarSynced={event.calendar_synced} notified={event.notified} />
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(event.id); }}
              className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </Draggable>
  );
}