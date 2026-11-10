import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Megaphone, BarChart3, Users, Mail, FileText, Layers, Upload, Settings as SettingsIcon } from "lucide-react";
import OutreachDashboard from "./OutreachDashboard";
import OutreachProspects from "./OutreachProspects";
import OutreachSequences from "./OutreachSequences";
import OutreachTemplates from "./OutreachTemplates";
import OutreachSegments from "./OutreachSegments";
import OutreachAnalytics from "./OutreachAnalytics";
import OutreachSettings from "./OutreachSettings";
import OutreachImport from "./import/OutreachImport";

const SUB_TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { key: 'prospects', label: 'Prospects', icon: Users },
  { key: 'import', label: 'Import CSV', icon: Upload },
  { key: 'sequences', label: 'Sequences', icon: Mail },
  { key: 'templates', label: 'Templates', icon: FileText },
  { key: 'segments', label: 'Segments', icon: Layers },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'settings', label: 'Settings', icon: SettingsIcon },
];

export default function OutreachTab() {
  const [subTab, setSubTab] = useState('dashboard');

  // Seed starter templates on first load
  useEffect(() => {
    base44.functions.invoke('outreach-templates', { action: 'seed' }).catch(() => {});
    base44.functions.invoke('outreach-import', { action: 'seed_segments' }).catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
        <Megaphone className="w-5 h-5 text-indigo-600 shrink-0" />
        <span className="font-bold text-slate-900 mr-2 hidden sm:inline">Outreach</span>
        <div className="flex gap-1 overflow-x-auto">
          {SUB_TABS.map(t => (
            <button key={t.key} onClick={() => setSubTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                subTab === t.key ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}>
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {subTab === 'dashboard' && <OutreachDashboard />}
      {subTab === 'prospects' && <OutreachProspects />}
      {subTab === 'import' && <OutreachImport />}
      {subTab === 'sequences' && <OutreachSequences />}
      {subTab === 'templates' && <OutreachTemplates />}
      {subTab === 'segments' && <OutreachSegments />}
      {subTab === 'analytics' && <OutreachAnalytics />}
      {subTab === 'settings' && <OutreachSettings />}
    </div>
  );
}