import React from "react";
import { AlertTriangle, FileCheck, Activity, Star } from "lucide-react";

export default function COENeedsAttention({ needs }) {
  const items = [
    { count: needs.recommendations, label: "Personalized recommendations", action: "REVIEW", icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-50", border: "border-amber-200" },
    { count: needs.missingEval, label: "Assessments not yet verified", action: "NOTIFY", icon: FileCheck, color: "text-violet-500", bg: "bg-violet-50", border: "border-violet-200" },
    { count: needs.missingPhysical, label: "Missing physical assessments", action: "VIEW", icon: Activity, color: "text-red-500", bg: "bg-red-50", border: "border-red-200" },
    { count: needs.missingSkill, label: "Missing skill tests", action: "VIEW", icon: Star, color: "text-blue-500", bg: "bg-blue-50", border: "border-blue-200" },
  ];
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Needs Attention (Scoped to Current Filter)</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {items.map(item => (
          <div key={item.label} className={`flex items-center justify-between p-2.5 rounded-lg border ${item.border} ${item.bg}`}>
            <div className="flex items-center gap-2">
              <item.icon className={`w-4 h-4 ${item.color}`} />
              <div>
                <p className="text-lg font-extrabold text-gray-900 leading-none">{item.count}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{item.label}</p>
              </div>
            </div>
            <button className="text-[10px] font-bold text-gray-600 border border-gray-300 rounded px-2 py-1 hover:bg-white transition-colors">{item.action}</button>
          </div>
        ))}
      </div>
    </div>
  );
}