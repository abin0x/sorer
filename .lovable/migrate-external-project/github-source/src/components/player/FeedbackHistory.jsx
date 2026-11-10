import React from "react";
import { Badge } from "@/components/ui/badge";
import { Video, Target } from "lucide-react";
import { format } from "date-fns";
import Carousel from "@/components/shared/Carousel";

export default function FeedbackHistory({ items }) {
  return (
    <Carousel
      items={items}
      emptyMessage="No feedback sent yet."
      renderItem={(f) => (
        <div className="surface-tile p-3 space-y-2">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
              Sent {f.sent_at ? format(new Date(f.sent_at), "MMM d, yyyy") : ""}
            </Badge>
          </div>
          {f.strengths?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-0.5">Strengths</p>
              <ul className="text-xs list-disc list-inside space-y-0.5">{f.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
          )}
          {f.development_priorities?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-0.5">Development Priorities</p>
              <ul className="text-xs list-disc list-inside space-y-0.5">{f.development_priorities.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
          )}
          <p className="text-xs whitespace-pre-wrap text-foreground">{f.feedback_text}</p>
          {f.recommended_videos?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {f.recommended_videos.map((v, i) => (
                <Badge key={i} variant="outline" className="text-[10px]"><Video className="w-2.5 h-2.5 mr-1" />{v.title}</Badge>
              ))}
            </div>
          )}
          {f.suggested_goal_description && (
            <div className="flex items-center gap-1.5 text-xs text-primary">
              <Target className="w-3 h-3 shrink-0" /> {f.suggested_goal_description}{f.suggested_goal_target ? ` (Target: ${f.suggested_goal_target})` : ""}
            </div>
          )}
        </div>
      )}
    />
  );
}