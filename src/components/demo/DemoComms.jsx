import React from "react";
import { MessageSquare, Megaphone } from "lucide-react";

const p = (a = 1) => `hsl(var(--primary)${a < 1 ? ` / ${a}` : ""})`;

export default function DemoComms({ messages }) {
  return (
    <div className="space-y-6" data-tour="comms">
      <div>
        <h2 className="text-2xl font-extrabold mb-1 text-slate-900">Communications</h2>
        <p className="text-slate-700">Messages from coaches and admins — no group-text chaos, no shared phone numbers.</p>
      </div>

      <div className="space-y-3">
        {messages.map((m) => (
          <div key={m.id} className="bg-white rounded-xl soft-shadow border border-slate-200 p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ background: p() }}>
                {m.sender_name?.[0] || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-bold text-sm text-slate-900">{m.sender_name}</span>
                  {m.is_announcement && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "hsl(38 63% 50% / 0.15)", color: "hsl(38 63% 35%)" }}>
                      <Megaphone className="w-3 h-3" /> Announcement
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-700">{m.content}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border-2 border-dashed border-slate-300 p-6 text-center">
        <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-400" />
        <p className="text-sm text-slate-600">In your trial, you can compose messages to teams, parents, or the whole club right from here.</p>
      </div>
    </div>
  );
}