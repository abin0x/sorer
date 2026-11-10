import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Languages, Plus, Trash2, RotateCcw, Save, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useTenant } from "@/lib/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DEFAULT_TERMINOLOGY, DEFAULT_TERMS, TERM_KEYS, mergeTerminology } from "@/lib/terminology";
import { STANDARD_POSITIONS } from "@/lib/positions";
import { RECOMMENDATIONS } from "@/lib/evaluationCriteria";
import { Checkbox } from '@/components/ui/checkbox';
import PlayerReviewAccess from '@/components/tryout/PlayerReviewAccess';

const TERM_HELP = {
  club: "Your organization", branch: "Locations or regions", platform: "Program levels (e.g. Academy, Select)",
  program: "Camps, clinics, leagues", team: "Rostered groups", season: "Time periods",
  player: "Athletes", guardian: "Family contacts", coach: "Team staff", tryout: "Evaluation events",
};

export default function ClubTerminology() {
  const tenant = useTenant();
  const clubId = tenant.effectiveClubId;
  const [t, setT] = useState(DEFAULT_TERMINOLOGY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!clubId) { setLoading(false); return; }
    base44.entities.Club.get(clubId)
      .then((c) => setT(mergeTerminology(c?.terminology)))
      .catch(() => toast.error("Couldn't load your club's terminology."))
      .finally(() => setLoading(false));
  }, [clubId]);

  const setTerm = (key, field, value) => setT((p) => ({ ...p, terms: { ...p.terms, [key]: { ...p.terms[key], [field]: value } } }));
  const setMap = (section, key, value) => setT((p) => ({ ...p, [section]: { ...p[section], [key]: value } }));
  const setCriterion = (i, value) => setT((p) => ({ ...p, criteria: p.criteria.map((c, j) => (j === i ? { ...c, label: value } : c)) }));
  const addCriterion = () => setT((p) => ({ ...p, criteria: [...p.criteria, { key: `custom_${Date.now().toString(36)}`, label: "" }] }));
  const removeCriterion = (i) => setT((p) => ({ ...p, criteria: p.criteria.filter((_, j) => j !== i) }));

  const save = async () => {
    setSaving(true);
    try {
      await base44.entities.Club.update(clubId, { terminology: t });
      toast.success("Terminology saved. Refresh to see it everywhere.");
    } catch {
      toast.error("Only club owners and admins can change terminology.");
    } finally { setSaving(false); }
  };

  if (!clubId) {
    return <div className="p-8 text-center text-muted-foreground">Choose a club first — terminology is set per club.</div>;
  }
  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Languages className="h-4 w-4" />Club settings</p>
          <h1 className="text-3xl font-bold text-foreground">Terminology</h1>
          <p className="mt-1 max-w-xl text-muted-foreground">Use your club's own words. Blank fields fall back to the defaults shown in grey.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setT(DEFAULT_TERMINOLOGY)}><RotateCcw className="h-4 w-4" />Reset all</Button>
          <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save</Button>
        </div>
      </div>

      <Tabs defaultValue="names">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="names">Names & structure</TabsTrigger>
          <TabsTrigger value="positions">Positions</TabsTrigger>
          <TabsTrigger value="ratings">Tryout ratings</TabsTrigger>
          <TabsTrigger value="criteria">Evaluation criteria</TabsTrigger>
          <TabsTrigger value="retention">Retention & team roles</TabsTrigger>
        </TabsList>

        <TabsContent value="names">
          <Card>
            <CardHeader><CardTitle>Names & structure</CardTitle><CardDescription>How menus and pages refer to each level of your club.</CardDescription></CardHeader>
            <CardContent className="divide-y divide-border">
              {TERM_KEYS.map((k) => (
                <div key={k} className="grid gap-3 py-3 sm:grid-cols-[1fr_1fr_1fr] sm:items-center">
                  <div><p className="font-medium text-foreground">{DEFAULT_TERMS[k].singular}</p><p className="text-xs text-muted-foreground">{TERM_HELP[k]}</p></div>
                  <Input aria-label={`${DEFAULT_TERMS[k].singular} singular`} placeholder={DEFAULT_TERMS[k].singular} value={t.terms[k].singular} onChange={(e) => setTerm(k, "singular", e.target.value)} />
                  <Input aria-label={`${DEFAULT_TERMS[k].singular} plural`} placeholder={DEFAULT_TERMS[k].plural} value={t.terms[k].plural} onChange={(e) => setTerm(k, "plural", e.target.value)} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="positions">
          <Card>
            <CardHeader><CardTitle>Player positions</CardTitle><CardDescription>Rename positions; the 1–11 numbering stays the same so reports keep working.</CardDescription></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {STANDARD_POSITIONS.map((p) => (
                <label key={p.key} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-bold text-primary">{p.number}</span>
                  <Input placeholder={p.label} value={t.positions[p.key]} onChange={(e) => setMap("positions", p.key, e.target.value)} />
                </label>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ratings">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Rating scale</CardTitle><CardDescription>What each score means to evaluators.</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-bold text-primary">{n}</span>
                    <Input placeholder={DEFAULT_TERMINOLOGY.scale[n]} value={t.scale[n]} onChange={(e) => setMap("scale", n, e.target.value)} />
                  </label>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Recommendations</CardTitle><CardDescription>The outcome a coach picks for each player.</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                {RECOMMENDATIONS.map((r) => (
                  <Input key={r.value} aria-label={r.label} placeholder={r.label} value={t.recommendations[r.value]} onChange={(e) => setMap("recommendations", r.value, e.target.value)} />
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="retention" className="space-y-6">
          <PlayerReviewAccess clubId={clubId} />
          {[
            ['retentionStatuses', 'Player return intent', 'Director attention'],
            ['placementRecommendations', 'Coach placement recommendations'],
            ['teamRoles', 'Current team roles'],
          ].map(([section, title, flag]) => (
            <section key={section} className="space-y-3 border-b border-border pb-6">
              <h2 className="text-xl font-semibold text-foreground">{title}</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {t[section].map((o, i) => (
                  <div key={o.key} className="flex flex-wrap items-center gap-3">
                    <Input className="min-w-0 flex-1" aria-label={`${title} ${i + 1}`} value={o.label} onChange={(e) => setT((p) => ({...p,[section]:p[section].map((v,j)=>j===i?{...v,label:e.target.value}:v)}))} />
                    {flag && <label className="flex items-center gap-2 text-xs text-muted-foreground"><Checkbox checked={!!o.requires_follow_up} disabled={['at_risk','leaving'].includes(o.key)} onCheckedChange={(v)=>setT((p)=>({...p,[section]:p[section].map((x,j)=>j===i?{...x,requires_follow_up:v===true}:x)}))} />{flag}</label>}
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={()=>setT((p)=>({...p,[section]:[...p[section],{key:`custom_${Date.now().toString(36)}`,label:section==='teamRoles'?'Additional team role':'New option',requires_follow_up:false}]}))}><Plus className="h-4 w-4" />Add {section==='teamRoles'?'team role':'option'}</Button>
            </section>
          ))}
        </TabsContent>

        <TabsContent value="criteria">
          <Card>
            <CardHeader><CardTitle>Default evaluation criteria</CardTitle><CardDescription>Used for new tryout sessions. Each session can still be adjusted.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {t.criteria.map((c, i) => (
                <div key={c.key} className="flex gap-2">
                  <Input aria-label={`Criterion ${i + 1}`} placeholder="e.g. First touch" value={c.label} onChange={(e) => setCriterion(i, e.target.value)} />
                  <Button variant="ghost" size="icon" aria-label="Remove" disabled={t.criteria.length <= 1} onClick={() => removeCriterion(i)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button variant="outline" onClick={addCriterion}><Plus className="h-4 w-4" />Add criterion</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
