import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

export default function PlayerReviewAccess({ clubId }) {
  const [email,setEmail] = useState('');
  const [busy,setBusy] = useState(false);
  const q = useQuery({queryKey:['playerReviewStaff',clubId],enabled:!!clubId,queryFn:async()=>{
    const manager=await supabase.rpc('is_club_manager',{_club_id:clubId});
    if(manager.error) throw manager.error;
    if(!manager.data) return {manager:false,rows:[]};
    const rows=await supabase.from('player_review_staff').select('*').eq('club_id',clubId);
    if(rows.error) throw rows.error;
    return {manager:true,rows:rows.data || []};
  }});
  if(!q.data?.manager) return null;
  const change = async (address, remove=false) => {
    if(busy || !address.trim()) return;
    setBusy(true);
    const result= remove ? await supabase.from('player_review_staff').delete().eq('club_id',clubId).eq('coach_email',address) : await supabase.from('player_review_staff').insert({club_id:clubId,coach_email:address.trim().toLowerCase()});
    if(result.error) toast.error(result.error.message); else {setEmail('');await q.refetch();toast.success(remove?'Coach review access removed':'Coach review access granted');}
    setBusy(false);
  };
  return <section className="space-y-3 border-b border-border pb-6"><h2 className="text-xl font-semibold">Private player-review access</h2><p className="text-sm text-muted-foreground">Club managers have access. Add a coach’s sign-in email; the coach must also be a member of this club.</p><div className="flex flex-wrap gap-2"><Input className="sm:max-w-sm" type="email" aria-label="Coach review email" placeholder="Coach sign-in email" value={email} onChange={(e)=>setEmail(e.target.value)} /><Button variant="outline" disabled={busy || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)} onClick={()=>change(email)}><UserPlus className="h-4 w-4" />Grant access</Button></div>{q.data.rows.map((r)=><div key={r.coach_email} className="flex items-center justify-between gap-2 text-sm"><span className="break-all">{r.coach_email}</span><Button variant="ghost" size="icon" disabled={busy} aria-label={`Remove access for ${r.coach_email}`} onClick={()=>change(r.coach_email,true)}><Trash2 className="h-4 w-4" /></Button></div>)}</section>;
}