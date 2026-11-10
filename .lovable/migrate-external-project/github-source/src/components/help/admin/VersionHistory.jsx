import React from 'react';
import { History } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function VersionHistory({ article, onRestore }) {
  const history = article?.version_history || [];
  if (!history.length) return null;
  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <p className="text-sm font-semibold flex items-center gap-2"><History className="w-4 h-4" /> Version history (current v{article.version || 1})</p>
      {history.map((h) => (
        <div key={`${h.version}-${h.saved_at}`} className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">v{h.version} · {new Date(h.saved_at).toLocaleString()} · {h.saved_by}</span>
          <Button variant="ghost" size="sm" onClick={() => onRestore(h)}>Restore into editor</Button>
        </div>
      ))}
    </div>
  );
}