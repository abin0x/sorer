import React from "react";
import { Link } from "@/lib/router-compat";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUpRight, ArrowRight, CheckCircle2, CalendarDays } from "lucide-react";

const tones = {
  emerald: "text-status-success-700 bg-status-success-50",
  red: "text-status-danger-700 bg-status-danger-50",
  amber: "text-status-warning-700 bg-status-warning-50",
  blue: "text-status-info-700 bg-status-info-50",
  slate: "text-muted-foreground bg-muted",
  purple: "text-primary bg-primary/10",
};

export function WorkspaceHeader({ roleLabel, userName, subtitle, title, children }) {
  return <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      <p className="mb-2 text-xs font-semibold text-primary">{roleLabel} <span className="text-muted-foreground">/ {userName?.split(" ")[0] || "Your workspace"}</span></p>
      <h1 className="text-3xl font-bold leading-tight text-foreground">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
    </div>
    {children}
  </header>;
}

export function WorkspaceMetric({ icon: Icon, label, value, sublabel, tone = "blue", to }) {
  const content = <>
    <div className="flex items-start justify-between gap-2"><span className="text-xs font-medium text-muted-foreground">{label}</span><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${tones[tone] || tones.blue}`}>{Icon && <Icon className="h-4 w-4" />}</span></div>
    <p className="mt-3 break-words text-2xl font-bold tabular-nums text-foreground">{value}</p>
    <div className="mt-2 flex items-center justify-between gap-2"><p className="text-xs text-muted-foreground">{sublabel}</p>{to && <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}</div>
  </>;
  const classes = "block min-w-0 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40";
  return to ? <Link to={to} className={classes}>{content}</Link> : <div className={classes}>{content}</div>;
}

export function WorkspaceSection({ title, icon: Icon, viewAllLink, viewAllLabel = "View all", children, className = "" }) {
  return <section className={`min-w-0 ${className}`}>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
      <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">{Icon && <Icon className="h-4 w-4 text-primary" />}{title}</h2>
      {viewAllLink && <Button asChild variant="link" size="sm" className="h-auto p-0"><Link to={viewAllLink}>{viewAllLabel}<ArrowRight /></Link></Button>}
    </div>{children}
  </section>;
}

export function WorkspaceActions({ actions = [], title = "Quick actions" }) {
  return <nav aria-label={title} className="flex flex-wrap gap-2">
    {actions.map((action, i) => { const Icon = action.icon; const content = <>{Icon && <Icon />}{action.label}</>;
      return action.to ? <Button key={i} asChild variant="outline" size="sm" className="h-auto min-h-9 whitespace-normal text-left"><Link to={action.to}>{content}</Link></Button> : <Button key={i} variant="outline" size="sm" className="h-auto min-h-9 whitespace-normal text-left" onClick={action.onClick}>{content}</Button>;
    })}
  </nav>;
}

export function WorkspacePriorities({ actions = [], maxVisible = 3 }) {
  const order = { urgent: 0, high: 1, medium: 2, info: 3 };
  const sorted = [...actions].sort((a, b) => (order[a.priority] ?? 9) - (order[b.priority] ?? 9));
  return <WorkspaceSection title="Needs attention" icon={CheckCircle2}>
    {!sorted.length ? <p className="py-6 text-sm text-muted-foreground">All caught up. No priority actions.</p> : <div className="divide-y divide-border">{sorted.slice(0, maxVisible).map((action, i) => { const Icon = action.icon; return <div key={action.id || i} className="flex items-start gap-3 py-4 first:pt-0">
      <span className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${action.priority === "urgent" ? tones.red : action.priority === "high" ? tones.amber : tones.blue}`}>{Icon && <Icon className="h-4 w-4" />}</span>
      <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-foreground">{action.title}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{action.detail}</p>
        {action.to ? <Button asChild variant="link" size="sm" className="mt-2 h-auto whitespace-normal p-0"><Link to={action.to}>{action.ctaLabel || "Review"}<ArrowRight /></Link></Button> : action.onClick && <Button onClick={action.onClick} variant="link" size="sm">{action.ctaLabel || "Review"}<ArrowRight /></Button>}
      </div></div>; })}</div>}
  </WorkspaceSection>;
}

export function WorkspaceTabs({ panels }) {
  return <Tabs defaultValue={panels[0]?.id} className="min-w-0">
    <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-none border-b border-border bg-transparent p-0 pb-2">
      {panels.map(({ id, label, icon: Icon }) => <TabsTrigger key={id} value={id} className="gap-2 rounded-md px-3 py-2 text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none">{Icon && <Icon className="h-4 w-4" />}{label}</TabsTrigger>)}
    </TabsList>
    {panels.map(({ id, content }) => <TabsContent key={id} value={id} className="mt-6 space-y-6 focus-visible:outline-none">{content}</TabsContent>)}
  </Tabs>;
}

export function NextEventSpotlight({ event, to }) {
  return <section className="border-l-4 border-primary bg-primary/5 p-5 sm:p-6">
    <p className="flex items-center gap-2 text-xs font-semibold text-primary"><CalendarDays className="h-4 w-4" />UP NEXT</p>
    <h2 className="mt-3 break-words text-2xl font-bold text-foreground">{event?.title || "Your next session starts here"}</h2>
    <p className="mt-2 text-sm text-muted-foreground">{event ? new Date(event.start_datetime).toLocaleString("en-US", { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "No upcoming events scheduled."}</p>
    {(event?.location || event?.venue) && <p className="mt-1 text-sm text-muted-foreground">{event.location || event.venue}</p>}
    <Button asChild className="mt-5"><Link to={to}>Open schedule<ArrowRight /></Link></Button>
  </section>;
}