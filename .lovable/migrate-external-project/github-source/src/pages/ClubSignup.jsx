import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Building2, Loader2, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ClubSignup() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");

  useEffect(() => {
    base44.auth.me()
      .then((u) => {
        setUser(u);
        setBillingEmail(u?.email || "");
        if (u?.club_id) navigate("/");
      })
      .catch(() => base44.auth.redirectToLogin())
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;
  }

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke("createClub", {
        name: name.trim(),
        plan_tier: "free",
        billing_email: billingEmail,
      });
      toast({ title: "Club created", description: "Welcome to the platform!" });
      navigate("/PlanPicker");
    } catch (err) {
      toast({ title: "Could not create club", description: err?.message || "Try again", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-slate-50 p-6">
      <Card className="max-w-lg w-full shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Rocket className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <CardTitle>Create your club</CardTitle>
              <p className="text-sm text-slate-500">Onboard your club onto the platform in under a minute.</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Club name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Michigan Jaguars FC" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Billing email</Label>
              <Input id="email" type="email" value={billingEmail} onChange={(e) => setBillingEmail(e.target.value)} placeholder="treasurer@club.com" />
            </div>
            <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-sm text-emerald-800">
              You'll start on a 14-day trial of the Free plan. You can upgrade to a paid plan right after.
            </div>
            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
              Create club
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}