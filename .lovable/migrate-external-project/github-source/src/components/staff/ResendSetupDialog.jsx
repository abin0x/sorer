import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function ResendSetupDialog({ open, onOpenChange, clubId, reason, onReady }) {
  const [apiKey, setApiKey] = useState('');
  const [domainName, setDomainName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await base44.functions.invoke('saveResendApiKey', { apiKey, domainName, club_id: clubId });
      setApiKey(''); onOpenChange(false); onReady();
    } catch (e) { setError(e.response?.data?.error || e.message); }
    finally { setBusy(false); }
  };
  return <Dialog open={open} onOpenChange={(value) => { if (!busy) { setApiKey(''); setError(''); onOpenChange(value); } }}>
    <DialogContent>
      <DialogHeader><DialogTitle>Set up invitation email</DialogTitle><DialogDescription>{reason}</DialogDescription></DialogHeader>
      <form onSubmit={save} className="space-y-4">
        <p className="text-sm text-muted-foreground">Enter this club’s Resend details. Your invitation is preserved and will be retried after setup.</p>
        <p className="text-sm"><a href="https://resend.com/api-keys" target="_blank" rel="noreferrer" className="text-primary underline">Create a Full access API key</a> and <a href="https://resend.com/domains" target="_blank" rel="noreferrer" className="text-primary underline">add and verify your domain in Resend</a>. Domain verification requires adding Resend’s DNS records with your domain provider.</p>
        <div className="space-y-2"><Label htmlFor="invite-resend-key">Resend API key</Label><Input id="invite-resend-key" type="password" autoComplete="off" required placeholder="re_..." value={apiKey} onChange={(e) => setApiKey(e.target.value)} disabled={busy} /></div>
        <div className="space-y-2"><Label htmlFor="invite-resend-domain">Verified sending domain</Label><Input id="invite-resend-domain" required placeholder="mail.yourclub.com" value={domainName} onChange={(e) => setDomainName(e.target.value)} disabled={busy} /></div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={busy || !clubId}>{busy ? 'Validating setup…' : 'Save and retry invitation'}</Button>
      </form>
    </DialogContent>
  </Dialog>;
}