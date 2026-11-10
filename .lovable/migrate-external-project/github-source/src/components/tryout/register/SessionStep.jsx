import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Clock } from "lucide-react";
import { SESSION_LABEL } from "@/lib/tryoutRegisterApi";

/** Step 2 — pick an available session for each selected player, showing
 *  remaining spots and falling back to the waitlist when a session is full. */
export default function SessionStep({ family, selected, choices, choose }) {
  const planById = {};
  (family?.plans || []).forEach((p) => { planById[p.id] = p; });

  return (
    <div className="space-y-6">
      {selected.map((kid) => {
        const eligibleIds = (kid.eligibility || []).filter((e) => e.eligible).map((e) => e.plan_id);
        const plans = (family?.plans || []).filter((p) => eligibleIds.includes(p.id));
        const choice = choices[kid.id] || {};
        return (
          <Card key={kid.id}>
            <CardContent className="p-6 space-y-4">
              <div>
                <h2 className="font-bold text-lg">{kid.first_name} {kid.last_name}</h2>
                <p className="text-xs text-muted-foreground">
                  Eligible for {(kid.eligibility || []).filter((e) => e.eligible).map((e) => e.age_group).filter(Boolean).join(", ") || "the tryouts below"}
                </p>
              </div>

              {plans.length === 0 && (
                <p className="text-sm text-amber-700">
                  No tryout is open for {kid.first_name}'s age group and gender right now. Contact the club if you think this is wrong.
                </p>
              )}

              {plans.map((plan) => (
                <div key={plan.id} className="border border-border rounded-xl overflow-hidden">
                  <div className="p-3.5 bg-muted/40 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm">{plan.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {[plan.age_group, plan.gender, plan.season].filter(Boolean).join(" · ")}
                        {plan.tryout_fee > 0 ? ` · $${Number(plan.tryout_fee).toFixed(2)} per player` : " · free tryout"}
                      </p>
                    </div>
                    {plan.registration_close_date && (
                      <Badge variant="outline" className="text-[10px]">Register by {plan.registration_close_date}</Badge>
                    )}
                  </div>
                  <div className="divide-y divide-border">
                    {plan.sessions.map((s) => {
                      const active = choice.event_id === s.id;
                      return (
                        <button
                          type="button"
                          key={s.id}
                          onClick={() => choose(kid.id, plan.id, s.id)}
                          className={`w-full text-left p-3.5 flex items-center justify-between gap-3 ${active ? "bg-primary/5" : "hover:bg-muted/40"}`}
                        >
                          <div>
                            <p className="text-sm font-medium flex items-center gap-2">
                              {SESSION_LABEL[s.type] || "Session"}
                              {s.waitlist && <Badge className="bg-amber-100 text-amber-700 text-[10px]">Full · waitlist</Badge>}
                            </p>
                            <p className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{s.date}</span>
                              {s.start_time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{s.start_time}{s.end_time ? `–${s.end_time}` : ""}</span>}
                              {s.field_name && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{s.field_name}</span>}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            {s.spots_left === null
                              ? <span className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" />Open</span>
                              : s.waitlist
                                ? <span className="text-xs text-amber-700">Waitlist</span>
                                : <span className={`text-xs font-medium ${s.spots_left <= 5 ? "text-amber-700" : "text-emerald-700"}`}>{s.spots_left} left</span>}
                            {active && <p className="text-[10px] text-primary font-semibold mt-1">Selected</p>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}