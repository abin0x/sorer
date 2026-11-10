import React from "react";
import { Link } from '@/lib/router-compat';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowRight } from "lucide-react";

/**
 * Items waiting on branches, platforms, coaches, or players — prevents silent stalls.
 * Each blocker shows who it's waiting on and a link to nudge them.
 */
export default function BlockersPanel({ blockers = [] }) {
  if (blockers.length === 0) {
    return (
      <Card className="border-border-subtle rounded-xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold tracking-wide text-text-primary flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-status-success" /> Blockers
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-text-secondary py-4 text-center">No blockers — everything is moving.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border-subtle rounded-xl shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <CardTitle className="text-sm font-bold tracking-wide text-text-primary">Blockers</CardTitle>
          <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">{blockers.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2 max-h-[420px] overflow-y-auto">
          {blockers.map((b, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-amber-50/40 border border-amber-200/50">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary">{b.title}</p>
                <p className="text-xs text-text-secondary mt-0.5">{b.detail}</p>
                <p className="text-xs text-text-secondary mt-0.5">
                  Waiting on: <span className="font-medium text-amber-700">{b.waitingOn}</span>
                </p>
              </div>
              {b.to && (
                <Link to={b.to} className="shrink-0">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-amber-300 text-amber-800 hover:bg-amber-100">
                    {b.actionLabel || "Resolve"} <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}