import React from "react";
import { Link } from '@/lib/router-compat';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

// Standardized section wrapper with title, icon, optional description, and "view all" link
export default function DashboardSection({ title, icon: Icon, description, viewAllLink, viewAllLabel = "View All", children, className = "" }) {
  return (
    <Card className={`border-border-subtle rounded-xl shadow-sm ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-action" />}
          <div>
            <CardTitle className="text-sm font-bold tracking-wide text-text-primary">{title}</CardTitle>
            {description && <p className="text-xs text-text-secondary mt-0.5">{description}</p>}
          </div>
        </div>
        {viewAllLink && (
          <Link to={viewAllLink} className="text-xs text-action flex items-center gap-1 hover:underline shrink-0">
            {viewAllLabel} <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}