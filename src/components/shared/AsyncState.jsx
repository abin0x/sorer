import React from "react";
import { Loader2, Inbox, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

// Reusable loading / empty / error states for any screen.
// Usage: <AsyncState isLoading={loading} error={error} empty={items.length === 0} />
export function LoadingState({ label = "Loading…", className = "" }) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
      <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title = "Nothing here yet", message, action, className = "" }) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-muted-foreground" />
      </div>
      <p className="font-semibold text-foreground mb-1">{title}</p>
      {message && <p className="text-sm text-muted-foreground max-w-sm">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", message, onRetry, className = "" }) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
      <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <AlertTriangle className="w-7 h-7 text-destructive" />
      </div>
      <p className="font-semibold text-foreground mb-1">{title}</p>
      {message && <p className="text-sm text-muted-foreground max-w-sm">{message}</p>}
      {onRetry && (
        <Button variant="outline" className="mt-5 min-h-[44px]" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

// Single component that picks the right state based on props.
export default function AsyncState({ isLoading, error, empty, loadingLabel, emptyTitle, emptyMessage, emptyIcon, onRetry, children }) {
  if (isLoading) return <LoadingState label={loadingLabel} />;
  if (error) return <ErrorState title="Something went wrong" message={typeof error === "string" ? error : error?.message} onRetry={onRetry} />;
  if (empty) return <EmptyState icon={emptyIcon} title={emptyTitle} message={emptyMessage} />;
  return children || null;
}