import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Zap, Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

// Macro picker: lets an agent select a macro, fill in its variables, and
// insert the rendered body into the reply box. Optionally applies a status change.
export default function MacroPicker({ macros = [], ticket, agentName, onInsert, onStatusChange }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [variables, setVariables] = useState({});
  const { toast } = useToast();

  const substitute = (template, vars) => {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
  };

  const handleSelect = (macro) => {
    setSelected(macro);
    // Pre-fill known variables
    const prefilled = {
      ticket_number: ticket?.ticket_number || '',
      customer_name: ticket?.submitted_by_name || '',
      club_name: ticket?.club_name || '',
      agent_name: agentName || '',
      subject: ticket?.subject || '',
    };
    setVariables(prefilled);
  };

  const handleInsert = async () => {
    const body = substitute(selected.body_template, variables);
    onInsert(body);
    if (selected.status_change) {
      onStatusChange?.(selected.status_change);
    }
    // Increment usage count
    base44.entities.Macro.update(selected.id, { usage_count: (selected.usage_count || 0) + 1 }).catch(() => {});
    setOpen(false);
    setSelected(null);
    toast({ title: 'Macro inserted' });
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Zap className="w-3.5 h-3.5" /> Macros
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSelected(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {!selected ? (
            <>
              <DialogHeader>
                <DialogTitle>Select a Macro</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                {macros.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No macros available.</p>
                )}
                {macros.map(m => (
                  <button
                    key={m.id}
                    onClick={() => handleSelect(m)}
                    className="w-full text-left rounded-lg border border-border p-3 hover:border-primary hover:bg-primary/5 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{m.name}</span>
                      {m.status_change && (
                        <Badge variant="outline" className="text-xs">→ {m.status_change}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{m.description}</p>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{selected.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Variables</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(selected.variables || []).map(v => (
                      <div key={v}>
                        <Label className="text-xs text-muted-foreground capitalize">{v.replace(/_/g, ' ')}</Label>
                        <Input
                          value={variables[v] || ''}
                          onChange={(e) => setVariables({ ...variables, [v]: e.target.value })}
                          className="h-8 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Preview</Label>
                  <Textarea
                    value={substitute(selected.body_template, variables)}
                    readOnly
                    rows={6}
                    className="text-sm"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelected(null)}>Back</Button>
                <Button onClick={handleInsert}>Insert</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}