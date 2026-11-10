import React from "react";
import { Calendar, MapPin, Clock } from "lucide-react";

const p = (a = 1) => `hsl(var(--primary)${a < 1 ? ` / ${a}` : ""})`;

export default function DemoSchedule({ events, teams }) {
  const upcoming = events
    .filter((e) => new Date(e.start_datetime) > new Date())
    .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));

  return (
    <div className="space-y-6" data-tour="schedule">
      <div>
        <h2 className="text-2xl font-extrabold mb-1 text-slate-900">Schedule</h2>
        <p className="text-slate-700">Practices and games sync to every parent's phone automatically.</p>
      </div>

      <div className="space-y-3">
        {upcoming.map((e) => {
          const date = new Date(e.start_datetime);
          const isGame = e.event_type === "game";
          return (
            <div key={e.id} className="bg-white rounded-xl soft-shadow border border-slate-200 p-5 flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0" style={{ background: isGame ? "hsl(38 63% 50% / 0.15)" : p(0.12) }}>
                <span className="text-xs font-bold uppercase" style={{ color: isGame ? "hsl(38 63% 35%)" : p() }}>{date.toLocaleDateString("en", { month: "short" })}</span>
                <span className="text-xl font-extrabold leading-none text-slate-900">{date.getDate()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-extrabold text-slate-900">{e.title}</h3>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full capitalize" style={{ background: isGame ? "hsl(38 63% 50% / 0.15)" : p(0.12), color: isGame ? "hsl(38 63% 35%)" : p() }}>{e.event_type}</span>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {date.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {e.location_text || "—"}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {e.team_names?.join(", ") || "—"}</span>
                </div>
                {isGame && (
                  <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: p(0.1), color: p() }}>
                    📱 Parents notified · RSVP required
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}