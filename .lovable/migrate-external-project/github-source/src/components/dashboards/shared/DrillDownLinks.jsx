import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

// Drill-down navigation links — shown at the bottom of each dashboard
export default function DrillDownLinks({ items }) {
  if (!items?.length) return null;
  return (
    <Card className="border-border-subtle rounded-xl shadow-sm">
      <CardContent className="p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-3">Drill-Down Views</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {items.map((item, i) => (
            <Link
              key={i}
              to={item.to}
              className="flex items-center justify-between gap-2 p-3 rounded-lg bg-neutral-50 hover:bg-neutral-100 border border-border-subtle hover:border-action/30 transition-all group"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{item.label}</p>
                {item.description && <p className="text-xs text-text-secondary truncate">{item.description}</p>}
              </div>
              <ChevronRight className="w-4 h-4 text-text-secondary group-hover:text-action shrink-0" />
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}