import React, { useEffect, useState } from 'react';
import { AlertTriangle, ArrowUpRight, CheckCircle2, Loader2, LockKeyhole, Save, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTerminology } from '@/hooks/useTerminology';
import { directorQueue, reviewLabel, requiresDirectorFollowUp } from '@/lib/playerRetention';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

export function RetentionBadges({ review, coaches = [] }) {
  const t = useTerminology();
  if (!review) return null;
  const risk = review.needs_follow_up;
  return <div className="mt-2 space-y-1.5 text-xs">
    <div className="flex flex-wrap gap-1.5">
      <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 font-semibold ${risk ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'border-status-success/30 bg-status-success-50 text-status-success-700'}`}>
        {risk ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}{reviewLabel(t.retentionStatuses, review.intent)}
      </span>
      {review.team_role && <span className="rounded-md border border-border bg-muted px-2 py-1 font-medium text-foreground">{reviewLabel(t.teamRoles, review.team_role)}</span>}
    </div>
    {risk && <p className="font-medium text-destructive">Director follow-up · {review.follow_up_status}</p>}
    {!!coaches.length && <p className="break-words text-muted-foreground">Coach advice: {[...new Set(coaches.map((c) => reviewLabel(t.placementRecommendations,c.recommendation)))].join(' / ')}{new Set(coaches.map((c) => c.recommendation)).size > 1 ? ' · Split opinions' : ''}</p>}
  </div>;
}

function OptionSelect({ label, value, options, onChange, empty = false }) {
  return <div className="space-y-2"><Label>{label}</Label><Select value={value || 'not_set'} onValueChange={(v) => onChange(v === 'not_set' ? '' : v)}><SelectTrigger aria-label={label} className="h-11"><SelectValue placeholder="Not reviewed" /></SelectTrigger><SelectContent>{empty && <SelectItem value="not_set" disabled={!!value}>Not reviewed</SelectItem>}{options.map((o) => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}</SelectContent></Select></div>;
}

export function PlayerReviewEditor({ playerId, playerName, retention }) {
  const t = useTerminology();
  const review = retention.reviewFor(playerId);
  const [intent,setIntent] = useState('returning');
  const [role,setRole] = useState('');
  const [recommendation,setRecommendation] = useState('');
  const [rationale,setRationale] = useState('');
  const [saving,setSaving] = useState(false);
  const [userId,setUserId] = useState(null);
  useEffect(() => { let active=true; supabase.auth.getUser().then(({data}) => { if(active) setUserId(data.user?.id || null); }); return () => { active=false; }; },[]);
  const mine = retention.coaches.find((c) => c.player_id===playerId && c.coach_user_id===userId);
  useEffect(() => { setIntent(review?.intent || 'returning'); setRole(review?.team_role || ''); setRecommendation(mine?.recommendation || ''); setRationale(mine?.rationale || ''); },[playerId,review?.updated_at,mine?.updated_at,userId]);
  if (!playerId || !retention.season) return <p className="text-sm text-muted-foreground">A player record and named season are needed for a returning-player review.</p>;
  if (retention.isLoading) return <Loader2 className="h-5 w-5 animate-spin" />;
  if (retention.error) return <p role="alert" className="text-sm text-destructive">Player reviews could not load. <Button variant="link" onClick={retention.refetch}>Retry</Button></p>;
  if (!retention.allowed) return <p className="text-sm text-muted-foreground">Private reviews are available to club managers and registered club coaches.</p>;
  const save = async () => {
    if (!userId || saving) return;
    setSaving(true);
    try {
      const identity = {club_id:retention.clubId,player_id:playerId,season:retention.season};
      const result = review
        ? await supabase.from('player_season_reviews').update({intent,team_role:role}).eq('id',review.id).eq('club_id',retention.clubId).select().single()
        : await supabase.from('player_season_reviews').insert({...identity,intent,team_role:role}).select().single();
      if(result.error) throw result.error;
      if(recommendation) {
        const rec = await supabase.from('player_coach_reviews').upsert({...identity,coach_user_id:userId,recommendation,rationale},{onConflict:'club_id,player_id,season,coach_user_id'}).select().single();
        if(rec.error) throw new Error(`Intent and role saved, but coach recommendation failed: ${rec.error.message}`);
      }
      await retention.refresh(); toast.success(`Review saved for ${playerName}`);
    } catch(e) { toast.error(e.message || 'Review could not be saved'); await retention.refresh(); }
    finally {setSaving(false);}
  };
  return <section aria-label="Returning-player review" className="space-y-4 border-b border-border pb-5">
    <div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold text-foreground">Returning-player review</h3><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><LockKeyhole className="h-3 w-3" />Staff only · {retention.season}</p></div><Users className="h-6 w-6 text-primary" /></div>
    {requiresDirectorFollowUp(intent,t.retentionStatuses) && <div role="status" className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm font-medium text-destructive"><AlertTriangle className="h-5 w-5 shrink-0" />Director attention required — this player is flagged for follow-up when saved.</div>}
    <div className="grid gap-4 sm:grid-cols-2"><OptionSelect label="Player return intent" value={intent} options={t.retentionStatuses} onChange={setIntent} /><OptionSelect label="Current team role" value={role} options={t.teamRoles} onChange={setRole} empty /></div>
    <OptionSelect label="Your placement recommendation" value={recommendation} options={t.placementRecommendations} onChange={setRecommendation} empty />
    <Textarea aria-label="Coach rationale" placeholder="Reason for your placement recommendation…" value={rationale} onChange={(e)=>setRationale(e.target.value)} maxLength={4000} />
    <Button disabled={saving || !userId} onClick={save} className="w-full sm:w-auto">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save player review</Button>
    {retention.coaches.filter((c)=>c.player_id===playerId).map((c,i)=><div key={c.id} className="border-l-2 border-primary pl-3 text-sm"><p className="font-semibold">{c.coach_user_id===userId?'Your review':`Coach ${i+1}`} · {reviewLabel(t.placementRecommendations,c.recommendation)}</p>{c.rationale && <p className="mt-1 break-words text-muted-foreground">{c.rationale}</p>}<p className="mt-1 text-xs text-muted-foreground">{new Date(c.updated_at).toLocaleDateString()}</p></div>)}
  </section>;
}

export function RetentionWorkspace({ retention, players, canManage }) {
  const [focus,setFocus] = useState(null);
  const [notes,setNotes] = useState('');
  const [busy,setBusy] = useState(false);
  const [search,setSearch] = useState('');
  const [showAll,setShowAll] = useState(false);
  const queue = directorQueue(retention.reviews,retention.clubId,retention.season);
  const unique = [...new Map(players.map((p)=>[p.player_id || p.id,p])).entries()].map(([id,p])=>({id,name:p.player_name || `${p.first_name || ''} ${p.last_name || ''}`.trim(),team:p.team_name}));
  const playerMap = Object.fromEntries(unique.map((p)=>[p.id,p]));
  const visible = showAll ? unique : queue.filter((r)=>playerMap[r.player_id]).map((r)=>playerMap[r.player_id]);
  const manager = canManage && retention.manager;
  const open = (p) => {setFocus(p);setNotes(retention.reviewFor(p.id)?.follow_up_notes || '');};
  const followUp = async (status) => {
    const review = retention.reviewFor(focus?.id);
    if(!review || busy) return;
    setBusy(true);
    const result = await supabase.from('player_season_reviews').update({follow_up_status:status,follow_up_notes:notes}).eq('id',review.id).eq('club_id',retention.clubId).select().single();
    if(result.error) toast.error(result.error.message); else {await retention.refresh();toast.success('Director follow-up saved');}
    setBusy(false);
  };
  if(!retention.season) return null;
  return <section aria-label="Retention and director follow-up" className="space-y-4 border-b border-border pb-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-primary">Next-season readiness</p><h2 className="mt-1 text-xl font-bold text-foreground">{canManage ? 'Retention & director follow-up' : 'Returning-player reviews'}</h2></div>{canManage && <div className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" /><strong className="text-2xl">{queue.length}</strong><span className="text-sm">need attention</span></div>}</div>
    {retention.error ? <p role="alert" className="text-destructive">Private reviews unavailable. <Button variant="link" onClick={retention.refetch}>Retry</Button></p> : retention.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : retention.allowed ? <>
      <div className="flex flex-wrap gap-2"><Button variant={!showAll?'secondary':'outline'} size="sm" onClick={()=>setShowAll(false)}>Flagged players ({queue.length})</Button><Button variant={showAll?'secondary':'outline'} size="sm" onClick={()=>setShowAll(true)}>All players ({unique.length})</Button><Input className="min-w-0 sm:max-w-xs" aria-label="Search returning players" placeholder="Search player…" value={search} onChange={(e)=>setSearch(e.target.value)} /></div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{visible.filter((p)=>p.name.toLowerCase().includes(search.toLowerCase())).map((p)=><div key={p.id} className="rounded-lg border border-border bg-card p-3"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="break-words font-semibold">{p.name}</p>{p.team && <p className="text-xs text-muted-foreground">{p.team}</p>}</div><Button variant="ghost" size="icon" aria-label={`Review ${p.name}`} onClick={()=>open(p)}><ArrowUpRight className="h-4 w-4" /></Button></div><RetentionBadges review={retention.reviewFor(p.id)} coaches={retention.coaches.filter((c)=>c.player_id===p.id)} />{!retention.reviewFor(p.id) && <p className="mt-2 text-xs text-muted-foreground">Not reviewed</p>}</div>)}</div>
      {!visible.length && <p className="py-3 text-sm text-muted-foreground">No outstanding retention flags for this season.</p>}
    </> : <p className="text-sm text-muted-foreground">Private staff reviews require club manager or registered coach access.</p>}
    <Dialog open={!!focus} onOpenChange={(v)=>{if(!v)setFocus(null);}}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{focus?.name}</DialogTitle></DialogHeader>{focus && <PlayerReviewEditor playerId={focus.id} playerName={focus.name} retention={retention} />}{manager && retention.reviewFor(focus?.id)?.needs_follow_up && <div className="space-y-3"><h3 className="font-semibold">Director follow-up</h3><p className="text-xs text-muted-foreground">Status: {retention.reviewFor(focus.id).follow_up_status}</p><Textarea aria-label="Director follow-up notes" placeholder="Family contact, next action and outcome…" value={notes} onChange={(e)=>setNotes(e.target.value)} /><div className="flex flex-wrap gap-2">{['open','contacted','resolved'].map((s)=><Button key={s} variant={s==='resolved'?'default':'outline'} size="sm" disabled={busy} onClick={()=>followUp(s)}>{s==='open'?'Keep open':s==='contacted'?'Mark contacted':'Resolve follow-up'}</Button>)}</div></div>}</DialogContent></Dialog>
  </section>;
}