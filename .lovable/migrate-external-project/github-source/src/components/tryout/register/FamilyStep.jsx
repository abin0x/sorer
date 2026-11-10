import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Mail, Plus, Users, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { addChild, loadFamily } from "@/lib/tryoutRegisterApi";

/** Step 1 — find the family (saved profile + children), add a child, and pick
 *  which children are trying out. */
export default function FamilyStep({ clubId, email, setEmail, guardian, setGuardian, family, setFamily, selected, toggleChild, onContinue }) {
  const [loading, setLoading] = useState(false);
  const [openChildForm, setOpenChildForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [child, setChild] = useState({ first_name: "", last_name: "", date_of_birth: "", gender: "" });

  const find = async () => {
    if (!email.trim()) { toast.error("Enter the email the club has for your family."); return; }
    setLoading(true);
    try {
      const data = await loadFamily(clubId, email.trim());
      setFamily(data);
      if (data.guardian) {
        setGuardian({
          first_name: data.guardian.first_name || "", last_name: data.guardian.last_name || "",
          email: data.guardian.email || email.trim(), phone: data.guardian.phone || "",
          street_address: data.guardian.street_address || "", city: data.guardian.city || "",
          state: data.guardian.state || "", zip_code: data.guardian.zip_code || "",
        });
      }
      if (!data.children?.length) toast.info("No players on file yet — add your first player below.");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const saveChild = async () => {
    if (!child.first_name || !child.last_name || !child.date_of_birth) {
      toast.error("A player needs a first name, last name and date of birth.");
      return;
    }
    if (!guardian.first_name || !guardian.last_name) {
      toast.error("Add your own name first — it is saved on the family profile.");
      return;
    }
    setAdding(true);
    try {
      await addChild({ club_id: clubId, guardian: { ...guardian, email: email.trim() }, child });
      const data = await loadFamily(clubId, email.trim());
      setFamily(data);
      setChild({ first_name: "", last_name: "", date_of_birth: "", gender: "" });
      setOpenChildForm(false);
      toast.success(`${child.first_name} added to your family profile`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setAdding(false);
    }
  };

  const set = (field) => (e) => setGuardian((g) => ({ ...g, [field]: e.target.value }));
  const eligiblePlans = (kid) => (kid.eligibility || []).filter((e) => e.eligible).length;

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-lg">Your family</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Enter the email the club has for your family. We will load your saved details and your players, so you only fill in what has changed.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              type="email" inputMode="email" autoComplete="email" placeholder="you@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl"
            />
            <Button onClick={find} disabled={loading} className="sm:w-40">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Looking…</> : "Find my family"}
            </Button>
          </div>

          {family && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div><Label>First name *</Label><Input value={guardian.first_name} onChange={set("first_name")} className="rounded-xl" /></div>
              <div><Label>Last name *</Label><Input value={guardian.last_name} onChange={set("last_name")} className="rounded-xl" /></div>
              <div><Label>Phone</Label><Input value={guardian.phone} onChange={set("phone")} className="rounded-xl" /></div>
              <div><Label>City</Label><Input value={guardian.city} onChange={set("city")} className="rounded-xl" /></div>
              <div><Label>State</Label><Input value={guardian.state} onChange={set("state")} className="rounded-xl" /></div>
              <div><Label>ZIP</Label><Input value={guardian.zip_code} onChange={set("zip_code")} className="rounded-xl" /></div>
            </div>
          )}
        </CardContent>
      </Card>

      {family && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-lg">Who is trying out?</h2>
              </div>
              <Button variant="outline" size="sm" onClick={() => setOpenChildForm((v) => !v)}>
                <Plus className="w-4 h-4 mr-1" /> Add a player
              </Button>
            </div>

            {family.children.length === 0 && !openChildForm && (
              <p className="text-sm text-muted-foreground">No players on file yet. Add the player who is trying out.</p>
            )}
            {family.children.length === 0 && openChildForm && (
              <p className="text-xs text-muted-foreground">Fill in your name above first — it is saved with the player.</p>
            )}

            <div className="space-y-2">
              {family.children.map((kid) => {
                const picked = selected.some((s) => s.id === kid.id);
                const eligible = eligiblePlans(kid);
                const dob = kid.date_of_birth || "no date of birth on file";
                return (
                  <button
                    type="button"
                    key={kid.id}
                    onClick={() => toggleChild(kid)}
                    className={`w-full text-left border rounded-xl p-3.5 flex items-center justify-between gap-3 transition-colors ${picked ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                  >
                    <div>
                      <p className="font-medium text-sm">{kid.first_name} {kid.last_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Born {dob}{kid.current_age_group ? ` · ${kid.current_age_group}` : ""}
                        {kid.team_name ? ` · ${kid.team_name}` : ""}
                      </p>
                      {kid.eligibility?.filter((e) => !e.eligible).length > 0 && (
                        <p className="text-xs text-amber-700 mt-1">
                          {kid.eligibility.filter((e) => !e.eligible)[0].reason}
                        </p>
                      )}
                    </div>
                    {picked
                      ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                      : <Badge variant="outline" className="shrink-0">{eligible} tryout{eligible === 1 ? "" : "s"}</Badge>}
                  </button>
                );
              })}
            </div>

            {openChildForm && (
              <div className="border border-border rounded-xl p-4 space-y-3 bg-muted/30">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><Label>Player first name *</Label><Input value={child.first_name} onChange={(e) => setChild({ ...child, first_name: e.target.value })} className="rounded-xl" /></div>
                  <div><Label>Player last name *</Label><Input value={child.last_name} onChange={(e) => setChild({ ...child, last_name: e.target.value })} className="rounded-xl" /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><Label>Date of birth *</Label><Input type="date" value={child.date_of_birth} onChange={(e) => setChild({ ...child, date_of_birth: e.target.value })} className="rounded-xl" /></div>
                  <div>
                    <Label>Gender</Label>
                    <div className="flex gap-2 mt-1">
                      {["Boys", "Girls"].map((g) => (
                        <Button key={g} type="button" size="sm" variant={child.gender === g ? "default" : "outline"} onClick={() => setChild({ ...child, gender: g })}>{g}</Button>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Age eligibility is worked out from this date of birth and the season's age rules.</p>
                <Button onClick={saveChild} disabled={adding}>{adding ? "Saving…" : "Save player"}</Button>
              </div>
            )}

            <Button className="w-full sm:w-auto" disabled={!selected.length} onClick={onContinue}>
              Continue with {selected.length || "no"} player{selected.length === 1 ? "" : "s"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}