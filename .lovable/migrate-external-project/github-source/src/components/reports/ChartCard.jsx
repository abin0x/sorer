import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AsyncState, { LoadingState, EmptyState } from "@/components/shared/AsyncState";

/**
 * Wrapper that gives every chart a consistent card shell plus loading/empty/error states.
 * props: { title, isLoading, error, isEmpty, children, action }
 */
export default function ChartCard({ title, isLoading, error, isEmpty, children, action }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          {action}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingState label="Loading chart…" className="py-12" />
        ) : error ? (
          <EmptyState title="Chart unavailable" message="Try refreshing or adjusting filters." />
        ) : isEmpty ? (
          <EmptyState title="No data" message="No records match the current filters." />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}