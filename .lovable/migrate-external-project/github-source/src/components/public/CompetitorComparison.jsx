import React, { useState } from "react";
import { Check, X, AlertTriangle, Minus } from "lucide-react";

// Comparison data extracted from the supplied feature matrix PDF.
// Only claims and qualifications from the source document are used here.
const PLATFORMS = ["Club Rudder", "TeamSnap", "SportsEngine HQ", "Sprocket Sports"];

const CATEGORIES = [
  {
    category: "Pricing & Payments",
    features: [
      {
        feature: "Pricing Transparency",
        values: ["✅ High — public tiers, live calculator", "⚠ Partial — club pricing requires quote", "⚠ Partial — third-party data only", "❌ Low — custom quotes only"],
      },
      {
        feature: "Payment Processing",
        values: ["Your own Stripe account — no Club Rudder markup", "Integrated payments (rates vary)", "3.25% + $1.50 processing rate (third-party data)", "Integrated payments"],
      },
    ],
  },
  {
    category: "Multi-Branch Operations",
    features: [
      {
        feature: "Multi-Branch Architecture",
        values: ["✅ Core feature — unlimited branches, per-branch staff, facilities, schedules, roll-up dashboards", "❌ Limited", "✅ Yes — organization-level management", "✅ Yes"],
      },
      {
        feature: "Club-Wide Financial Roll-Up",
        values: ["✅ Yes — track per branch or roll up to club level", "❌ Not specified", "✅ Advanced financials & reporting", "✅ Dashboards & reports"],
      },
      {
        feature: "Cross-Branch Scheduling",
        values: ["✅ Yes — detect facility conflicts, optimize field utilization", "❌ No", "✅ Automated scheduling", "✅ Multi-group scheduling with auto-sync"],
      },
    ],
  },
  {
    category: "Player Records & Development",
    features: [
      {
        feature: "Unified Player Record",
        values: ["✅ Yes — one record follows players across branches, seasons, programs", "❌ Team-level only", "✅ Athlete accounts & profiles", "✅ Player profiles & progress tracking"],
      },
      {
        feature: "Player Development Tracking",
        values: ["✅ Yes — skill tests, E.P.I.C. evaluations, fitness benchmarks, cross-branch history", "❌ Limited", "❌ Not specified", "✅ Player progress, evaluations, measurable tracking"],
      },
    ],
  },
  {
    category: "Registration & Tryouts",
    features: [
      {
        feature: "Registration",
        values: ["✅ Yes — age eligibility, waitlists, capacity, digital waivers", "✅ Yes — custom forms, documents, waivers", "✅ Yes — online registration, waivers, payments", "✅ Yes — payment plans, financial aid, capacity limits"],
      },
      {
        feature: "Tryout Management",
        values: ["✅ Yes — tryout matrix, pipeline, team placement", "❌ Limited", "✅ Yes — tryouts & team rosters", "✅ Yes — full tryout process, rostering"],
      },
      {
        feature: "League Management",
        values: ["✅ Yes — tournament management module", "❌ No", "✅ Yes — leagues & tournaments", "✅ Yes — internal & external leagues, playoffs"],
      },
    ],
  },
  {
    category: "Facilities & Fields",
    features: [
      {
        feature: "Facility/Field Management",
        values: ["✅ Yes — per branch, availability, cross-branch booking", "❌ No", "✅ Venue management", "✅ Field/court/rink scheduling"],
      },
    ],
  },
  {
    category: "Communication & Mobile",
    features: [
      {
        feature: "Communication",
        values: ["✅ Scoped by branch, team, or club-wide", "✅ Chat, messaging, alerts, custom groups", "✅ Integrated communication tools", "✅ Email, text, app notifications, social media"],
      },
      {
        feature: "Companion Mobile App",
        values: ["✅ Yes — family calendar, messaging, payments, player development", "✅ Yes — highly-rated, live streaming, highlights", "✅ Yes — 4.8/5 star-rated", "✅ Yes — schedules, messaging, rosters, photos"],
      },
    ],
  },
  {
    category: "Website, Marketing & Bookkeeping",
    features: [
      {
        feature: "Website Builder / CMS",
        values: ["✅ Storefront & Bookkeeping module — marketplace, events, spiritwear store", "❌ Basic pages only", "✅ Custom websites with your branding", "✅ Full CMS, websites, email marketing, marketing services"],
      },
      {
        feature: "Website & Marketing Tools",
        values: ["✅ One club brand across branches; storefront & marketplace module", "❌ No", "✅ Website branding, fundraising tools", "✅ Core focus — websites, CMS, email marketing, donations, sponsorships, parent education videos"],
      },
      {
        feature: "Bookkeeping / QuickBooks Sync",
        values: ["✅ Yes — 2-way QuickBooks Online sync", "❌ Not specified", "❌ Not specified", "❌ Not specified"],
      },
    ],
  },
  {
    category: "Migration, Streaming & Safety",
    features: [
      {
        feature: "Migration Service",
        values: ["✅ Free, human-verified — specialist reviews every record", "❌ Not specified", "✅ Dedicated onboarding coach", "❌ Not specified"],
      },
      {
        feature: "Live Streaming",
        values: ["❌ No", "✅ Yes — TeamSnap ONE", "✅ Yes — Creator Studio ($1,500/yr)", "❌ No"],
      },
      {
        feature: "Background Checks / Safety",
        values: ["⚠ Tracks background-check and SafeSport certificates; checks run via your provider", "❌ Not specified", "✅ Yes — safety & risk management, background checks", "✅ Risk management module"],
      },
    ],
  },
];

