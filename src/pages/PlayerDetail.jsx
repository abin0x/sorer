import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams, useNavigate } from '@/lib/router-compat';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft, Users, Calendar, DollarSign, ClipboardCheck,
  Trophy, MapPin, Edit,
  Heart, Star, AlertCircle,
  IdCard, Briefcase, Activity, Plus, Sparkles,
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import ContactActions from "@/components/shared/ContactActions";
import PlayerEditDialog from "@/components/player/PlayerEditDialog";
import CoachNotes from "@/components/player/CoachNotes";
import PositionKnowledge from "@/components/player/PositionKnowledge";
import CreateEvaluationDialog from "@/components/player/CreateEvaluationDialog";
import SkillTestHistory from "@/components/player/SkillTestHistory";
import PhysicalAssessmentHistory from "@/components/player/PhysicalAssessmentHistory";
import EvaluationHistory from "@/components/player/EvaluationHistory";
import { computeTechnicalScore, computePhysicalScore } from "@/lib/testScoring";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SubPageLayout from "@/components/layout/SubPageLayout";
import TeamInfoTab from "@/components/player/TeamInfoTab";
import { ROLES } from "@/lib/rbac";
import { useTenant } from '@/lib/TenantContext';
import ClubIdentity from '@/components/shared/ClubIdentity';
import PlayerTryoutCards from '@/components/player/PlayerTryoutCards';
import FeedbackHistory from '@/components/player/FeedbackHistory';

const STATUS_COLORS = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900 dark:text-amber-300",
  waitlist: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-300",
  inactive: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400",
};
const PAY_COLORS = {
  unpaid: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  partial: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  refunded: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

function calcAge(dob) {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000));
}

