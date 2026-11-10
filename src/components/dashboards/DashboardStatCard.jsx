import React from "react";
import { Link } from '@/lib/router-compat';
import { Card, CardContent } from "@/components/ui/card";

export default function DashboardStatCard({ icon: Icon, label, value, sublabel, tone, to }) {
  const content = (
    <Card className={`border-border-subtle bg-surface-card rounded-xl ${to ? "hover:shadow-md hover:border-action/40 transition-all cursor-pointer" : ""}`}>
      <CardContent className="p-6 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-neutral-100">
          {Icon && <Icon className="w-5 h-5 text-action" />}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-extrabold text-text-primary leading-tight truncate">{value}</p>
          {sublabel && <p className="text-xs text-text-secondary mt-0.5">{sublabel}</p>}
        </div>
      </CardContent>
    </Card>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}