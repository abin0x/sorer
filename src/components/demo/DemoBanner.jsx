import React from "react";
import { Link } from '@/lib/router-compat';
import { Sparkles, ArrowRight } from "lucide-react";

export default function DemoBanner({ onTrialClick }) {
  return (
    <div className="sticky top-0 z-40 bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between gap-3 select-none" style={{ WebkitUserSelect: "none" }}>
      <div className="flex items-center gap-2 min-w-0">
        <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
        <span className="text-sm font-medium truncate">
          You're exploring a demo club. Start your free trial to use ClubRudder with your own data.
        </span>
      </div>
      <Link
        to="/trial-signup"
        onClick={onTrialClick}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-xs bg-white text-slate-900 hover:bg-slate-100 transition-colors shrink-0 min-h-[36px]"
      >
        Start Free Trial <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}