// Parse a cell value into a status + label for rendering.
function parseCell(raw) {
  if (!raw) return { status: "unknown", label: "Not specified" };
  const trimmed = raw.trim();
  if (trimmed.startsWith("✅")) return { status: "yes", label: trimmed.slice(1).trim() };
  if (trimmed.startsWith("⚠")) return { status: "partial", label: trimmed.slice(1).trim() };
  if (trimmed.startsWith("❌")) return { status: "no", label: trimmed.slice(1).trim() };
  // Free-text value (e.g. payment processing details)
  return { status: "text", label: trimmed };
}

function StatusIcon({ status }) {
  if (status === "yes") return <Check className="w-4 h-4 text-emerald-500 shrink-0" />;
  if (status === "no") return <X className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />;
  if (status === "partial") return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
  if (status === "unknown") return <Minus className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />;
  return null;
}

export default function CompetitorComparison() {
  const [openCategory, setOpenCategory] = useState(0);

  return (
    <div>
      {/* Desktop table view */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="text-left p-3 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide text-xs border-b-2 border-slate-200 dark:border-slate-700 w-1/4">
                Feature
              </th>
              {PLATFORMS.map((p) => (
                <th
                  key={p}
                  className={`p-3 text-center font-bold border-b-2 ${
                    p === "Club Rudder"
                      ? "border-primary text-primary bg-primary/5"
                      : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map((cat) => (
              <React.Fragment key={cat.category}>
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-2 bg-slate-50 dark:bg-slate-800/50 font-semibold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wide"
                  >
                    {cat.category}
                  </td>
                </tr>
                {cat.features.map((f, i) => (
                  <tr
                    key={f.feature}
                    className={i % 2 === 0 ? "bg-white dark:bg-transparent" : "bg-slate-50/50 dark:bg-slate-800/20"}
                  >
                    <td className="p-3 font-medium text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800">
                      {f.feature}
                    </td>
                    {f.values.map((raw, j) => {
                      const cell = parseCell(raw);
                      return (
                        <td
                          key={j}
                          className={`p-3 text-center border-b border-slate-100 dark:border-slate-800 ${
                            PLATFORMS[j] === "Club Rudder" ? "bg-primary/5" : ""
                          }`}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <StatusIcon status={cell.status} />
                            <span className="text-xs text-slate-600 dark:text-slate-400 text-left">
                              {cell.label}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile accordion view */}
      <div className="lg:hidden space-y-3">
        {CATEGORIES.map((cat, catIdx) => (
          <div key={cat.category} className="pub-card overflow-hidden">
            <button
              onClick={() => setOpenCategory(openCategory === catIdx ? -1 : catIdx)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{cat.category}</span>
              <span className={`text-slate-400 transition-transform ${openCategory === catIdx ? "rotate-180" : ""}`}>
                ▾
              </span>
            </button>
            {openCategory === catIdx && (
              <div className="px-4 pb-4 space-y-4">
                {cat.features.map((f) => (
                  <div key={f.feature} className="border-t border-slate-100 dark:border-slate-800 pt-3">
                    <p className="font-medium text-slate-700 dark:text-slate-300 text-sm mb-2">{f.feature}</p>
                    <div className="space-y-1.5">
                      {PLATFORMS.map((p, j) => {
                        const cell = parseCell(f.values[j]);
                        return (
                          <div key={p} className="flex items-start gap-2">
                            <span className={`text-xs font-semibold w-20 shrink-0 ${p === "Club Rudder" ? "text-primary" : "text-slate-500 dark:text-slate-400"}`}>
                              {p}
                            </span>
                            <div className="flex items-start gap-1.5 flex-1">
                              <StatusIcon status={cell.status} />
                              <span className="text-xs text-slate-600 dark:text-slate-400">{cell.label}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-6 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
        <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Included</span>
        <span className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Partial / requires quote</span>
        <span className="flex items-center gap-1.5"><X className="w-3.5 h-3.5 text-slate-400" /> Not available</span>
        <span className="flex items-center gap-1.5"><Minus className="w-3.5 h-3.5 text-slate-400" /> Not specified</span>
      </div>
      <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-3 max-w-2xl mx-auto">
        Competitor details are as of October 2026, taken from each company's public website and third-party pricing listings. Terms change, so please verify with each vendor before you decide.
      </p>
    </div>
  );
}