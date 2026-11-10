import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Role-specific quick actions bar — configurable per dashboard
export default function QuickActionsBar({ actions = [], title = "Quick Actions" }) {
  if (!actions.length) return null;
  return (
    <Card className="border-border-subtle rounded-xl shadow-sm">
      <CardContent className="p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-3">{title}</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {actions.map((action, i) => {
            const Icon = action.icon;
            const content = (
              <div
                className={`relative p-3 rounded-lg border ${action.cardColor || "bg-neutral-50 border-border-subtle text-text-primary"} hover:shadow-sm transition-all hover:-translate-y-0.5`}
              >
                {action.badge > 0 && (
                  <Badge className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] px-1.5 py-0 min-w-[20px] justify-center">
                    {action.badge}
                  </Badge>
                )}
                <div className="flex items-center gap-2">
                  {Icon && (
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${action.iconBg || "bg-neutral-100"}`}>
                      <Icon className={`w-4 h-4 ${action.iconColor || "text-action"}`} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight truncate">{action.label}</p>
                    {action.desc && <p className="text-xs text-text-secondary mt-0.5 leading-tight truncate">{action.desc}</p>}
                  </div>
                </div>
              </div>
            );
            return action.to ? (
              <Link key={i} to={action.to}>{content}</Link>
            ) : (
              <div key={i} onClick={action.onClick} className="cursor-pointer">{content}</div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}