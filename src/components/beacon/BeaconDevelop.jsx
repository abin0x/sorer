import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Activity, Award, ChevronLeft, ChevronRight, Lock, Plus, Users, ClipboardList, StickyNote, MessageSquareHeart, Loader2, Pencil, Trash2, Sparkles, Video } from "lucide-react";
import { base44 } from "@/api/base44Client";
import BeaconPlayerTesting from "@/components/beacon/BeaconPlayerTesting";
import AudioDictation from "@/components/player/AudioDictation";
import { generateCoachFeedback } from "@/lib/coachFeedback";
import { useModuleAccess } from "@/lib/useModuleAccess";
import { useTerminology } from "@/hooks/useTerminology";
import { useTenant } from "@/lib/TenantContext";
import { haptic } from "@/lib/haptics";
import NativeSheet from "@/components/beacon/NativeSheet";
import { isTryoutStaff } from "@/components/beacon/BeaconTryouts";
import { accessibleTeams } from "@/lib/beaconTeamScope";
import {
  developmentRubric, overallScore, sectionAverage, SCORE_MAX,
  familyCanSeeEvaluation, familyCanSeeFeedback, familyCanSeeNote,
} from "@/lib/developmentRubric";

const name = (p) => `${p?.first_name || ""} ${p?.last_name || ""}`.trim() || "Player";
const day = (d) => (d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "");
const asList = (r) => (Array.isArray(r) ? r : []);

function Card({ children, className = "", onClick }) {
  const C = onClick ? "button" : "div";
  return <C onClick={onClick} className={`w-full text-left rounded-2xl border border-border bg-card p-4 shadow-sm ${onClick ? "active:scale-[0.98] transition" : ""} ${className}`}>{children}</C>;
}
const H = ({ children, action }) => (
  <div className="flex items-center justify-between mt-6 mb-2 px-1"><h2 className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">{children}</h2>{action}</div>
);
const Empty = ({ text }) => <Card className="py-8 text-center text-sm text-muted-foreground">{text}</Card>;
const Score = ({ v, big, onBrand = false }) => (
  <span className={`font-black tabular-nums ${big ? "text-4xl" : "text-lg"}`}>{v ?? "—"}<span className={`text-xs font-semibold ${onBrand ? "text-primary-foreground" : "text-muted-foreground"}`}>/{SCORE_MAX}</span></span>
);

