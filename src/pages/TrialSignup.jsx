import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from '@/lib/router-compat';
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Mail, Users, PartyPopper, Loader2, ChevronLeft, Calendar, HeartHandshake, Activity, ClipboardCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import FoundingClubsCard from "@/components/public/FoundingClubsCard";

// System console primary color (applied to --primary CSS var by TenantBrandingProvider)
const p = (a = 1) => `hsl(var(--primary)${a < 1 ? ` / ${a}` : ""})`;
const sports = ["Soccer", "Basketball", "Baseball", "Softball", "Volleyball", "Football", "Lacrosse", "Hockey", "Other"];

const demoOptions = [
  { key: "generateSchedule", icon: Calendar, label: "Weekly schedule", desc: "2 training sessions + 1 game per week for the next 2 months" },
  { key: "generateGuardians", icon: HeartHandshake, label: "2 guardians per player", desc: "Parent/guardian contacts linked to every player" },
  { key: "generateEpic", icon: Activity, label: "E.P.I.C. & test results", desc: "Physical assessments and skill test scores for each player" },
  { key: "generateEvaluations", icon: ClipboardCheck, label: "Evaluations & feedback", desc: "E.P.I.C. evaluations and coach feedback for each player" },
];

export default function TrialSignup() {
  const [searchParams] = useSearchParams();
  const initialStep = parseInt(searchParams.get("step") || "1", 10);

  const [step, setStep] = useState(initialStep);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [genSummary, setGenSummary] = useState(null);

  const [clubName, setClubName] = useState("");
  const [branchCount, setBranchCount] = useState("1");
  const [sport, setSport] = useState("Soccer");
  const [inviteEmails, setInviteEmails] = useState([""]);
  const [demoOpts, setDemoOpts] = useState({ generateSchedule: true, generateGuardians: true, generateEpic: true, generateEvaluations: true });

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (isAuthed) => {
      if (isAuthed) {
        try { await base44.auth.me(); setStep((s) => Math.max(s, 2)); } catch { /* ignore */ }
      }
      setCheckingAuth(false);
    });
  }, []);

  const handleGoogleSignup = () => {
    base44.analytics.track({ eventName: "signup_start", properties: { source: "trial_google" } });
    base44.auth.loginWithProvider("google", window.location.pathname + "?step=2");
  };

  const handleClubBasicsNext = (e) => {
    e.preventDefault();
    if (!clubName.trim()) { setError("Please enter your club name"); return; }
    setError(""); setStep(3);
  };

  const handleInviteNext = async (e) => {
    e?.preventDefault();
    setError(""); setLoading(true);
    try {
      const cleanInvites = inviteEmails.map((em) => em.trim()).filter((em) => em && /\S+@\S+\.\S+/.test(em));
      base44.analytics.track({ eventName: "signup_complete", properties: { branch_count: branchCount, sport } });
      await base44.functions.invoke("start-trial", { clubName: clubName.trim(), branchCount, sport, inviteEmails: cleanInvites });
      setStep(4);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Something went wrong. Please try again.");
    } finally { setLoading(false); }
  };

  const handleGenerateDemo = async () => {
    setError(""); setLoading(true);
    try {
      const res = await base44.functions.invoke("generate-demo-data", demoOpts);
      setGenSummary(res.data?.summary || {});
      setStep(5);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Failed to generate demo data. You can still enter your dashboard.");
      setStep(5);
    } finally { setLoading(false); }
  };

  const addInviteField = () => setInviteEmails([...inviteEmails, ""]);
  const updateInvite = (i, val) => setInviteEmails(inviteEmails.map((e, j) => (j === i ? val : e)));
  const removeInvite = (i) => setInviteEmails(inviteEmails.filter((_, j) => j !== i));

  if (checkingAuth) {
    return (
      <div className="min-h-screen wellness-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: p() }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen wellness-bg text-slate-800">
      <nav className="sticky top-0 z-50 glass-wellness border-b border-slate-200/60">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0">
              <img src="https://media.base44.com/images/public/690d4c6dccfb0f4e79c33a38/10cb8fa25_app-icon1.png" alt="ClubRudder" className="w-full h-full object-cover" />
            </div>
            <span className="font-extrabold text-lg text-slate-900">ClubRudder</span>
          </Link>
          <Link to="/walkthrough" className="text-sm font-semibold text-slate-700 hover:opacity-70" style={{ color: p() }}>Tours</Link>
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-6 py-12">
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="h-2 rounded-full transition-all duration-300" style={{
              width: s === step ? 36 : 8,
              background: s <= step ? p() : "hsl(220 14% 80%)",
            }} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1 — Auth */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-extrabold mb-3 text-slate-900">Start your free trial</h1>
                <p className="text-slate-700">30 days. Full access. No credit card.</p>
              </div>
              <div className="bg-white rounded-2xl soft-shadow p-8 border border-slate-200">
                <button onClick={handleGoogleSignup} className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-lg border-2 border-slate-300 font-bold text-slate-800 hover:bg-slate-50 transition-colors min-h-[44px]">
                  <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
                  Continue with Google
                </button>
                <div className="flex items-center gap-3 my-6">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-xs text-slate-500 font-semibold">OR</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
                <Link to="/register?returnTo=/trial-signup?step=2">
                  <button className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-bold text-white transition-opacity hover:opacity-90 min-h-[44px]" style={{ background: p() }}>
                    <Mail className="w-4 h-4" /> Sign up with email
                  </button>
                </Link>
                <p className="text-center text-sm text-slate-600 mt-4">
                  Already have an account? <Link to="/login?returnTo=/trial-signup?step=2" className="font-semibold hover:underline" style={{ color: p() }}>Log in</Link>
                </p>
              </div>
              <div className="mt-6"><FoundingClubsCard ctaLabel="Claim your spot" /></div>
            </motion.div>
          )}

          {/* Step 2 — Club Basics */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="text-center mb-8">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: p(0.12) }}>
                  <Users className="w-6 h-6" style={{ color: p() }} />
                </div>
                <h1 className="text-3xl font-extrabold mb-2 text-slate-900">Tell us about your club</h1>
                <p className="text-slate-700">We'll pre-seed your account to match.</p>
              </div>
              <form onSubmit={handleClubBasicsNext} className="bg-white rounded-2xl soft-shadow p-8 space-y-5 border border-slate-200">
                <div>
                  <Label className="mb-1.5 block text-slate-800">Club Name</Label>
                  <Input value={clubName} onChange={(e) => setClubName(e.target.value)} placeholder="e.g. Riverside Soccer Club" className="min-h-[44px]" />
                </div>
                <div>
                  <Label className="mb-1.5 block text-slate-800">Number of Branches</Label>
                  <Select value={branchCount} onValueChange={setBranchCount}>
                    <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 branch</SelectItem>
                      <SelectItem value="2-5">2–5 branches</SelectItem>
                      <SelectItem value="6-10">6–10 branches</SelectItem>
                      <SelectItem value="10+">10+ branches</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block text-slate-800">Primary Sport</Label>
                  <Select value={sport} onValueChange={setSport}>
                    <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {sports.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
                <Button type="submit" className="w-full min-h-[44px] text-white" style={{ background: p() }}>
                  Continue <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </form>
            </motion.div>
          )}

          {/* Step 3 — Invite Team */}
          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="text-center mb-8">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: p(0.12) }}>
                  <Mail className="w-6 h-6" style={{ color: p() }} />
                </div>
                <h1 className="text-3xl font-extrabold mb-2 text-slate-900">Invite your team</h1>
                <p className="text-slate-700">Optional — invite coaches or admins to get everyone in faster.</p>
              </div>
              <form onSubmit={handleInviteNext} className="bg-white rounded-2xl soft-shadow p-8 space-y-4 border border-slate-200">
                {inviteEmails.map((email, i) => (
                  <div key={i} className="flex gap-2">
                    <Input type="email" value={email} onChange={(e) => updateInvite(i, e.target.value)} placeholder="coach@yourclub.com" className="min-h-[44px]" />
                    {inviteEmails.length > 1 && (
                      <Button type="button" variant="outline" size="icon" className="shrink-0 min-h-[44px] min-w-[44px]" onClick={() => removeInvite(i)}>
                        <ChevronLeft className="w-4 h-4 rotate-45" />
                      </Button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addInviteField} className="text-sm font-bold hover:underline" style={{ color: p() }}>+ Add another</button>
                {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1 min-h-[44px]" onClick={() => setStep(2)}>Back</Button>
                  <Button type="submit" disabled={loading} className="flex-1 min-h-[44px] text-white" style={{ background: p() }}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4 ml-1" /></>}
                  </Button>
                </div>
                <button type="button" onClick={() => handleInviteNext()} className="w-full text-sm text-slate-600 hover:text-slate-800 font-semibold pt-1">Skip for now</button>
              </form>
            </motion.div>
          )}

          {/* Step 4 — Demo Data Setup */}
          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="text-center mb-8">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: p(0.12) }}>
                  <Sparkles className="w-6 h-6" style={{ color: p() }} />
                </div>
                <h1 className="text-3xl font-extrabold mb-2 text-slate-900">Set up your demo club</h1>
                <p className="text-slate-700">We'll create up to <strong>4 teams per gender per branch</strong> with full rosters. Pick what else you'd like generated.</p>
              </div>
              <div className="bg-white rounded-2xl soft-shadow p-8 space-y-4 border border-slate-200">
                <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: p(0.08) }}>
                  <Check className="w-5 h-5" style={{ color: p() }} />
                  <span className="text-sm font-semibold text-slate-800">Teams & players for each branch (always included)</span>
                </div>
                {demoOptions.map((opt) => {
                  const Icon = opt.icon;
                  const checked = demoOpts[opt.key];
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setDemoOpts({ ...demoOpts, [opt.key]: !checked })}
                      className={`w-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-colors ${checked ? "border-transparent" : "border-slate-200"}`}
                      style={checked ? { background: p(0.08), borderColor: p() } : {}}
                    >
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-colors ${checked ? "text-white" : "border-2 border-slate-300"}`} style={checked ? { background: p() } : {}}>
                        {checked && <Check className="w-3 h-3" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-slate-700" />
                          <span className="font-bold text-slate-900">{opt.label}</span>
                        </div>
                        <p className="text-sm text-slate-600 mt-0.5">{opt.desc}</p>
                      </div>
                    </button>
                  );
                })}
                {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
                <Button onClick={handleGenerateDemo} disabled={loading} className="w-full min-h-[44px] text-white" style={{ background: p() }}>
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Generating your demo club…</> : <>Generate my demo club <ArrowRight className="w-4 h-4 ml-1" /></>}
                </Button>
                <button onClick={() => setStep(5)} className="w-full text-sm text-slate-600 hover:text-slate-800 font-semibold">Skip — I'll set it up myself</button>
              </div>
            </motion.div>
          )}

          {/* Step 5 — Confirmation */}
          {step === 5 && (
            <motion.div key="s5" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: "spring" }} className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: p() }}>
                  <PartyPopper className="w-8 h-8 text-white" />
                </motion.div>
                <h1 className="text-3xl font-extrabold mb-3 text-slate-900">{genSummary ? "Your demo club is ready!" : "Your trial starts now!"}</h1>
                <p className="text-slate-700 max-w-sm mx-auto mb-2">
                  Your 30-day free trial of ClubRudder is active. You have full access to all modules — no credit card required.
                </p>
                <p className="text-sm text-slate-600 mb-8">We'll send you a reminder before your trial ends.</p>
                {genSummary && (
                  <div className="bg-white rounded-2xl soft-shadow p-6 mb-6 text-left border border-slate-200">
                    <h3 className="font-bold mb-3 text-sm uppercase tracking-wider text-slate-500">What we created</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        ["Branches", genSummary.branches], ["Teams", genSummary.teams],
                        ["Players", genSummary.players], ["Guardians", genSummary.guardians],
                        ["Events", genSummary.events], ["Assessments", genSummary.assessments],
                        ["Skill Scores", genSummary.skillScores], ["Evaluations", genSummary.evaluations],
                      ].filter(([, v]) => v).map(([label, val]) => (
                        <div key={label} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50">
                          <span className="text-sm text-slate-600">{label}</span>
                          <span className="font-bold text-slate-900">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <button onClick={() => { window.location.href = "/home"; }} className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg font-bold text-white transition-opacity hover:opacity-90 min-h-[44px]" style={{ background: p() }}>
                  Enter your dashboard <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}