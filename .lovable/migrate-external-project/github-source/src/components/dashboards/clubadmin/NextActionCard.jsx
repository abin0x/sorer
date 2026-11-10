import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, CalendarClock, Grid3x3, ClipboardCheck, Link2, Mail, Users, MailCheck, ArrowRight } from "lucide-react";

const ICONS = { CheckCircle2, CalendarClock, Grid3x3, ClipboardCheck, Link2, Mail, Users, MailCheck };

/**
 * The single most important thing the Club Admin should do right now,
 * derived from the first incomplete step in the seasonal cycle.
 * This is the hero of the Club Admin dashboard — one primary action per screen.
 */
export default function NextActionCard({ action }) {
  if (!action) return null;
  const Icon = ICONS[action.icon] || CheckCircle2;

  return (
    <Card className="border-2 border-action/30 rounded-xl shadow-md bg-gradient-to-br from-action/5 to-transparent">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0">
            <Icon className="w-6 h-6 text-action" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-action mb-1">Next Action</p>
            <h2 className="text-lg font-bold text-text-primary leading-tight">{action.title}</h2>
            <p className="text-sm text-text-secondary mt-1">{action.detail}</p>
            {action.ctaTo && (
              <Link to={action.ctaTo} className="inline-block mt-3">
                <Button size="sm" className="gap-1.5">
                  {action.ctaLabel} <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}