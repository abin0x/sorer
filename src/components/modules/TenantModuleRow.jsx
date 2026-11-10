import React from 'react';
import { Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { moduleHasAccess, moduleRecord } from '@/lib/moduleAccess';

export default function TenantModuleRow({ club, modules, lookup, updating, onChange }) {
  const records = [...lookup.values()].filter(m => m.club_id === club.id);
  const core = moduleRecord(records, 'club_nexus');
  const coreOn = moduleHasAccess(core);
  return (
    <tr className="border-t border-border">
      <td className="align-top px-4 py-5 font-semibold w-44">{club.name}</td>
      <td className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {modules.map(module => {
            const key = `${club.id}:${module.key}`;
            const record = moduleRecord(records, module.key);
            const checked = moduleHasAccess(record);
            const Icon = module.icon;
            return (
              <div key={key} className="rounded-lg border border-border bg-card p-3 space-y-3">
                <div className="flex items-center gap-2"><Icon className="w-4 h-4 text-primary shrink-0" /><span className="text-xs font-semibold">{module.title}</span></div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">{updating[key] ? 'Saving…' : checked ? module.key !== 'club_nexus' && !coreOn ? 'On · Nexus off' : 'On' : 'Off'}</span>
                  {updating[key] && <Loader2 className="w-3 h-3 animate-spin" />}
                  <Switch aria-label={`${club.name}: ${module.title} access`} checked={checked} disabled={!!updating[key]}
                    onCheckedChange={enabled => onChange(club.id, club.name, module.key, module.title, enabled)} />
                </div>
              </div>
            );
          })}
        </div>
      </td>
    </tr>
  );
}