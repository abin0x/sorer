import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Rocket, Loader2, CheckCircle2 } from "lucide-react";
import PublicFooter from "@/components/public/PublicFooter";
import PublicNav from "@/components/layout/PublicNav";

const SYSTEM_OPTIONS = [
  { value: "teamsnap", label: "TeamSnap" },
  { value: "sportsengine", label: "SportsEngine" },
  { value: "leagueapps", label: "LeagueApps" },
  { value: "waresport", label: "Waresport" },
  { value: "spreadsheet", label: "Spreadsheet" },
  { value: "none", label: "None" },
];

export default function RequestAccess() {
  const [form, setForm] = useState({
    club_name: "", contact_name: "", contact_email: "", contact_role: "director",
    current_system: "none", branch_count: "1", player_count: "<50", phone: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await base44.functions.invoke("submit-club-signup-request", form);
      setDone(true);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-slate-50">
        <PublicNav />
        <div className="flex items-center justify-center p-6 pt-20">
          <Card className="max-w-md w-full shadow-xl text-center">
          <CardContent className="pt-10 pb-8 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h2 className="text-xl font-bold text-slate-900">Request received</h2>
            <p className="text-sm text-slate-500">
              Our team will review your club and reach out at {form.contact_email} to get you set up.
            </p>
          </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-slate-50">
      <PublicNav />
      <div className="flex items-center justify-center p-6 pt-20">
        <Card className="max-w-lg w-full shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Rocket className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <CardTitle>Start Your Club on Club Rudder</CardTitle>
              <p className="text-sm text-slate-500">Tell us about your club — we'll set everything up personally.</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-4 p-3 rounded-lg bg-rose-50 text-rose-700 text-sm">{error}</div>}
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Club Name *</Label>
              <Input value={form.club_name} onChange={(e) => set({ club_name: e.target.value })} required />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Your Name *</Label>
                <Input value={form.contact_name} onChange={(e) => set({ contact_name: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Your Email *</Label>
                <Input type="email" value={form.contact_email} onChange={(e) => set({ contact_email: e.target.value })} required />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Your Role *</Label>
                <Select value={form.contact_role} onValueChange={(v) => set({ contact_role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="director">Director</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="board_member">Board Member</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Current System *</Label>
                <Select value={form.current_system} onValueChange={(v) => set({ current_system: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SYSTEM_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Number of Branches *</Label>
                <Select value={form.branch_count} onValueChange={(v) => set({ branch_count: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["1", "2-3", "4-9", "10+"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Number of Players *</Label>
                <Select value={form.player_count} onValueChange={(v) => set({ player_count: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["<50", "50-150", "150-300", "300+"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Phone (optional)</Label>
              <Input value={form.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="For the onboarding call" />
            </div>
            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
              Request Access
            </Button>
          </form>
        </CardContent>
        </Card>
      </div>
      <PublicFooter />
    </div>
  );
}