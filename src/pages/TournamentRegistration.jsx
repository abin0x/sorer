import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from '@/lib/router-compat';
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Trophy, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";

export default function TournamentRegistration() {
  const [params] = useSearchParams();
  const tournamentId = params.get("tournament");
  const step = params.get("step");
  const regId = params.get("reg");

  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState(step === "confirmation");

  const [form, setForm] = useState({
    name: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    coach_name: "",
    city: "",
    state: "",
    roster_count: "",
    notes: "",
  });

  useEffect(() => {
    if (!tournamentId) {
      setLoading(false);
      return;
    }
    base44.entities.Tournament
      .get(tournamentId)
      .then((t) => {
        setTournament(t);
        if (t.status !== "registration_open") setError("Registration is not open for this tournament.");
      })
      .catch(() => setError("Tournament not found."))
      .finally(() => setLoading(false));
  }, [tournamentId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.contact_email) {
      setError("Team name and contact email are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke("tournament-checkout", {
        tournament_id: tournamentId,
        team: form,
      });
      const data = res.data;
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else if (data.free) {
        setConfirmation(true);
      }
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!tournamentId || (!tournament && !error)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 mb-4">No tournament selected. Use the registration link from the tournament organizer.</p>
            <Link to="/"><Button variant="outline">Go Home</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (confirmation) {
    return (
      <div className="safe-top min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-slate-100 p-6">
        <Card className="max-w-lg w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Registration Confirmed!</h1>
            <p className="text-slate-600 mb-6">
              Your team is registered for <strong>{tournament?.name}</strong>. The organizer will be in touch with scheduling details.
            </p>
            <div className="flex gap-3 justify-center">
              <Link to={`/TournamentSchedule?tournament=${tournamentId}`}>
                <Button variant="outline">View Schedule</Button>
              </Link>
              <Link to={`/TournamentStandings?tournament=${tournamentId}`}>
                <Button>View Standings</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Link to={`/TournamentSchedule?tournament=${tournamentId}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to schedule
        </Link>

        {tournament?.banner_url && (
          <img src={tournament.banner_url} alt={tournament.name} className="w-full h-48 object-cover rounded-xl mb-6" />
        )}

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{tournament?.name}</h1>
            <div className="flex gap-2 mt-1">
              {tournament?.age_group && <Badge variant="secondary">{tournament.age_group}</Badge>}
              {tournament?.gender && <Badge variant="secondary">{tournament.gender}</Badge>}
              {tournament?.format && <Badge variant="outline">{tournament.format.replace(/_/g, " ")}</Badge>}
            </div>
          </div>
        </div>

        {tournament?.description && (
          <p className="text-slate-600 mb-6">{tournament.description}</p>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Team Registration</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Team Name *</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact_name">Contact Name</Label>
                  <Input id="contact_name" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="contact_email">Contact Email *</Label>
                  <Input id="contact_email" type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} required />
                </div>
              </div>
              <div>
                <Label htmlFor="coach_name">Head Coach Name</Label>
                <Input id="coach_name" value={form.coach_name} onChange={(e) => setForm({ ...form, coach_name: e.target.value })} placeholder="Coach name (used for scheduling conflict detection)" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact_phone">Contact Phone</Label>
                  <Input id="contact_phone" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="roster_count">Roster Size</Label>
                  <Input id="roster_count" type="number" value={form.roster_count} onChange={(e) => setForm({ ...form, roster_count: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input id="state" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
              </div>

              {tournament?.entry_fee > 0 && (
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Entry Fee</span>
                    <span className="text-2xl font-bold">${tournament.entry_fee}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Secure payment through the club's payment processor. You'll be redirected to complete payment.</p>
                </div>
              )}

              <Button type="submit" disabled={submitting} className="w-full" size="lg">
                {submitting ? "Processing..." : tournament?.entry_fee > 0 ? `Register & Pay $${tournament.entry_fee}` : "Register Team"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}