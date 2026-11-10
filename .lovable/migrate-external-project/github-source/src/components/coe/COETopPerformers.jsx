import React from "react";
import { Link } from "react-router-dom";
import { Trophy } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function COETopPerformers({ performers }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
          <Trophy className="w-3 h-3 text-amber-500" /> Top Performers
        </h3>
        <span className="text-[10px] text-gray-400 font-medium">EPIC Composite</span>
      </div>
      {performers.length === 0 ? (
        <p className="text-xs text-gray-400 py-4 text-center">No scores recorded yet.</p>
      ) : (
        <div className="space-y-1">
          {performers.map((p, i) => (
            <Link key={p.id} to={`${createPageUrl("PlayerDetail")}?id=${p.id}`} className="flex items-center justify-between p-1.5 rounded-md hover:bg-gray-50 transition-colors group">
              <div className="flex items-center gap-2.5">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-gray-100 text-gray-600" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-gray-50 text-gray-400"}`}>{i + 1}</span>
                <div>
                  <p className="text-xs font-medium text-gray-900 group-hover:text-[#2ecc71]">{p.name}</p>
                  <p className="text-[10px] text-gray-400">{p.position || "—"} · {p.team}</p>
                </div>
              </div>
              <span className="text-sm font-bold text-[#2ecc71]">{p.epicComposite}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}