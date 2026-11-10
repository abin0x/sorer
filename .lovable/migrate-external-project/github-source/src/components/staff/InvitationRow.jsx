import React from 'react';
import { Pencil, Trash2, Send, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const date = value => value ? new Date(value).toLocaleString() : 'Not yet';
export default function InvitationRow({ invitation: i, busy, onEdit, onDelete, onRemind }) {
  const accepted = i.status === 'accepted';
  const received = !!(i.received_date || i.opened_date || accepted);
  const sent = !!(i.sent_date || received || (i.resend_email_id && !i.last_error));
  const legacy = !sent && !i.last_error && i.status === 'pending';
  return <tr className="border-t border-border">
    <td className="p-4"><p className="font-medium text-sm">{i.invitee_name || i.email}</p><p className="text-xs text-muted-foreground">{i.email}</p></td>
    <td className="p-4 text-sm">{i.role_label || i.role}</td>
    <td className="p-4"><div className="flex flex-wrap gap-2">{[['Sent', sent, i.sent_date], ['Received', received, i.received_date || i.opened_date], ['Accepted', accepted, i.accepted_date]].map(([label, done, at]) => <Badge key={label} variant={done ? 'secondary' : 'outline'} className={done ? 'bg-primary/10 text-primary gap-1' : 'text-muted-foreground gap-1'} title={date(at)}>{done && <Check className="h-3 w-3" />}{label}</Badge>)}</div>
      {legacy && <p className="text-xs text-muted-foreground mt-2">Older invitation: delivery not recorded</p>}
      {i.opened_date && <p className="text-xs text-muted-foreground mt-2">Invitation link opened {date(i.opened_date)}</p>}
      {i.status !== 'pending' && !accepted && <p className="text-xs text-muted-foreground mt-2 capitalize">{i.status}</p>}
      {i.last_error && <p className="text-xs text-destructive mt-2 max-w-sm">{i.last_error}</p>}
    </td>
    <td className="p-4 text-xs text-muted-foreground whitespace-nowrap"><p>{i.sent_date ? date(i.sent_date) : 'Not recorded'}</p>{i.last_reminded_date && <p className="mt-1">Reminded {date(i.last_reminded_date)} ({i.reminder_count || 1})</p>}</td>
    <td className="p-4"><div className="flex justify-end gap-1">
      <Button size="sm" variant="ghost" disabled={busy || i.status !== 'pending'} onClick={onEdit} aria-label={`Edit invitation for ${i.email}`}><Pencil className="h-4 w-4" />Edit</Button>
      <Button size="sm" variant="ghost" disabled={busy || i.status !== 'pending'} onClick={onRemind} aria-label={`Remind ${i.email}`}><Send className="h-4 w-4" />Remind</Button>
      <Button size="sm" variant="ghost" disabled={busy} onClick={onDelete} aria-label={`Delete invitation for ${i.email}`} className="text-destructive"><Trash2 className="h-4 w-4" />Delete</Button>
    </div></td>
  </tr>;
}