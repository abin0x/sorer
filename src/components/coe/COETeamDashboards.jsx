import React from "react";
import { Link } from '@/lib/router-compat';
import { Users, Star, Activity, ClipboardCheck } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function COETeamDashboards({ teams }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">
        Team Dashboards ({teams.length} Total)
      </h3>
      {teams.length === 0 ? (
        <p className="text-xs text-gray-400 py-4 text-center">No teams in current filter.</p>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {teams.map(t => (
            <Link key={t.id} to={`${createPageUrl("TeamDetail")}?id=${t.id}`} className="shrink-0 w-44 border border-gray-200 rounded-lg p-2.5 hover:border-[#2ecc71] hover:shadow-sm transition-all group">
              <p className="text-xs font-bold text-gray-900 truncate group-hover:text-[#2ecc71]">{t.name}</p>
              <p className="text-[10px] text-gray-400 mb-2">{t.platform || "—"} · {t.ageGroup || "—"}</p>
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                <Stat icon={Users} label="Players" value={t.players} color="text-blue-500" />
                <Stat icon={Star} label="Skill" value={t.skill} color="text-pink-500" />
                <Stat icon={Activity} label="Physical" value={t.physical} color="text-violet-500" />
                <Stat icon={ClipboardCheck} label="Evals" value={t.evals} color="text-emerald-500" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-1 bg-gray-50 rounded px-1.5 py-1">
      <Icon className={`w-2.5 h-2.5 ${color}`} />
      <span className="text-gray-500">{label}:</span>
      <span className="font-bold text-gray-900 ml-auto">{value}</span>
    </div>
  );
}