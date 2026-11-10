import React from "react";
import { Home, CalendarDays, MessageSquare, User, LayoutDashboard, Users, ClipboardList, MapPin, DollarSign, Radio, TrendingUp, Settings } from "lucide-react";

/* Realistic device shells for the tours. Screens render inside; any "sm:/md:" grids
   collapse to one column on the phone via the .wt-phone rule in styles.css. */

export function PhoneFrame({ title, children }) {
  return (
    <div className="flex justify-center p-4 sm:p-6">
      <div className="w-full max-w-[330px] rounded-[2.75rem] border-[10px] border-foreground/85 bg-background shadow-2xl ring-1 ring-border">
        <div className="flex items-center justify-between px-6 pt-2 text-[10px] font-semibold text-muted-foreground">
          <span>9:41</span><span className="h-4 w-20 rounded-full bg-foreground/85" /><span>5G ▮▮▮</span>
        </div>
        {title && <div className="flex items-center justify-between border-b border-border px-4 pb-2 pt-1">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Demo FC</p>
            <p className="text-base font-bold leading-tight">{title}</p>
          </div>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">ML</span>
        </div>}
        <div className="wt-phone h-[480px] overflow-y-auto overflow-x-hidden px-3 py-3 text-sm">{children}</div>
        <div className="grid grid-cols-4 border-t border-border px-2 py-2 text-[10px] text-muted-foreground">
          {[[Home, "Home"], [CalendarDays, "Schedule"], [MessageSquare, "Beacon"], [User, "Me"]].map(([I, l], k) => (
            <span key={l} className={`flex flex-col items-center gap-0.5 ${k === 0 ? "text-primary" : ""}`}><I className="h-4 w-4" />{l}</span>
          ))}
        </div>
        <div className="mx-auto mb-2 h-1 w-24 rounded-full bg-foreground/60" />
      </div>
    </div>
  );
}

const NAV = [LayoutDashboard, Users, ClipboardList, CalendarDays, MapPin, TrendingUp, DollarSign, Radio, Settings];

export function TabletFrame({ title, children }) {
  return (
    <div className="p-3 sm:p-5">
      <div className="mx-auto rounded-[2rem] border-[12px] border-foreground/85 bg-background shadow-2xl ring-1 ring-border">
        <div className="flex aspect-[4/3] max-h-[560px] w-full overflow-hidden rounded-[1.1rem]">
          <aside className="hidden w-14 shrink-0 flex-col items-center gap-3 bg-primary py-4 text-primary-foreground sm:flex">
            <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary-foreground/20 text-xs font-black">CR</span>
            {NAV.map((I, k) => <I key={k} className={`h-4 w-4 ${k === 0 ? "" : "opacity-60"}`} />)}
          </aside>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center justify-between border-b border-border bg-card px-5 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Demo FC · Admin</p>
                <p className="text-lg font-bold leading-tight">{title}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="hidden rounded-full border border-border px-3 py-1 md:inline">All branches ▾</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 font-bold text-primary">JD</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-muted/40 p-4">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
