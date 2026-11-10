import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, AlertCircle } from "lucide-react";

const PRIORITY_STYLES = {
  urgent: {
    card: "from-rose-500/10 via-rose-500/5 to-transparent border-rose-300/40",
    iconBg: "bg-rose-500",
    badge: "bg-rose-100 text-rose-700 border-rose-200",
    label: "Urgent",
  },
  high: {
    card: "from-amber-500/10 via-amber-500/5 to-transparent border-amber-300/40",
    iconBg: "bg-amber-500",
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    label: "High",
  },
  medium: {
    card: "from-blue-500/10 via-blue-500/5 to-transparent border-blue-300/40",
    iconBg: "bg-blue-500",
    badge: "bg-blue-100 text-blue-700 border-blue-200",
    label: "Medium",
  },
  info: {
    card: "from-violet-500/10 via-violet-500/5 to-transparent border-violet-300/40",
    iconBg: "bg-violet-500",
    badge: "bg-violet-100 text-violet-700 border-violet-200",
    label: "Info",
  },
};

/**
 * PriorityActions — the hero widget at the top of every dashboard.
 * Shows the 1-3 most important actions as large, beautiful gradient cards
 * with icons, descriptions, and CTA buttons. Actions are sorted by priority.
 *
 * Each action: { id, title, detail, icon, to, onClick, priority, ctaLabel, badge }
 */
export default function PriorityActions({ actions = [], maxVisible = 3 }) {
  const sorted = [...actions].sort((a, b) => {
    const order = { urgent: 0, high: 1, medium: 2, info: 3 };
    return (order[a.priority] ?? 9) - (order[b.priority] ?? 9);
  });
  const visible = sorted.slice(0, maxVisible);

  if (visible.length === 0) {
    return (
      <Card className="border-emerald-200/60 rounded-2xl shadow-sm bg-gradient-to-br from-emerald-50/50 to-transparent">
        <CardContent className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-text-primary">All caught up</p>
            <p className="text-xs text-text-secondary">No priority actions right now. Everything is on track.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`grid gap-3 ${visible.length === 1 ? "grid-cols-1" : visible.length === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"}`}>
      {visible.map((action) => {
        const Icon = action.icon;
        const style = PRIORITY_STYLES[action.priority] || PRIORITY_STYLES.medium;
        const content = (
          <Card className={`border rounded-2xl shadow-sm bg-gradient-to-br ${style.card} hover:shadow-md transition-all hover:-translate-y-0.5 h-full`}>
            <CardContent className="p-4 flex flex-col h-full">
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${style.iconBg} shadow-sm`}>
                  {Icon && <Icon className="w-5 h-5 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge variant="outline" className={`text-[10px] font-bold ${style.badge}`}>{style.label}</Badge>
                    {action.badge && (
                      <Badge className="text-[10px] bg-neutral-100 text-text-primary border-transparent">{action.badge}</Badge>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-text-primary leading-tight">{action.title}</h3>
                </div>
              </div>
              <p className="text-xs text-text-secondary flex-1 leading-relaxed">{action.detail}</p>
              <div className="flex items-center gap-1.5 mt-3 text-sm font-semibold text-action">
                {action.ctaLabel || "Take Action"}
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </CardContent>
          </Card>
        );
        return action.to ? (
          <Link key={action.id} to={action.to} className="block h-full">{content}</Link>
        ) : (
          <div key={action.id} onClick={action.onClick} className="cursor-pointer h-full">{content}</div>
        );
      })}
    </div>
  );
}