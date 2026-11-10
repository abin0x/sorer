import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import InvitationRow from '@/components/staff/InvitationRow';
import InvitationEditDialog from '@/components/staff/InvitationEditDialog';

export default function StaffInvitations({ clubId, systemUser, search = '' }) {
  const client = useQueryClient();
  const [edit, setEdit] = useState(null), [remove, setRemove] = useState(null);
  const key = ['staff-invitations', clubId];
  const query = useQuery({ queryKey: key, queryFn: async () => { const { data } = await base44.functions.invoke('manageStaffInvitations', { action: 'list', club_id: clubId }); return data.invitations; }, enabled: !!clubId, refetchInterval: 60000 });
  const mutation = useMutation({
    mutationFn: async payload => { const { data } = await base44.functions.invoke('manageStaffInvitations', { club_id: clubId, ...payload }); if (!data.success) throw new Error(data.error || 'Action failed'); return data; },
    onSuccess: (data, payload) => { client.invalidateQueries({ queryKey: key }); setEdit(null); setRemove(null); toast.success(payload.action === 'remind' ? 'Reminder sent' : payload.action === 'delete' ? 'Invitation deleted' : data.email_changed ? 'Saved. Send a reminder to the new email.' : 'Invitation updated'); },
    onError: e => toast.error(e.response?.data?.error || e.message),
  });
  const rows = (query.data || []).filter(i => `${i.invitee_name || ''} ${i.email} ${i.role_label || i.role}`.toLowerCase().includes(search.toLowerCase()));
  return <section className="rounded-xl border border-border bg-card overflow-hidden">
    <div className="p-5 flex justify-between items-start gap-4"><div><h2 className="text-lg font-semibold">Staff invitations</h2><p className="text-xs text-muted-foreground mt-1">Received means confirmed email delivery or an opened invitation link, not acceptance.</p></div><Button variant="outline" size="sm" disabled={query.isFetching} onClick={() => query.refetch()}><RefreshCw className={query.isFetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />Refresh</Button></div>
    {query.isLoading ? <div className="p-8 flex justify-center gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Loading invitations…</div> : query.isError ? <p role="alert" className="p-5 text-destructive">{query.error.response?.data?.error || query.error.message}</p> : !rows.length ? <p className="p-8 text-center text-sm text-muted-foreground">No staff invitations found.</p> : <div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-muted/40 text-xs text-muted-foreground"><tr>{['Staff member', 'Role', 'Progress', 'Last sent', 'Actions'].map(h => <th key={h} className="p-4 font-medium">{h}</th>)}</tr></thead><tbody>{rows.map(i => <InvitationRow key={i.id} invitation={i} busy={mutation.isPending} onEdit={() => setEdit(i)} onDelete={() => setRemove(i)} onRemind={() => mutation.mutate({ action: 'remind', invitation_id: i.id })} />)}</tbody></table></div>}
    <InvitationEditDialog invitation={edit} onClose={() => setEdit(null)} systemUser={systemUser} busy={mutation.isPending} onSave={form => mutation.mutate({ action: 'edit', invitation_id: edit.id, ...form })} />
    <AlertDialog open={!!remove} onOpenChange={open => { if (!open) setRemove(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete invitation?</AlertDialogTitle><AlertDialogDescription>Delete the invitation for {remove?.email}. Pending invitation links will stop working. Already accepted staff memberships will not be removed.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><Button variant="destructive" disabled={mutation.isPending} onClick={() => mutation.mutate({ action: 'delete', invitation_id: remove.id })}>{mutation.isPending ? 'Deleting…' : 'Delete invitation'}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>;
}