/** Beacon Dashboard tab: Player Development for coaches (edit) and families (read-only, shared items only). */
export default function BeaconDevelop({ user, beacon, clubId }) {
  const { hasModule, loading } = useModuleAccess();
  const staff = isTryoutStaff(user);
  const [team, setTeam] = useState(null);
  const [player, setPlayer] = useState(null);
  const t = useTerminology();
  const players = asList(beacon.players);
  const myTeams = useMemo(() => accessibleTeams(beacon.teams, beacon.membership), [beacon.teams, beacon.membership]);
  const myKids = useMemo(() => {
    const gid = beacon.membership?.guardianRecord?.id;
    return players.filter((p) => (user?.player_id && p.id === user.player_id) || (gid && (p.guardian_ids?.length ? p.guardian_ids : [p.guardian_id]).includes(gid)));
  }, [players, beacon.membership, user]);

  if (loading) return <p className="mt-6 text-sm text-muted-foreground">Loading…</p>;
  if (!hasModule("development")) {
    return (<><h1 className="text-2xl font-bold mt-2">Dashboard</h1>
      <Card className="mt-4 text-center py-8"><Lock className="w-7 h-7 mx-auto text-muted-foreground" /><p className="mt-2 font-semibold">Player Development isn't turned on</p><p className="text-sm text-muted-foreground mt-1">Ask your club to activate it to see evaluations and feedback here.</p></Card></>);
  }
  if (player) return <PlayerView player={player} staff={staff} user={user} clubId={clubId} rubric={t} onBack={() => setPlayer(null)} />;

  if (!staff) {
    return (<>
      <h1 className="text-2xl font-bold mt-2">Dashboard</h1>
      <p className="text-sm text-muted-foreground">Evaluations and feedback from your coaches.</p>
      <H>{myKids.length === 1 ? "Your player" : "Your players"}</H>
      {!myKids.length ? <Empty text="No players are linked to your account yet." /> :
        <div className="space-y-2">{myKids.map((p) => <PlayerRow key={p.id} p={p} onClick={() => setPlayer(p)} />)}</div>}
    </>);
  }

  const teamObj = team && myTeams.find((x) => x.id === team);
  const roster = teamObj ? players.filter((p) => p.team_id === teamObj.id).sort((a, b) => name(a).localeCompare(name(b))) : [];
  return (<>
    {teamObj ? (
      <>
        <button onClick={() => setTeam(null)} className="mt-1 -ml-1 flex items-center gap-1 text-primary font-semibold min-h-[44px]"><ChevronLeft className="w-5 h-5" />Teams</button>
        <h1 className="text-2xl font-bold">{teamObj.name}</h1>
        <p className="text-sm text-muted-foreground">{roster.length} players · tap a player to evaluate</p>
        <H>Roster</H>
        {!roster.length ? <Empty text="No players on this team yet." /> :
          <div className="space-y-2">{roster.map((p) => <PlayerRow key={p.id} p={p} onClick={() => setPlayer(p)} />)}</div>}
      </>
    ) : (
      <>
        <h1 className="text-2xl font-bold mt-2">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Team and player development.</p>
        <H>Your teams</H>
        {!myTeams.length ? <Empty text="You aren't assigned to a team yet." /> :
          <div className="space-y-2">{myTeams.map((tm) => {
            const n = players.filter((p) => p.team_id === tm.id).length;
            return <Card key={tm.id} onClick={() => { haptic(); setTeam(tm.id); }} className="flex items-center gap-3"><div className="w-11 h-11 rounded-xl bg-primary/10 text-primary grid place-items-center"><Users className="w-5 h-5" /></div><div className="flex-1 min-w-0"><div className="font-semibold truncate">{tm.name}</div><div className="text-xs text-muted-foreground">{n} players{tm.age_group ? ` · ${tm.age_group}` : ""}</div></div><ChevronRight className="w-4 h-4 text-muted-foreground" /></Card>;
          })}</div>}
      </>
    )}
  </>);
}

function PlayerRow({ p, onClick }) {
  return (
    <Card onClick={() => { haptic(); onClick(); }} className="flex items-center gap-3 py-3">
      {p.photo_url ? <img src={p.photo_url} alt="" className="w-11 h-11 rounded-full object-cover" /> :
        <div className="w-11 h-11 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold">{(p.first_name || "?")[0]}</div>}
      <div className="flex-1 min-w-0"><div className="font-semibold truncate">{name(p)}</div><div className="text-xs text-muted-foreground truncate">{[p.jersey_number && `#${p.jersey_number}`, p.position, p.team_name].filter(Boolean).join(" · ")}</div></div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </Card>
  );
}

function PlayerView({ player, staff, user, clubId, onBack }) {
  const tenant = useTenant();
  const rubric = useMemo(() => developmentRubric((tenant.club || tenant.userClub)?.terminology?.development_rubric), [tenant.club, tenant.userClub]);
  const [seg, setSeg] = useState("evals");
  const [edit, setEdit] = useState(null); // { kind, row, test }
  const [selectedNoteIds, setSelectedNoteIds] = useState([]);
  const [generating, setGenerating] = useState(false);
  const qc = useQueryClient();
  const scope = { player_id: player.id, club_id: clubId || player.club_id };
  const q = (entity, key) => useQuery({ queryKey: ["beacon-dev", key, player.id], queryFn: () => base44.entities[entity].filter(scope, "-created_date", 100).catch(() => []) });
  const evalsQ = q("PlayerEvaluation", "evals");
  const notesQ = q("PlayerNote", "notes");
  const fbQ = q("PlayerFeedback", "feedback");
  const videosQ = useQuery({
    queryKey: ["beacon-dev", "feedback-videos", scope.club_id],
    enabled: staff && !!scope.club_id,
    queryFn: () => base44.entities.TrainingVideo.filter({ club_id: scope.club_id }, "-order", 100).catch(() => []),
  });
  const curriculumQ = useQuery({
    queryKey: ["beacon-dev", "feedback-curriculum", scope.club_id],
    enabled: staff && !!scope.club_id,
    queryFn: () => base44.entities.CurriculumDocument.filter({ club_id: scope.club_id, is_active: true }, "-created_date", 50).catch(() => []),
  });
  const evals = asList(evalsQ.data).filter((e) => staff || familyCanSeeEvaluation(e));
  const notes = asList(notesQ.data).filter((n) => (staff ? n.visibility !== "draft_for_feedback" : familyCanSeeNote(n)));
  const feedback = asList(fbQ.data).filter((f) => staff || familyCanSeeFeedback(f));
  const latest = evals[0];
  const refresh = () => qc.invalidateQueries({ queryKey: ["beacon-dev"] });
  const segs = [["evals", "Evals", ClipboardList, evals.length], ["skills", "Skills", Award], ["physical", "Physical", Activity], ["notes", "Notes", StickyNote, notes.length], ["feedback", "Feedback", MessageSquareHeart, feedback.length]];
  const addLabels = { evals: "New evaluation", skills: "Log skill score", physical: "Log physical assessment", notes: "Add note", feedback: "Write feedback" };

  const createDraft = async (noteRows) => {
    const created = await generateCoachFeedback({
      player,
      clubId: scope.club_id,
      notes: noteRows,
      evaluations: evals,
      videos: asList(videosQ.data),
      curriculumDocs: asList(curriculumQ.data),
      userEmail: user?.email,
      invokeLLM: (request) => base44.integrations.Core.InvokeLLM(request),
      createFeedback: (payload) => base44.entities.PlayerFeedback.create(payload),
    });
    await refresh();
    setSelectedNoteIds([]);
    setSeg("feedback");
    setEdit({ kind: "feedback", row: created });
    return created;
  };

  const generateSelected = async () => {
    const selected = notes.filter((note) => selectedNoteIds.includes(note.id));
    if (!selected.length) return;
    setGenerating(true);
    try {
      await createDraft(selected);
      haptic("success");
      toast.success(`Feedback draft created from ${selected.length} note${selected.length === 1 ? "" : "s"}`);
    } catch (error) {
      toast.error(error?.message || "Couldn't generate feedback. Your notes are still saved.");
    } finally { setGenerating(false); }
  };

  const toggleNote = (id) => setSelectedNoteIds((current) => current.includes(id) ? current.filter((noteId) => noteId !== id) : [...current, id]);

  return (<>
    <button onClick={onBack} className="mt-1 -ml-1 flex items-center gap-1 text-primary font-semibold min-h-[44px]"><ChevronLeft className="w-5 h-5" />Back</button>
    <div className="flex items-center gap-3">
      {player.photo_url ? <img src={player.photo_url} alt="" className="w-16 h-16 rounded-full object-cover" /> :
        <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground grid place-items-center text-2xl font-black">{(player.first_name || "?")[0]}</div>}
      <div className="min-w-0"><h1 className="text-2xl font-bold truncate">{name(player)}</h1><p className="text-sm text-muted-foreground truncate">{[player.position, player.team_name].filter(Boolean).join(" · ")}</p></div>
    </div>

    <Card className="mt-4 bg-primary text-primary-foreground border-primary">
      <div className="flex items-end justify-between gap-3">
        <div><div className="text-xs font-semibold uppercase">Latest overall</div><Score v={latest?.overall_score ?? null} big onBrand /></div>
        <div className="text-xs text-right">{latest ? day(latest.evaluation_date || latest.created_date) : "No evaluation yet"}</div>
      </div>
      <div className="mt-3 space-y-2">
        {rubric.map((s) => { const v = sectionAverage(latest?.[s.field]); return (
          <div key={s.field}><div className="flex justify-between text-xs font-semibold"><span>{s.name}</span><span>{v ?? "—"}</span></div>
            <div className="h-2 rounded-full bg-primary-foreground/25 overflow-hidden"><div className="h-full bg-primary-foreground" style={{ width: `${((v || 0) / SCORE_MAX) * 100}%` }} /></div></div>); })}
      </div>
    </Card>

    <div className="mt-4 grid grid-cols-5 gap-1 rounded-xl bg-muted p-1" role="tablist" aria-label="Player development sections">
      {segs.map(([k, l, , n]) => <button key={k} role="tab" aria-selected={seg === k} onClick={() => { haptic(); setSeg(k); setEdit(null); setSelectedNoteIds([]); }} className={`rounded-lg px-0.5 py-2 text-[10px] sm:text-xs font-bold min-h-[44px] ${seg === k ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>{l}{n ? ` · ${n}` : ""}</button>)}
    </div>

    {staff && <button disabled={generating} onClick={() => { haptic(); setEdit({ kind: seg, row: null }); }} className="mt-3 w-full rounded-xl bg-primary text-primary-foreground py-3 font-semibold flex items-center justify-center gap-2 min-h-[48px] disabled:opacity-40"><Plus className="w-4 h-4" />{addLabels[seg]}</button>}

    {staff && seg === "notes" && selectedNoteIds.length > 0 && (
      <button disabled={generating} onClick={generateSelected} className="mt-2 w-full rounded-xl border border-primary bg-primary/10 text-primary py-3 font-semibold flex items-center justify-center gap-2 min-h-[48px] disabled:opacity-40">
        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {generating ? "Creating your draft…" : `Generate feedback from ${selectedNoteIds.length} note${selectedNoteIds.length === 1 ? "" : "s"}`}
      </button>
    )}

    {(seg === "skills" || seg === "physical") && <div className="mt-3"><BeaconPlayerTesting mode={seg} player={player} staff={staff} user={user} scope={scope} edit={edit} setEdit={setEdit} onSaved={refresh} /></div>}

    {seg !== "skills" && seg !== "physical" && <div className="mt-3 space-y-2">
      {seg === "evals" && (!evals.length ? <Empty text="No evaluations yet." /> : evals.map((e) => (
        <Card key={e.id} onClick={() => setEdit({ kind: "evals", row: e, readOnly: !staff })}>
          <div className="flex items-center justify-between"><div><div className="font-semibold">{day(e.evaluation_date || e.created_date)}</div><div className="text-xs text-muted-foreground">{e.primary_position || ""}{e.status === "draft" ? " · Draft (coaches only)" : ""}</div></div><Score v={e.overall_score} /></div>
          {e.strengths && <p className="text-sm mt-2 line-clamp-2"><b>Strengths:</b> {e.strengths}</p>}
        </Card>)))}
      {seg === "notes" && (!notes.length ? <Empty text={staff ? "No notes yet. Add or dictate one to start a feedback draft." : "No shared notes yet."} /> : notes.map((n) => (
        <Card key={n.id} className={selectedNoteIds.includes(n.id) ? "border-primary bg-primary/5" : ""}>
          <div className="flex items-start gap-3">
            {staff && <label className="min-w-[44px] min-h-[44px] -ml-2 -mt-2 grid place-items-center cursor-pointer">
              <input type="checkbox" aria-label={`Select note from ${day(n.created_date) || "coach"}`} checked={selectedNoteIds.includes(n.id)} onChange={() => toggleNote(n.id)} className="w-5 h-5 accent-[hsl(var(--primary))]" />
            </label>}
            <button type="button" disabled={!staff} onClick={() => staff && setEdit({ kind: "notes", row: n })} className="flex-1 min-w-0 text-left disabled:cursor-default">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="font-semibold text-foreground">{n.author_name || n.author_email || "Coach"}</span><span>{day(n.created_date)}</span>{n.visibility === "internal_only" && <span className="ml-auto inline-flex items-center gap-1"><Lock className="w-3 h-3" />Staff only</span>}</div>
              <p className="text-sm mt-1 whitespace-pre-wrap">{n.note_text}</p>
            </button>
          </div>
        </Card>)))}
      {seg === "feedback" && (!feedback.length ? <Empty text="No feedback yet. Select coach notes to generate a draft, or write your own." /> : feedback.map((f) => (
        <Card key={f.id} onClick={staff ? () => setEdit({ kind: "feedback", row: f }) : undefined}>
          <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{day(f.sent_at || f.created_date)}</span>{f.status !== "sent" && <span className="font-semibold text-foreground">Draft · review before sending</span>}</div>
          <p className="text-sm mt-1 whitespace-pre-wrap">{f.feedback_text}</p>
          {f.suggested_goal_description && <p className="text-xs mt-2 rounded-lg bg-primary/10 text-primary p-2 font-medium">Goal: {f.suggested_goal_description}</p>}
        </Card>)))}
    </div>}

    {edit?.kind === "evals" && <EvalSheet row={edit.row} readOnly={edit.readOnly} rubric={rubric} player={player} user={user} scope={scope} onClose={() => setEdit(null)} onSaved={refresh} />}
    {edit?.kind === "notes" && <NoteSheet row={edit.row} player={player} user={user} scope={scope} onClose={() => setEdit(null)} onSaved={refresh} onGenerate={createDraft} />}
    {edit?.kind === "feedback" && <FeedbackSheet row={edit.row} player={player} user={user} scope={scope} onClose={() => setEdit(null)} onSaved={refresh} />}
  </>);
}

function ScoreRow({ label, value, onChange, readOnly }) {
  return (
    <div className="py-2">
      <div className="flex justify-between text-sm"><span className="font-medium">{label}</span><span className="font-black tabular-nums">{value ?? "—"}</span></div>
      <div className="mt-1.5 grid grid-cols-10 gap-1">
        {Array.from({ length: SCORE_MAX }, (_, i) => i + 1).map((n) => (
          <button key={n} type="button" disabled={readOnly} aria-label={`${label} ${n}`} aria-pressed={value === n}
            onClick={() => { haptic(); onChange(value === n ? undefined : n); }}
            className={`h-9 rounded-md text-xs font-bold ${value != null && n <= value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"} disabled:opacity-100`}>{n}</button>
        ))}
      </div>
    </div>
  );
}

const Area = ({ label, value, onChange, readOnly, rows = 3 }) => {
  const id = React.useId();
  return <label htmlFor={id} className="block mt-3"><span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
    {readOnly ? <p className="text-sm mt-1 whitespace-pre-wrap">{value || "—"}</p> :
      <textarea id={id} value={value || ""} onChange={(e) => onChange(e.target.value)} rows={rows} className="mt-1 w-full rounded-xl border border-border bg-card p-3 text-base outline-none focus:ring-2 focus:ring-ring" />}
  </label>;
};

async function run(fn, onSaved, onClose, setBusy, msg) {
  setBusy(true);
  try { await fn(); haptic("success"); toast.success(msg); onSaved(); onClose(); }
  catch (e) { toast.error(e?.message || "Couldn't save. Check your connection and try again."); }
  finally { setBusy(false); }
}

function EvalSheet({ row, readOnly, rubric, player, user, scope, onClose, onSaved }) {
  const [f, setF] = useState(() => ({
    technical_scores: { ...(row?.technical_scores || {}) }, tactical_scores: { ...(row?.tactical_scores || {}) }, mental_scores: { ...(row?.mental_scores || {}) },
    strengths: row?.strengths || "", areas_of_growth: row?.areas_of_growth || "", training_focus: row?.training_focus || "",
    evaluation_date: row?.evaluation_date || new Date().toISOString().slice(0, 10),
  }));
  const [busy, setBusy] = useState(false);
  const set = (field, key, v) => setF((p) => { const s = { ...p[field] }; if (v == null) delete s[key]; else s[key] = v; return { ...p, [field]: s }; });
  const overall = overallScore(f);
  const save = (status) => run(async () => {
    const payload = { ...f, ...scope, status, overall_score: overall, player_name: name(player), primary_position: row?.primary_position || player.position || null, evaluator_email: row?.evaluator_email || user?.email };
    if (row?.id) await base44.entities.PlayerEvaluation.update(row.id, payload); else await base44.entities.PlayerEvaluation.create(payload);
  }, onSaved, onClose, setBusy, status === "draft" ? "Draft saved" : "Evaluation saved");
  return (
    <NativeSheet open onClose={() => !busy && onClose()} title={readOnly ? "Evaluation" : row ? "Edit evaluation" : "New evaluation"}>
      <div className="flex items-center justify-between rounded-xl bg-muted p-3"><span className="text-sm font-semibold">Overall</span><Score v={overall} /></div>
      {rubric.map((s) => (
        <section key={s.field} className="mt-4">
          <h3 className="text-sm font-black uppercase tracking-wide text-primary">{s.name}</h3>
          {s.groups.map((g, i) => (
            <div key={g.name || i}>{g.name && <div className="mt-2 text-[11px] font-bold uppercase text-muted-foreground">{g.name}</div>}
              {g.items.map((it) => <ScoreRow key={it.key} label={it.letter ? `${it.letter} — ${it.label}` : it.label} value={f[s.field][it.key]} onChange={(v) => set(s.field, it.key, v)} readOnly={readOnly} />)}</div>
          ))}
        </section>
      ))}
      <Area label="Strengths" value={f.strengths} onChange={(v) => setF({ ...f, strengths: v })} readOnly={readOnly} />
      <Area label="Areas of growth" value={f.areas_of_growth} onChange={(v) => setF({ ...f, areas_of_growth: v })} readOnly={readOnly} />
      <Area label="Training focus" value={f.training_focus} onChange={(v) => setF({ ...f, training_focus: v })} readOnly={readOnly} rows={2} />
      {!readOnly && (
        <div className="mt-4 grid grid-cols-2 gap-2 sticky bottom-0 bg-background py-2">
          <button disabled={busy} onClick={() => save("draft")} className="rounded-xl border border-border py-3 font-semibold min-h-[48px]">Save draft</button>
          <button disabled={busy || overall == null} onClick={() => save("completed")} className="rounded-xl bg-primary text-primary-foreground py-3 font-semibold min-h-[48px] disabled:opacity-40 flex items-center justify-center gap-2">{busy && <Loader2 className="w-4 h-4 animate-spin" />}Save & share</button>
        </div>
      )}
    </NativeSheet>
  );
}

function NoteSheet({ row, player, user, scope, onClose, onSaved, onGenerate }) {
  const [text, setText] = useState(row?.note_text || "");
  const [shared, setShared] = useState(row ? row.visibility === "shared" : false);
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const persist = async (visibility) => {
    const payload = { ...scope, note_text: text.trim(), visibility, player_name: name(player) };
    if (row?.id) {
      const updated = await base44.entities.PlayerNote.update(row.id, payload);
      return updated || { ...row, ...payload };
    }
    return base44.entities.PlayerNote.create({ ...payload, author_email: user?.email, author_name: user?.full_name, context: row?.context || "beacon", tags: row?.tags || [] });
  };
  const save = () => run(() => persist(shared ? "shared" : "internal_only"), onSaved, onClose, setBusy, "Note saved");
  const generate = async () => {
    setGenerating(true);
    let saved;
    try {
      saved = await persist(row ? row.visibility : "internal_only");
      onSaved();
    } catch (error) {
      toast.error(error?.message || "Save the note before generating feedback.");
      setGenerating(false);
      return;
    }
    try {
      await onGenerate([saved]);
      haptic("success");
      toast.success("Feedback draft ready to review");
    } catch (error) {
      toast.error(error?.message || "Note saved, but feedback couldn't be generated. Try again from the Notes tab.");
    } finally { setGenerating(false); }
  };
  const del = () => run(() => base44.entities.PlayerNote.delete(row.id), onSaved, onClose, setBusy, "Note deleted");
  const working = busy || generating;
  return (
    <NativeSheet open onClose={() => !working && onClose()} title={row ? "Edit note" : "New note"}>
      <Area label="Note" value={text} onChange={setText} rows={5} />
      <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-muted px-3 py-2">
        <span className="text-xs text-muted-foreground">Speak naturally—your dictation is added above.</span>
        <AudioDictation onTranscript={(part) => setText((current) => (current ? `${current.trimEnd()} ` : "") + part)} disabled={working} />
      </div>
      <label className="mt-3 flex items-center justify-between rounded-xl bg-muted p-3 min-h-[48px]"><span className="text-sm font-medium">Share with player & family</span><input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} className="w-5 h-5 accent-[hsl(var(--primary))]" /></label>
      <p className="text-xs text-muted-foreground mt-1 px-1">{shared ? "Family will see this note." : "Only staff will see this note."}</p>
      <button disabled={working || !text.trim()} onClick={save} className="mt-4 w-full rounded-xl bg-primary text-primary-foreground py-3 font-semibold min-h-[48px] disabled:opacity-40"><Pencil className="w-4 h-4 inline mr-1" />Save note</button>
      <button disabled={working || !text.trim()} onClick={generate} className="mt-2 w-full rounded-xl border border-primary bg-primary/10 text-primary py-3 font-semibold min-h-[48px] disabled:opacity-40 flex items-center justify-center gap-2">
        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}{generating ? "Saving note & creating draft…" : "Save & generate feedback"}
      </button>
      <p className="mt-2 text-center text-xs text-muted-foreground">The draft stays private until you review and send it.</p>
      {row?.id && <button disabled={working} onClick={del} className="mt-2 w-full rounded-xl py-3 font-semibold text-destructive min-h-[48px]"><Trash2 className="w-4 h-4 inline mr-1" />Delete note</button>}
    </NativeSheet>
  );
}

function FeedbackSheet({ row, player, user, scope, onClose, onSaved }) {
  const [text, setText] = useState(row?.feedback_text || "");
  const [strengths, setStrengths] = useState((row?.strengths || []).join("\n"));
  const [priorities, setPriorities] = useState((row?.development_priorities || []).join("\n"));
  const [goal, setGoal] = useState(row?.suggested_goal_description || "");
  const [goalTarget, setGoalTarget] = useState(row?.suggested_goal_target || "");
  const [videoIds, setVideoIds] = useState((row?.recommended_videos || []).map((video) => video.video_id));
  const [busy, setBusy] = useState(false);
  const alreadySent = row?.status === "sent";
  const lines = (value) => value.split("\n").map((item) => item.trim()).filter(Boolean);
  const save = (send) => run(async () => {
    const payload = {
      ...scope,
      feedback_text: text.trim(),
      strengths: lines(strengths),
      development_priorities: lines(priorities),
      recommended_videos: (row?.recommended_videos || []).filter((video) => videoIds.includes(video.video_id)),
      suggested_goal_description: goal.trim() || null,
      suggested_goal_target: goalTarget.trim() || null,
      player_name: name(player),
      status: send || alreadySent ? "sent" : "draft",
      ...(send ? { sent_at: new Date().toISOString(), approved_by: user?.email } : {}),
      ...(!row?.id ? { created_by: user?.email } : {}),
    };
    if (row?.id) await base44.entities.PlayerFeedback.update(row.id, payload); else await base44.entities.PlayerFeedback.create(payload);
  }, onSaved, onClose, setBusy, send ? "Feedback sent to family" : alreadySent ? "Feedback updated" : "Draft saved");
  const discard = () => run(() => base44.entities.PlayerFeedback.delete(row.id), onSaved, onClose, setBusy, "Draft discarded");
  return (
    <NativeSheet open onClose={() => !busy && onClose()} title={alreadySent ? "Sent feedback" : row ? "Review feedback draft" : "Write feedback"}>
      {row && !alreadySent && <div className="mb-3 flex gap-2 rounded-xl bg-primary/10 p-3 text-sm text-primary"><Sparkles className="w-5 h-5 shrink-0" /><span>Review and edit this private draft. Families won’t see it until you tap <b>Send to family</b>.</span></div>}
      <Area label="Strengths (one per line)" value={strengths} onChange={setStrengths} rows={3} />
      <Area label="Development priorities (one per line)" value={priorities} onChange={setPriorities} rows={3} />
      <Area label="Feedback for the player" value={text} onChange={setText} rows={5} />
      <div className="mt-2 flex justify-end rounded-xl bg-muted px-3 py-2"><AudioDictation onTranscript={(part) => setText((current) => (current ? `${current.trimEnd()} ` : "") + part)} disabled={busy} /></div>
      {(row?.recommended_videos || []).length > 0 && <section className="mt-4">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground"><Video className="w-4 h-4" />Recommended training videos</h3>
        <div className="mt-2 space-y-2">{row.recommended_videos.map((video) => <label key={video.video_id} className="flex items-start gap-3 rounded-xl bg-muted p-3 min-h-[48px]">
          <input type="checkbox" aria-label={`Include ${video.title}`} checked={videoIds.includes(video.video_id)} onChange={() => setVideoIds((current) => current.includes(video.video_id) ? current.filter((id) => id !== video.video_id) : [...current, video.video_id])} className="mt-0.5 w-5 h-5 shrink-0 accent-[hsl(var(--primary))]" />
          <span><span className="block text-sm font-semibold">{video.title}</span>{video.reason && <span className="block text-xs text-muted-foreground mt-0.5">{video.reason}</span>}</span>
        </label>)}</div>
      </section>}
      <Area label="Goal (optional)" value={goal} onChange={setGoal} rows={2} />
      <Area label="Measurable target (optional)" value={goalTarget} onChange={setGoalTarget} rows={2} />
      {alreadySent ? <button disabled={busy || !text.trim()} onClick={() => save(false)} className="mt-4 w-full rounded-xl bg-primary text-primary-foreground py-3 font-semibold min-h-[48px] disabled:opacity-40">Save changes</button> : <>
        <div className="mt-4 grid grid-cols-2 gap-2 sticky bottom-0 bg-background py-2">
          <button disabled={busy || !text.trim()} onClick={() => save(false)} className="rounded-xl border border-border py-3 font-semibold min-h-[48px] disabled:opacity-40">Save draft</button>
          <button disabled={busy || !text.trim()} onClick={() => save(true)} className="rounded-xl bg-primary text-primary-foreground py-3 font-semibold min-h-[48px] disabled:opacity-40">{busy ? <Loader2 className="w-4 h-4 animate-spin inline" /> : "Send to family"}</button>
        </div>
        {row?.id && <button disabled={busy} onClick={discard} className="mt-2 w-full rounded-xl py-3 font-semibold text-destructive min-h-[48px]"><Trash2 className="w-4 h-4 inline mr-1" />Discard draft</button>}
      </>}
    </NativeSheet>
  );
}
