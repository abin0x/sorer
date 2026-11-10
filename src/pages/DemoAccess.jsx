import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from '@/lib/router-compat';
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Mail, Loader2, Sparkles, Play, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import FoundingClubsCard from "@/components/public/FoundingClubsCard";
import PublicFooter from "@/components/public/PublicFooter";
import PublicNav from "@/components/layout/PublicNav";

const p = (a = 1) => `hsl(var(--primary)${a < 1 ? ` / ${a}` : ""})`;
const sports = ["Soccer", "Basketball", "Baseball", "Softball", "Volleyball", "Football", "Lacrosse", "Hockey", "Other"];

export default function DemoAccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [mode, setMode] = useState(token ? "token-checking" : "form"); // form | submitting | submitted | approved | invalid
  const [validating, setValidating] = useState(false);
  const [approvedInfo, setApprovedInfo] = useState(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    club_name: "",
    sport: "Soccer",
    branch_count: "1",
    message: "",
  });

  // Validate token on mount
  useEffect(() => {
    if (!token) return;
    setValidating(true);
    base44.functions
      .invoke("validate-demo-access", { token })
      .then((res) => {
        if (res.data?.valid) {
          setApprovedInfo(res.data);
          setMode("approved");
          sessionStorage.setItem("demoAccessToken", token);
        } else {
          setMode("invalid");
        }
      })
      .catch(() => setMode("invalid"))
      .finally(() => setValidating(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.club_name.trim()) return;
    setMode("submitting");
    try {
      await base44.functions.invoke("submit-demo-access-request", {
        name: form.name.trim(),
        email: form.email.trim(),
        club_name: form.club_name.trim(),
        sport: form.sport,
        branch_count: form.branch_count,
        message: form.message.trim(),
      });
      base44.analytics.track({ eventName: "demo_access_request", properties: { sport: form.sport, branch_count: form.branch_count } });
      setMode("submitted");
    } catch (err) {
      setMode("form");
    }
  };

  const launchDemo = () => {
    navigate("/demo?token=" + token);
  };

  return (
    <div className="force-light min-h-screen wellness-bg text-slate-800">
      <PublicNav />

      <div className="max-w-lg mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {/* Token validation loading */}
          {mode === "token-checking" && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin mb-4" style={{ color: p() }} />
              <p className="text-slate-600">Verifying your demo access…</p>
            </div>
          )}

          {/* Invalid token */}
          {mode === "invalid" && (
            <motion.div key="invalid" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: "hsl(0 70% 50% / 0.1)" }}>
                <ShieldCheck className="w-7 h-7 text-red-500" />
              </div>
              <h1 className="text-2xl font-extrabold mb-3 text-slate-900">This link is no longer valid</h1>
              <p className="text-slate-600 mb-8">The demo access link you clicked has expired or been revoked. You can request a new one below.</p>
              <Button onClick={() => setMode("form")} className="text-white" style={{ background: p() }}>Request Demo Access</Button>
            </motion.div>
          )}

          {/* Approved — ready to launch */}
          {mode === "approved" && (
            <motion.div key="approved" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: "spring" }} className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: p() }}>
                <Play className="w-8 h-8 text-white" />
              </motion.div>
              <h1 className="text-3xl font-extrabold mb-3 text-slate-900">You're approved!</h1>
              <p className="text-slate-700 max-w-sm mx-auto mb-8">
                Welcome{approvedInfo?.name ? `, ${approvedInfo.name.split(" ")[0]}` : ""}! Your demo access is ready. Click below to launch the interactive demo and walk through the full club setup experience.
              </p>
              <Button onClick={launchDemo} className="inline-flex items-center gap-2 px-8 py-3.5 text-white min-h-[44px] text-base" style={{ background: p() }}>
                Launch Interactive Demo <ArrowRight className="w-5 h-5" />
              </Button>
            </motion.div>
          )}

          {/* Request form */}
          {(mode === "form" || mode === "submitting") && (
            <motion.div key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="text-center mb-8">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: p(0.12) }}>
                  <Sparkles className="w-6 h-6" style={{ color: p() }} />
                </div>
                <h1 className="text-3xl font-extrabold mb-2 text-slate-900">Request demo access</h1>
                <p className="text-slate-700">Tell us about your club and we'll grant you access to the interactive demo.</p>
              </div>
              <form onSubmit={handleSubmit} className="bg-white rounded-2xl soft-shadow p-8 space-y-5 border border-slate-200">
                <div>
                  <Label className="mb-1.5 block text-slate-800">Your Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Director" className="min-h-[44px]" required />
                </div>
                <div>
                  <Label className="mb-1.5 block text-slate-800">Email Address</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@yourclub.com" className="min-h-[44px]" required />
                </div>
                <div>
                  <Label className="mb-1.5 block text-slate-800">Club Name</Label>
                  <Input value={form.club_name} onChange={(e) => setForm({ ...form, club_name: e.target.value })} placeholder="Riverside Soccer Club" className="min-h-[44px]" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-1.5 block text-slate-800">Sport</Label>
                    <Select value={form.sport} onValueChange={(v) => setForm({ ...form, sport: v })}>
                      <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {sports.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-slate-800">Branches</Label>
                    <Select value={form.branch_count} onValueChange={(v) => setForm({ ...form, branch_count: v })}>
                      <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 branch</SelectItem>
                        <SelectItem value="2-5">2–5 branches</SelectItem>
                        <SelectItem value="6-10">6–10 branches</SelectItem>
                        <SelectItem value="10+">10+ branches</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="mb-1.5 block text-slate-800">Anything you'd like us to know? (optional)</Label>
                  <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Tell us what you're looking for…" rows={3} />
                </div>
                <Button type="submit" disabled={mode === "submitting"} className="w-full min-h-[44px] text-white" style={{ background: p() }}>
                  {mode === "submitting" ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting…</> : <>Request Access <ArrowRight className="w-4 h-4 ml-1" /></>}
                </Button>
              </form>
              <div className="mt-6"><FoundingClubsCard ctaTo="/demo-access" ctaLabel="Request demo access" /></div>
            </motion.div>
          )}

          {/* Submitted — pending review */}
          {mode === "submitted" && (
            <motion.div key="submitted" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: "spring" }} className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: p() }}>
                <Check className="w-8 h-8 text-white" />
              </motion.div>
              <h1 className="text-3xl font-extrabold mb-3 text-slate-900">Request received!</h1>
              <p className="text-slate-700 max-w-sm mx-auto mb-8">
                Thanks for your interest in Club Rudder. We'll review your request and email you within 1–2 business days with a link to launch the interactive demo.
              </p>
              <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-bold border-2 text-slate-900 hover:bg-slate-50 transition-colors min-h-[44px]" style={{ borderColor: "hsl(213 59% 11%)" }}>
                Back to Home
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <PublicFooter />
    </div>
  );
}