export default function PlayerDetail() {
  const { effectiveClubId } = useTenant();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const playerId = searchParams.get("id");
  const [editOpen, setEditOpen] = useState(false);
  const [evalOpen, setEvalOpen] = useState(false);
  const [editEval, setEditEval] = useState(null);

  const { data: player, isLoading } = useQuery({
    queryKey: ["player", playerId, effectiveClubId],
    queryFn: () => base44.entities.Player.get(playerId),
    enabled: !!playerId && !!effectiveClubId,
  });
  const { data: guardian } = useQuery({
    queryKey: ["guardian-for-player", player?.guardian_id],
    queryFn: () => player?.guardian_id ? base44.entities.Guardian.get(player.guardian_id) : null,
    enabled: !!player?.guardian_id,
  });
  const guardianIds = player?.guardian_ids?.length ? player.guardian_ids : (player?.guardian_id ? [player.guardian_id] : []);
  const { data: allGuardians = [] } = useQuery({
    queryKey: ["all-guardians-for-player", playerId, guardianIds.join(",")],
    queryFn: async () => (await Promise.all(guardianIds.map((id) => base44.entities.Guardian.get(id).catch(() => null)))).filter(Boolean),
    enabled: guardianIds.length > 0,
  });
  const { data: registrations = [] } = useQuery({
    queryKey: ["regs-for-player", playerId],
    queryFn: () => base44.entities.Registration.filter({ player_id: playerId }, "-created_date", 50),
    enabled: !!playerId,
  });
  const { data: tryoutRegs = [] } = useQuery({
    queryKey: ["tryout-regs-for-player", playerId],
    queryFn: () => base44.entities.TryoutRegistration.filter({ player_id: playerId }, "-created_date", 50),
    enabled: !!playerId,
  });
  const { data: team } = useQuery({
    queryKey: ["team-for-player", player?.team_id],
    queryFn: () => player?.team_id ? base44.entities.Team.get(player.team_id) : null,
    enabled: !!player?.team_id,
  });
  const { data: program } = useQuery({
    queryKey: ["program-for-player", player?.program_id],
    queryFn: () => player?.program_id ? base44.entities.Program.get(player.program_id) : null,
    enabled: !!player?.program_id,
  });
  const { data: skillScores = [] } = useQuery({
    queryKey: ["player-skill-scores", playerId],
    queryFn: () => base44.entities.SkillTestScore.filter({ player_id: playerId }, "-test_date", 200),
    enabled: !!playerId,
  });
  const { data: physicalAssessments = [] } = useQuery({
    queryKey: ["player-physical-assessments", playerId],
    queryFn: () => base44.entities.PhysicalAssessment.filter({ player_id: playerId }, "-assessment_date", 200),
    enabled: !!playerId,
  });
  const { data: playerEvals = [] } = useQuery({
    queryKey: ["player-evaluations", playerId],
    queryFn: () => base44.entities.PlayerEvaluation.filter({ player_id: playerId }, "-evaluation_date", 50),
    enabled: !!playerId,
  });
  const { data: feedback = [] } = useQuery({
    queryKey: ['player-published-feedback', effectiveClubId, playerId],
    queryFn: () => base44.entities.PlayerFeedback.filter({ club_id: effectiveClubId, player_id: playerId, status: 'sent' }, '-sent_at', 100),
    enabled: !!playerId && !!effectiveClubId && player?.club_id === effectiveClubId,
  });
  const { data: benchmarks = [] } = useQuery({
    queryKey: ["test-benchmarks"],
    queryFn: () => base44.entities.TestBenchmark.list("-created_date", 500),
  });
  const { data: currentUser } = useQuery({
    queryKey: ["current-user-player-detail"],
    queryFn: () => base44.auth.me().catch(() => null),
  });
  const canEditEval = currentUser && ![ROLES.PLAYER, ROLES.PARENT_GUARDIAN].includes(currentUser.custom_role || currentUser.role);
  const { data: allEvents = [] } = useQuery({
    queryKey: ["team-events-tab", player?.team_id],
    queryFn: () => base44.entities.CalendarEvent.list("start_datetime", 200),
    enabled: !!player?.team_id,
  });
  const teamEvents = useMemo(() =>
    allEvents.filter((e) => (e.team_ids || []).includes(player?.team_id)),
    [allEvents, player?.team_id]
  );
  const { data: allPlayers = [] } = useQuery({
    queryKey: ["roster-players-tab", team?.id],
    queryFn: () => base44.entities.Player.list("-created_date", 200),
    enabled: !!team?.id,
  });
  const rosterPlayers = useMemo(() =>
    allPlayers.filter((p) => p.team_id === team?.id),
    [allPlayers, team?.id]
  );

  const genderKey = player?.gender === "Boys" ? "male" : player?.gender === "Girls" ? "female" : "all";
  const latestPhysical = useMemo(() =>
    [...physicalAssessments].sort((a, b) => new Date(b.assessment_date) - new Date(a.assessment_date))[0],
    [physicalAssessments]
  );

  const technicalPct = useMemo(() => computeTechnicalScore(skillScores, benchmarks), [skillScores, benchmarks]);
  const physicalPct = useMemo(() => computePhysicalScore(latestPhysical, benchmarks, genderKey), [latestPhysical, benchmarks, genderKey]);
  const perfIndex = technicalPct != null && physicalPct != null
    ? Math.round((technicalPct + physicalPct) / 2)
    : technicalPct ?? physicalPct ?? null;

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading player…</div>;
  if (!player || player.club_id !== effectiveClubId) return <div className="p-8 text-center text-muted-foreground">Player not found in this club.</div>;

  const reg = registrations[0];
  const age = calcAge(player.date_of_birth);
  const outstanding = reg ? (reg.amount_due || 0) - (reg.amount_paid || 0) : 0;
  const paymentPct = reg && reg.amount_due > 0 ? Math.round((reg.amount_paid / reg.amount_due) * 100) : 0;
  const playerFullNameStr = `${player.first_name} ${player.last_name}`;

  return (
    <SubPageLayout
      title={playerFullNameStr}
      subtitle="Player profile"
      backTo="/PlayerRoster"
      contentClassName="space-y-5 max-w-[1400px] mx-auto"
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}><Edit className="w-3.5 h-3.5 mr-1.5" /> Edit</Button>
          {canEditEval && <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={() => { setEditEval(null); setEvalOpen(true); }}><Sparkles className="w-3.5 h-3.5 mr-1.5" /> Create Evaluation</Button>}
        </>
      }
    >

      <ClubIdentity clubId={player.club_id} />

      {/* ===== Compact Profile Header + Score Banner ===== */}
      <Card className="adisal-card overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
            {/* Profile — 5 cols */}
            <div className="lg:col-span-5 p-4 lg:p-5 flex items-start gap-4">
              <div className="relative shrink-0">
                {player.photo_url ? (
                  <img src={player.photo_url} alt={playerFullNameStr} className="w-16 h-16 rounded-2xl object-cover" />
                ) : (
                  <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/70 rounded-2xl flex items-center justify-center text-white text-xl font-bold">
                    {player.first_name?.[0]}{player.last_name?.[0]}
                  </div>
                )}
                {player.jersey_number && (
                  <div className="absolute -bottom-1 -right-1 bg-card border border-border rounded-full w-6 h-6 flex items-center justify-center text-[10px] font-bold">#{player.jersey_number}</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold">{playerFullNameStr}</h1>
                  {outstanding > 0 && (
                    <Badge className="text-xs bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-900 dark:text-rose-300"><AlertCircle className="w-3 h-3 mr-1" /> Payment Due</Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                  {player.position && <span className="flex items-center gap-1"><Star className="w-3 h-3" /> {player.position}</span>}
                  {age != null && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {age} yrs</span>}
                  {player.gender && <span>{player.gender}</span>}
                  {player.location_name && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {player.location_name}</span>}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {team && (
                    <Link to={`${createPageUrl("TeamDetail")}?id=${team.id}`}>
                      <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80 text-[10px]"><Trophy className="w-2.5 h-2.5 mr-1" /> {team.name}</Badge>
                    </Link>
                  )}
                  {program && <Badge variant="outline" className="text-[10px]"><Briefcase className="w-2.5 h-2.5 mr-1" /> {program.title}</Badge>}
                </div>
              </div>
            </div>

            {/* Score Banner — 4 cols */}
            <div className="lg:col-span-4 p-4 lg:p-5 grid grid-cols-3 gap-3 border-t lg:border-t-0 lg:border-l lg:border-r border-border">
              <ScoreTile label="Technical" value={technicalPct} suffix="%" color="text-blue-600" />
              <ScoreTile label="Physical" value={physicalPct} suffix="%" color="text-emerald-600" />
              <ScoreTile label="Perf Index" value={perfIndex} suffix="%" color="text-primary" highlight />
            </div>

            {/* Guardian quick — 3 cols */}
            <div className="lg:col-span-3 p-4 lg:p-5 surface-tile">
              <p className="section-title mb-1.5">{allGuardians.length > 1 ? "Guardians" : "Guardian"}</p>
              {allGuardians.length > 0 ? (
              <div className="space-y-2 text-xs">
                {allGuardians.map((g) => (
                  <div key={g.id} className={allGuardians.length > 1 ? "pb-1.5 border-b border-border last:border-0 last:pb-0" : ""}>
                    <p className="font-medium">{g.first_name} {g.last_name}</p>
                    <ContactActions email={g.email} phone={g.phone} onMessage={() => navigate(`${createPageUrl("CommunicationPortal")}?recipient_email=${encodeURIComponent(g.email || "")}&recipient_name=${encodeURIComponent(`${g.first_name || ""} ${g.last_name || ""}`.trim())}`)} />
                  </div>
                ))}
              </div>
              ) : <p className="text-xs text-muted-foreground">No guardian linked.</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== Tabs: Individual Info / Team Info ===== */}
      <Tabs defaultValue={searchParams.get('tab') === 'tryouts' ? 'tryouts' : 'individual'} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="individual">Individual Info</TabsTrigger>
          <TabsTrigger value="team">Team Info</TabsTrigger>
          <TabsTrigger value="tryouts">My Tryout Cards</TabsTrigger>
        </TabsList>
        <TabsContent value="individual">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT: Player Development */}
        <div className="lg:col-span-8 space-y-5">
          {/* Skill Tests */}
          <Card className="adisal-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2"><Star className="w-4 h-4 text-blue-500" /> Skill Test History</CardTitle>
                <Button size="sm" variant="outline" asChild><Link to={createPageUrl("TestDayManager")}><Plus className="w-3.5 h-3.5 mr-1.5" /> Log Test</Link></Button>
              </div>
            </CardHeader>
            <CardContent>
              <SkillTestHistory playerId={playerId} benchmarks={benchmarks} scores={skillScores} />
            </CardContent>
          </Card>

          {/* Physical Assessments */}
          <Card className="adisal-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-emerald-500" /> Physical Assessment History</CardTitle>
                <Button size="sm" variant="outline" asChild><Link to={createPageUrl("TestDayManager")}><Plus className="w-3.5 h-3.5 mr-1.5" /> Log Assessment</Link></Button>
              </div>
            </CardHeader>
            <CardContent>
              <PhysicalAssessmentHistory playerId={playerId} benchmarks={benchmarks} gender={genderKey} assessments={physicalAssessments} />
            </CardContent>
          </Card>

          {/* Evaluations */}
          <Card className="adisal-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> E.P.I.C. Evaluation History</CardTitle>
                {canEditEval && <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={() => { setEditEval(null); setEvalOpen(true); }}><Plus className="w-3.5 h-3.5 mr-1.5" /> Create Evaluation</Button>}
              </div>
            </CardHeader>
            <CardContent>
              <EvaluationHistory playerId={playerId} evaluations={playerEvals} canEdit={canEditEval} onEdit={(ev) => { setEditEval(ev); setEvalOpen(true); }} />
            </CardContent>
          </Card>

          {/* Position Guide */}
          <Card className="adisal-card">
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Star className="size-4 text-primary" /> Coach Feedback</CardTitle></CardHeader>
            <CardContent><FeedbackHistory items={feedback} /></CardContent>
          </Card>

          <Card className="adisal-card">
            <CardHeader className="pb-3"><CardTitle className="text-sm">Position Guide — {player.position || "Unassigned"}</CardTitle></CardHeader>
            <CardContent><PositionKnowledge position={player.position} /></CardContent>
          </Card>
        </div>

        {/* RIGHT: Admin Info */}
        <div className="lg:col-span-4 space-y-5">
          {/* Personal Info */}
          <Card className="adisal-card">
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><IdCard className="w-4 h-4" /> Personal Information</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                <InfoRow label="DOB" value={player.date_of_birth ? format(new Date(player.date_of_birth), "MMM d, yyyy") : "—"} />
                <InfoRow label="Age" value={age != null ? `${age} years` : "—"} />
                <InfoRow label="Gender" value={player.gender || "—"} />
                <InfoRow label="Position" value={player.position || "—"} />
                <InfoRow label="Jersey #" value={player.jersey_number || "—"} />
                <InfoRow label="Location" value={player.location_name || "—"} />
                <InfoRow label="Program" value={player.program_title || "—"} />
              </div>
              {player.medical_notes && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1 mb-1"><Heart className="w-3.5 h-3.5" /> Medical Notes</p>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">{player.medical_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team */}
          <Card className="adisal-card">
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Trophy className="w-4 h-4" /> Team</CardTitle></CardHeader>
            <CardContent className="space-y-1.5">
              {team ? (
                <>
                  <Link to={`${createPageUrl("TeamDetail")}?id=${team.id}`}><p className="text-sm font-semibold hover:text-primary">{team.name}</p></Link>
                  <InfoRow label="Age Group" value={team.age_group || "—"} />
                  <InfoRow label="Gender" value={team.gender || "—"} />
                  <InfoRow label="Format" value={team.playing_format || "—"} />
                  <InfoRow label="Coach" value={team.coach_name || "—"} />
                </>
              ) : <p className="text-xs text-muted-foreground">No team assigned.</p>}
            </CardContent>
          </Card>

          {/* Coach Notes */}
          <CoachNotes player={player} playerId={playerId} canManage={canEditEval} guardians={allGuardians} evaluations={playerEvals} />

          {/* Guardian Details */}
          <Card className="adisal-card">
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4" /> {allGuardians.length > 1 ? `Guardians (${allGuardians.length})` : "Guardian"}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {allGuardians.length > 0 ? allGuardians.map((g, i) => (
                <div key={g.id} className={i < allGuardians.length - 1 ? "pb-3 border-b border-border space-y-2" : "space-y-2"}>
                  <InfoRow label="Name" value={`${g.first_name} ${g.last_name}`} />
                  <InfoRow label="Relationship" value={g.relationship ? g.relationship.charAt(0).toUpperCase() + g.relationship.slice(1) : "—"} />
                  <ContactActions email={g.email} phone={g.phone} onMessage={() => navigate(`${createPageUrl("CommunicationPortal")}?recipient_email=${encodeURIComponent(g.email || "")}&recipient_name=${encodeURIComponent(`${g.first_name || ""} ${g.last_name || ""}`.trim())}`)} className="pt-1" />
                </div>
              )) : <p className="text-xs text-muted-foreground">No guardian linked.</p>}
            </CardContent>
          </Card>

          {/* Registration & Payments */}
          <Card className="adisal-card">
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><DollarSign className="w-4 h-4" /> Registration & Payments</CardTitle></CardHeader>
            <CardContent>
              {reg ? (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium">{reg.program_title || "Registration"}</p>
                      <p className="text-[10px] text-muted-foreground">{reg.registration_date ? format(new Date(reg.registration_date), "MMM d, yyyy") : "—"}</p>
                    </div>
                    <div className="flex gap-1">
                      <Badge variant="outline" className={`text-[10px] capitalize ${PAY_COLORS[reg.payment_status] || ""}`}>{reg.payment_status}</Badge>
                      <Badge variant={reg.status === "approved" ? "default" : "secondary"} className="text-[10px] capitalize">{reg.status}</Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="surface-tile p-2"><p className="text-[10px] text-muted-foreground">Due</p><p className="text-sm font-semibold">${reg.amount_due || 0}</p></div>
                    <div className="surface-tile p-2"><p className="text-[10px] text-muted-foreground">Paid</p><p className="text-sm font-semibold text-emerald-600">${reg.amount_paid || 0}</p></div>
                    <div className="surface-tile p-2"><p className="text-[10px] text-muted-foreground">Outstanding</p><p className="text-sm font-semibold text-rose-600">${outstanding}</p></div>
                  </div>
                  <Progress value={paymentPct} className="h-1.5" />
                </div>
              ) : <p className="text-xs text-muted-foreground">No registration records.</p>}
            </CardContent>
          </Card>

          {/* Tryout History */}
          <Card className="adisal-card">
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><ClipboardCheck className="w-4 h-4" /> Tryout History</CardTitle></CardHeader>
            <CardContent className="space-y-1.5">
              {tryoutRegs.length === 0 ? <p className="text-xs text-muted-foreground text-center py-3">No tryout history.</p> : tryoutRegs.slice(0, 5).map((tr) => (
                <Link to={`${createPageUrl('PlayerDetail')}?id=${playerId}&tab=tryouts`} key={tr.id} className="flex items-center gap-2 p-2 surface-tile rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">{tr.player_name}</p>
                    <p className="text-[10px] text-muted-foreground">{tr.registered_date ? format(new Date(tr.registered_date), "MMM d, yyyy") : ""}</p>
                  </div>
                  {tr.attended && <Badge variant="default" className="text-[9px] px-1">Attended</Badge>}
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
        </TabsContent>
        <TabsContent value="team">
          <TeamInfoTab team={team} player={player} events={teamEvents} rosterPlayers={rosterPlayers} playerEvals={playerEvals} skillScores={skillScores} physicalAssessments={physicalAssessments} />
        </TabsContent>
        <TabsContent value="tryouts"><PlayerTryoutCards playerId={playerId} clubId={player.club_id} /></TabsContent>
      </Tabs>

      {/* ===== Dialogs ===== */}
      <PlayerEditDialog open={editOpen} onOpenChange={setEditOpen} player={player} onSaved={() => queryClient.invalidateQueries({ queryKey: ["player", playerId] })} />
      <CreateEvaluationDialog open={evalOpen} onOpenChange={(v) => { setEvalOpen(v); if (!v) setEditEval(null); }} player={player} latestPhysical={latestPhysical} benchmarks={benchmarks} evaluation={editEval} onSaved={() => { queryClient.invalidateQueries({ queryKey: ["player-evaluations", playerId] }); setEditEval(null); }} />
    </SubPageLayout>
  );
}

function ScoreTile({ label, value, suffix, color, highlight }) {
  return (
    <div className={`text-center flex flex-col justify-center ${highlight ? "bg-primary/5 rounded-lg" : ""}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-2xl font-extrabold ${color}`}>{value ?? "—"}{value != null && <span className="text-sm text-muted-foreground">{suffix}</span>}</p>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-right">{value}</span>
    </div>
  );
}