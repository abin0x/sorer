import React from "react";
import { CalendarDays } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
export default function ScheduledEventCard({ event, onOpen }) {
  return <Card className="adisal-card"><CardContent className="p-5 space-y-3">
    <div className="flex items-center justify-between"><CalendarDays className="h-6 w-6 text-primary" /><Badge variant="secondary">{event.status}</Badge></div>
    <h3 className="font-semibold">{event.title}</h3>
    <p className="text-xs text-muted-foreground">{event.event_type === "multi_date" ? "Multiple dates" : event.event_type === "recurring" ? "Recurring" : "Single day"}</p>
    {event.description && <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>}
    <Button variant="outline" className="w-full min-h-11" onClick={() => onOpen(event)}>View dates, groups & sessions</Button>
  </CardContent></Card>;
}