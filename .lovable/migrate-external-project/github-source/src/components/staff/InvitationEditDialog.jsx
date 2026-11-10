import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { STAFF_ROLE_OPTIONS } from '@/components/staff/StaffDialog';
import ResponsiveSelect from '@/components/shared/ResponsiveSelect';

export default function InvitationEditDialog({ invitation, onClose, onSave, busy, systemUser }) {
  const [form, setForm] = useState({});
  useEffect(() => { if (invitation) setForm({ email: invitation.email, invitee_name: invitation.invitee_name || '', role: invitation.role }); }, [invitation]);
  const options = STAFF_ROLE_OPTIONS.filter(r => !['admin', 'master_admin'].includes(r.value) && (systemUser || !['club_admin', 'club_director'].includes(r.value) || r.value === invitation?.role));
  if (invitation && !options.some(r => r.value === invitation.role)) options.push({ value: invitation.role, label: invitation.role_label || invitation.role });
  return <Dialog open={!!invitation} onOpenChange={open => { if (!open) onClose(); }}><DialogContent>
    <DialogHeader><DialogTitle>Edit invitation</DialogTitle></DialogHeader>
    <form className="space-y-4" onSubmit={e => { e.preventDefault(); onSave(form); }}>
      <div className="space-y-2"><Label htmlFor="invite-name">Name</Label><Input id="invite-name" required value={form.invitee_name || ''} onChange={e => setForm({ ...form, invitee_name: e.target.value })} /></div>
      <div className="space-y-2"><Label htmlFor="invite-email">Email</Label><Input id="invite-email" required type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
      <div className="space-y-2"><Label htmlFor="invite-role">Role</Label><ResponsiveSelect id="invite-role" className="w-full" value={form.role || ''} onChange={(v) => setForm({ ...form, role: v })} label="Role" options={options} /></div>
      <p className="text-xs text-muted-foreground">Changing the email invalidates the old link. Use Remind after saving to send the updated invitation.</p>
      <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</Button></DialogFooter>
    </form>
  </DialogContent></Dialog>;
}