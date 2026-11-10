import React, { useState } from "react";
import { Link } from '@/lib/router-compat';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Loader2 } from "lucide-react";
import PublicNav from "@/components/layout/PublicNav";

const SOURCES = ["TeamSnap", "SportsEngine", "GotSport", "LeagueApps", "Spreadsheets", "Other", "None, starting fresh"];

export default function CreateYourClub() {
  const [f, setF] = useState({ club_name: "", admin_name: "", admin_email: "", source_system: "", website: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const set = (patch) => setF((p) => ({ ...p, ...patch }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await base44.functions.invoke("create-your-club", {
        ...f, source_system: f.source_system.startsWith("None") ? "" : f.source_system,
      });
      if (res.data?.emailSent === false) throw new Error("Your club was created but we could not send the email. Please contact support.");
      setDone(true);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <div className="flex items-center justify-center p-4 pt-20">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
        {done ? (
          <div className="text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h1 className="text-xl font-bold">Check your email</h1>
            <p className="text-sm text-muted-foreground">
              We sent a link to <strong>{f.admin_email}</strong>. Open it to create your account and start your Setup Journey.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <h1 className="text-2xl font-bold">Create your club</h1>
              <p className="text-sm text-muted-foreground mt-1">Tell us the basics. We email you a link and you start setting up straight away.</p>
            </div>
            <div className="space-y-1.5"><Label htmlFor="club_name">Club name</Label><Input id="club_name" required value={f.club_name} onChange={(e) => set({ club_name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="admin_name">Your name</Label><Input id="admin_name" required value={f.admin_name} onChange={(e) => set({ admin_name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="admin_email">Your email</Label><Input id="admin_email" type="email" required value={f.admin_email} onChange={(e) => set({ admin_email: e.target.value })} /></div>
            <div className="space-y-1.5">
              <Label>Where is your data today? (optional)</Label>
              <Select value={f.source_system} onValueChange={(v) => set({ source_system: v })}>
                <SelectTrigger><SelectValue placeholder="Choose a system" /></SelectTrigger>
                <SelectContent>{SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {/* Honeypot: hidden from people, filled by bots */}
            <input type="text" name="website" value={f.website} onChange={(e) => set({ website: e.target.value })} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full gap-2" disabled={busy}>
              {busy && <Loader2 className="w-4 h-4 animate-spin" />} Email me my link
            </Button>
            <p className="text-xs text-center text-muted-foreground">Already have an account? <Link to="/login" className="underline">Log in</Link></p>
          </form>
        )}
        </div>
      </div>
    </div>
  );
}