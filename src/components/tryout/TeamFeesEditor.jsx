import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

export default function TeamFeesEditor({ fees, onChange }) {
  const update = (id, patch) => onChange(fees.map(f => f.id === id ? { ...f, ...patch } : f));
  return <div className="space-y-4">
    {fees.map((fee, i) => <div key={fee.id} className="border-b border-border pb-4 space-y-3">
      <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Team fee {i + 1}</h3><Button aria-label={`Remove fee ${i + 1}`} title="Remove fee" size="icon" variant="ghost" onClick={() => onChange(fees.filter(f => f.id !== fee.id))}><Trash2 className="size-4" /></Button></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><Label htmlFor={`fee-name-${fee.id}`}>Fee name</Label><Input id={`fee-name-${fee.id}`} value={fee.name} maxLength={150} onChange={e => update(fee.id, { name: e.target.value })} placeholder="Tournament entry" /></div>
        <div><Label htmlFor={`fee-amount-${fee.id}`}>Amount per player ($)</Label><Input id={`fee-amount-${fee.id}`} type="number" min="0" step="0.01" value={fee.amount} onChange={e => update(fee.id, { amount: e.target.value })} /></div>
      </div>
      <div><Label htmlFor={`fee-desc-${fee.id}`}>Services included</Label><Textarea id={`fee-desc-${fee.id}`} value={fee.description} maxLength={1500} onChange={e => update(fee.id, { description: e.target.value })} placeholder="Entry to two regional tournaments; travel and hotels not included" rows={2} /></div>
      <Select value={fee.required ? 'required' : 'optional'} onValueChange={v => update(fee.id, { required: v === 'required' })}><SelectTrigger aria-label={`Fee ${i + 1} requirement`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="required">Required for every player</SelectItem><SelectItem value="optional">Optional — family chooses</SelectItem></SelectContent></Select>
    </div>)}
    <Button variant="outline" onClick={() => onChange([...fees, { id: crypto.randomUUID(), name: '', description: '', amount: 0, required: false }])} disabled={fees.length >= 30}><Plus className="size-4 mr-2" />Add team fee</Button>
  </div>;
}