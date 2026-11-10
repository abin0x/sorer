import { Check } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { formatDuesMoney, priceDues } from '@/lib/teamDues';

export default function DuesBreakdown({ config, selected = [], onSelect }) {
  const summary = priceDues(config, selected);
  const allFees = config.dues?.team_fees || [];
  return <div className="space-y-4">
    <div className="flex justify-between gap-4 font-semibold"><span>Base club dues</span><span className="shrink-0 tabular-nums">{formatDuesMoney(summary.base_dues)}</span></div>
    {summary.included_services.length > 0 && <ul className="space-y-2 text-sm text-muted-foreground">{summary.included_services.map((service, i) => <li key={i} className="flex gap-2"><Check className="size-4 shrink-0 text-primary mt-0.5" />{service}</li>)}</ul>}
    {allFees.map(fee => <div key={fee.id} className="border-t border-border pt-3">
      <div className="flex items-start gap-3">
        {!fee.required && onSelect && <Checkbox id={`select-${fee.id}`} checked={selected.includes(fee.id)} onCheckedChange={checked => onSelect(checked ? [...selected, fee.id] : selected.filter(id => id !== fee.id))} className="mt-1" />}
        <div className="flex-1 min-w-0"><Label htmlFor={`select-${fee.id}`} className="font-medium">{fee.name}</Label><p className="text-xs text-muted-foreground mt-1">{fee.required ? 'Required team fee' : 'Optional team fee'}</p>{fee.description && <p className="text-sm text-muted-foreground mt-1 break-words">{fee.description}</p>}</div>
        <span className="text-sm font-medium shrink-0 tabular-nums">{formatDuesMoney(fee.amount)}</span>
      </div>
    </div>)}
    <div className="flex justify-between gap-3 border-t border-border pt-4 text-lg font-bold"><span>{onSelect ? 'Season total' : 'Required season total'}</span><span className="tabular-nums">{formatDuesMoney(summary.total)}</span></div>
  </div>;
}