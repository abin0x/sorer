import React, { useMemo } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import { Building2 } from "lucide-react";
import FieldSectionCard from "./FieldSectionCard";

export default function FacilityFieldView({ facilities, fields, eventsByField, isConflict, onEdit, onDelete, onAddBooking, onRequestMove }) {
  const facilitiesWithFields = useMemo(() => {
    return facilities
      .map((fac) => ({ facility: fac, fields: fields.filter((f) => f.facility_id === fac.id) }))
      .filter((g) => g.fields.length > 0);
  }, [facilities, fields]);

  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;
    onRequestMove(draggableId, source.droppableId, destination.droppableId);
  };

  if (facilitiesWithFields.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        <Building2 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
        No fields match the current filters.
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        {facilitiesWithFields.map(({ facility, fields: facilityFields }) => (
          <div key={facility.id}>
            <p className="text-xs font-bold uppercase tracking-wide text-[#399F7D] mb-2">{facility.name}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {facilityFields.map((field) => (
                <FieldSectionCard
                  key={field.id}
                  field={field}
                  events={eventsByField[field.id] || []}
                  isConflict={isConflict}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onAddBooking={onAddBooking}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}