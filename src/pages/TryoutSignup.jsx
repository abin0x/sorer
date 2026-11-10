import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from '@/lib/router-compat';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Trophy, Loader2, CheckCircle2, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import PublicFooter from "@/components/public/PublicFooter";

export default function TryoutSignup() {
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get("id");
  const utmSource = searchParams.get("utm_source") || "";
  const utmCampaign = searchParams.get("utm_campaign") || "";
  const queryClient = useQueryClient();
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    player_first_name: "",
    player_last_name: "",
    player_date_of_birth: "",
    guardian_name: "",
    guardian_email: "",
    guardian_phone: "",
    current_club: "",
    preferred_position: "",
    comments: "",
  });

  const { data: info, isLoading } = useQuery({
    queryKey: ["public-tryout", eventId],
    queryFn: async () => (await base44.functions.invoke("tryoutPublic", { action: "get", event_id: eventId })).data,
    enabled: !!eventId,
    retry: false,
  });
  const event = info?.event;
  const plan = info?.plan;
  const registrations = { length: info?.registered || 0 };
  const [result, setResult] = useState(null);
  const navigateTo = useNavigate();
  // Every tryout signup now goes through the full registration (waivers, payment, sessions).
  React.useEffect(() => {
    const clubId = event?.club_id || plan?.club_id;
    if (clubId && eventId) navigateTo(`/TryoutRegister?club=${encodeURIComponent(clubId)}&id=${encodeURIComponent(eventId)}`, { replace: true });
  }, [event?.club_id, plan?.club_id, eventId, navigateTo]);

  const handleChange = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.player_first_name || !form.player_last_name || !form.guardian_name || !form.guardian_email) {
      toast.error("Please fill in player name, guardian name, and guardian email.");
      return;
    }
    setSaving(true);
    try {
      const res = await base44.functions.invoke("tryoutPublic", { action: "register", event_id: eventId, form, utm_source: utmSource, utm_campaign: utmCampaign });
      if (res.data?.error) throw new Error(res.data.error);
      setResult(res.data);
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["public-tryout", eventId] });
    } catch (err) {
      toast.error("Registration failed: " + (err.message || "Please try again."));
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-white">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-white p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <p className="text-lg font-semibold text-slate-700">Tryout not found</p>
            <p className="text-sm text-slate-500 mt-2">This tryout event may have been removed or the link is invalid.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isFull = event.expected_attendance ? registrations.length >= event.expected_attendance : false;
  const spotsLeft = event.expected_attendance ? event.expected_attendance - registrations.length : null;

  return (
    <div className="safe-top min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 text-white">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg">{plan?.title ? "Tryout Registration" : "Tryout"}</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">{plan?.title || "Tryout Registration"}</h1>
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-emerald-50">
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {event.date} {event.start_time}</span>
            {event.location && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {event.location}</span>}
            {plan?.age_group && <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {plan.age_group} {plan.gender}</span>}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {submitted ? (
          <Card className="border-emerald-200 shadow-lg">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">
                {result?.merged ? "You were already signed up" : result?.status === "waitlist" ? "You're on the waitlist" : "You're Registered!"}
              </h2>
              <p className="text-slate-600">
                {result?.status === "waitlist"
                  ? <>This session is full. We will notify <strong>{form.guardian_email}</strong> if a spot opens.</>
                  : <>See you at the tryout on <strong>{event.date}</strong>{event.start_time ? ` at ${event.start_time}` : ""}.</>}
              </p>
              {result?.check_in_code && (
                <div className="mt-4 inline-flex flex-col items-center gap-2 bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                  <img alt="Check-in QR" className="w-40 h-40" src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(result.check_in_code)}`} />
                  <p className="text-xs text-slate-500">Check-in code</p>
                  <p className="font-mono text-lg font-bold tracking-widest">{result.check_in_code}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Event Details */}
            <Card className="shadow-md border-slate-200">
              <CardContent className="p-6 space-y-4">
                <h2 className="font-bold text-lg text-slate-800">Event Details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {plan?.season && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-semibold">Season</p>
                      <p className="text-sm text-slate-700">{plan.season}</p>
                    </div>
                  )}
                  {plan?.gender && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-semibold">Gender</p>
                      <p className="text-sm text-slate-700">{plan.gender}</p>
                    </div>
                  )}
                  {plan?.age_group && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-semibold">Age Group</p>
                      <p className="text-sm text-slate-700">{plan.age_group}</p>
                    </div>
                  )}
                  {event.location && (
                    <div className="sm:col-span-2">
                      <p className="text-xs text-slate-500 uppercase font-semibold">Field / Venue</p>
                      <p className="text-sm text-slate-700">{event.location}</p>
                    </div>
                  )}
                  {spotsLeft !== null && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-semibold">Spots Remaining</p>
                      <Badge className={isFull ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}>
                        {isFull ? "Full" : `${spotsLeft} left`}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Signup Form */}
            {isFull && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="p-6 text-center">
                  <p className="font-semibold text-amber-700">This tryout is full</p>
                  <p className="text-sm text-amber-600 mt-1">Sign up anyway and we will add you to the waitlist. If a spot opens you are moved up automatically.</p>
                </CardContent>
              </Card>
            )}
            {(
              <Card className="shadow-md border-slate-200">
                <CardContent className="p-6">
                  <h2 className="font-bold text-lg text-slate-800 mb-1 flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-emerald-600" />
                    Sign Up for This Tryout
                  </h2>
                  <p className="text-sm text-slate-500 mb-4">Fill in the player and guardian info below.</p>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label>Player First Name *</Label>
                        <Input value={form.player_first_name} onChange={(e) => handleChange("player_first_name", e.target.value)} className="rounded-xl" required />
                      </div>
                      <div>
                        <Label>Player Last Name *</Label>
                        <Input value={form.player_last_name} onChange={(e) => handleChange("player_last_name", e.target.value)} className="rounded-xl" required />
                      </div>
                    </div>
                    <div>
                      <Label>Player Date of Birth</Label>
                      <Input type="date" value={form.player_date_of_birth} onChange={(e) => handleChange("player_date_of_birth", e.target.value)} className="rounded-xl" />
                    </div>
                    <div>
                      <Label>Guardian / Parent Name *</Label>
                      <Input value={form.guardian_name} onChange={(e) => handleChange("guardian_name", e.target.value)} className="rounded-xl" required />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label>Guardian Email *</Label>
                        <Input type="email" inputMode="email" autoComplete="email" value={form.guardian_email} onChange={(e) => handleChange("guardian_email", e.target.value)} className="rounded-xl" required />
                      </div>
                      <div>
                        <Label>Guardian Phone</Label>
                        <Input type="tel" inputMode="tel" autoComplete="tel" value={form.guardian_phone} onChange={(e) => handleChange("guardian_phone", e.target.value)} className="rounded-xl" placeholder="Optional" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label>Current Club</Label>
                        <Input value={form.current_club} onChange={(e) => handleChange("current_club", e.target.value)} className="rounded-xl" placeholder="Optional" />
                      </div>
                      <div>
                        <Label>Preferred Position</Label>
                        <Input value={form.preferred_position} onChange={(e) => handleChange("preferred_position", e.target.value)} className="rounded-xl" placeholder="Optional" />
                      </div>
                    </div>
                    <div>
                      <Label>Comments / Questions</Label>
                      <Input value={form.comments} onChange={(e) => handleChange("comments", e.target.value)} className="rounded-xl" placeholder="Optional" />
                    </div>
                    <Button type="submit" disabled={saving} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white h-11">
                      {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Registering…</> : (isFull ? "Join the Waitlist" : "Register for Tryout")}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
      <PublicFooter />
    </div>
  );
}