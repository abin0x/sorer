import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, UserPlus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function RegistrationForm({ onSubmitted }) {
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const { data: programs = [] } = useQuery({
    queryKey: ["programs-for-registration"],
    queryFn: () => base44.entities.Program.list("-created_date", 50),
  });
  const { data: locations = [] } = useQuery({
    queryKey: ["locations-for-registration"],
    queryFn: () => base44.entities.Location.list("name", 100),
  });

  const [form, setForm] = useState({
    program_id: "",
    location_id: "",
    // Guardian
    g_first_name: "",
    g_last_name: "",
    g_email: "",
    g_phone: "",
    g_relationship: "guardian",
    g_street: "",
    g_city: "",
    g_state: "",
    g_zip: "",
    // Player
    p_first_name: "",
    p_last_name: "",
    p_dob: "",
    p_gender: "Boys",
    p_position: "",
    p_medical: "",
    // Registration
    waiver: false,
    financial_aid: false,
    notes: "",
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const valid =
    form.program_id && form.location_id &&
    form.g_first_name && form.g_last_name && form.g_email &&
    form.p_first_name && form.p_last_name && form.p_dob &&
    form.waiver;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!valid) {
      toast.error("Please complete all required fields and accept the waiver.");
      return;
    }
    setSubmitting(true);
    try {
      const program = programs.find((p) => p.id === form.program_id);
      const location = locations.find((l) => l.id === form.location_id);

      // 1. Create guardian (central database)
      const guardian = await base44.entities.Guardian.create({
        first_name: form.g_first_name,
        last_name: form.g_last_name,
        email: form.g_email,
        phone: form.g_phone,
        relationship: form.g_relationship,
        street_address: form.g_street,
        city: form.g_city,
        state: form.g_state,
        zip_code: form.zip,
      });

      // 2. Create player (linked to guardian + program)
      const player = await base44.entities.Player.create({
        first_name: form.p_first_name,
        last_name: form.p_last_name,
        date_of_birth: form.p_dob,
        gender: form.p_gender,
        guardian_id: guardian.id,
        guardian_name: `${guardian.first_name} ${guardian.last_name}`,
        program_id: program.id,
        program_title: program.title,
        location_id: location?.id || "",
        location_name: location?.name || "",
        status: "pending",
        position: form.p_position,
        medical_notes: form.p_medical,
      });

      // 3. Create registration record
      const today = new Date().toISOString().split("T")[0];
      const registration = await base44.entities.Registration.create({
        player_id: player.id,
        player_name: `${player.first_name} ${player.last_name}`,
        guardian_id: guardian.id,
        guardian_name: `${guardian.first_name} ${guardian.last_name}`,
        program_id: program.id,
        program_title: program.title,
        location_id: location?.id || "",
        location_name: location?.name || "",
        status: "pending",
        payment_status: "unpaid",
        registration_date: today,
        waiver_accepted: form.waiver,
        financial_aid_requested: form.financial_aid,
        notes: form.notes,
      });

      // 4. CONNECTION TO PROJECT MANAGEMENT: create a Kanban Task linked to the program
      //    so the project-management side tracks the registration review work.
      const task = await base44.entities.Task.create({
        program_id: program.id,
        title: `Review Registration: ${player.first_name} ${player.last_name}`,
        description: `Registration submitted for ${program.title}. Review and approve, then assign to a team. Guardian: ${guardian.first_name} ${guardian.last_name} (${guardian.email}).${form.financial_aid ? " Financial aid requested." : ""}`,
        category: "Registration",
        completed: false,
        due_date: program.due_date || null,
      });

      // Link the task back to the registration
      await base44.entities.Registration.update(registration.id, {
        kanban_task_id: task.id,
        assigned_to: program.assignee || "",
      });

      queryClient.invalidateQueries({ queryKey: ["registrations"] });
      queryClient.invalidateQueries({ queryKey: ["players"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setDone(true);
      toast.success("Registration submitted! A review task was created in the Kanban board.");
      onSubmitted?.();
    } catch (err) {
      console.error(err);
      toast.error("Could not submit registration. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8 text-center space-y-4">
          <CheckCircle2 className="w-14 h-14 text-emerald-600 mx-auto" />
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Registration Submitted</h3>
          <p className="text-slate-600 dark:text-slate-300">
            Your registration has been saved to the central database and a review task was created in the project management board. You'll be contacted once it's approved.
          </p>
          <Button onClick={() => { setDone(false); setForm({ ...form, program_id: "", p_first_name: "", p_last_name: "", p_dob: "", waiver: false }); }}>
            Submit Another Registration
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5 text-emerald-600" /> New Player Registration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Location + Program selection */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Location *</Label>
              <Select value={form.location_id} onValueChange={(v) => set("location_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select a location" /></SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Program *</Label>
              <Select value={form.program_id} onValueChange={(v) => set("program_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select a program" /></SelectTrigger>
                <SelectContent>
                  {programs.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.title} {p.season ? `· ${p.season}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Guardian section */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 border-b pb-1">Parent / Guardian Information</h4>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>First Name *</Label><Input value={form.g_first_name} onChange={(e) => set("g_first_name", e.target.value)} /></div>
              <div><Label>Last Name *</Label><Input value={form.g_last_name} onChange={(e) => set("g_last_name", e.target.value)} /></div>
              <div><Label>Email *</Label><Input type="email" value={form.g_email} onChange={(e) => set("g_email", e.target.value)} /></div>
              <div><Label>Phone</Label><Input value={form.g_phone} onChange={(e) => set("g_phone", e.target.value)} /></div>
              <div>
                <Label>Relationship</Label>
                <Select value={form.g_relationship} onValueChange={(v) => set("g_relationship", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mother">Mother</SelectItem>
                    <SelectItem value="father">Father</SelectItem>
                    <SelectItem value="guardian">Guardian</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Street Address</Label><Input value={form.g_street} onChange={(e) => set("g_street", e.target.value)} /></div>
              <div><Label>City</Label><Input value={form.g_city} onChange={(e) => set("g_city", e.target.value)} /></div>
              <div><Label>State</Label><Input value={form.g_state} onChange={(e) => set("g_state", e.target.value)} /></div>
              <div><Label>ZIP</Label><Input value={form.zip} onChange={(e) => set("g_zip", e.target.value)} /></div>
            </div>
          </div>

          {/* Player section */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 border-b pb-1">Player Information</h4>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>First Name *</Label><Input value={form.p_first_name} onChange={(e) => set("p_first_name", e.target.value)} /></div>
              <div><Label>Last Name *</Label><Input value={form.p_last_name} onChange={(e) => set("p_last_name", e.target.value)} /></div>
              <div><Label>Date of Birth *</Label><Input type="date" value={form.p_dob} onChange={(e) => set("p_dob", e.target.value)} /></div>
              <div>
                <Label>Gender</Label>
                <Select value={form.p_gender} onValueChange={(v) => set("p_gender", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Boys">Boys</SelectItem>
                    <SelectItem value="Girls">Girls</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Preferred Position</Label><Input value={form.p_position} onChange={(e) => set("p_position", e.target.value)} /></div>
              <div className="col-span-2"><Label>Medical Notes / Allergies</Label><Textarea value={form.p_medical} onChange={(e) => set("p_medical", e.target.value)} rows={2} /></div>
            </div>
          </div>

          {/* Waivers */}
          <div className="space-y-3">
            <label className="flex items-start gap-2 cursor-pointer">
              <Checkbox checked={form.waiver} onCheckedChange={(v) => set("waiver", !!v)} />
              <span className="text-sm text-slate-600 dark:text-slate-300">
                I acknowledge and accept the club's liability waiver, concussion policy, and code of conduct. *
              </span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <Checkbox checked={form.financial_aid} onCheckedChange={(v) => set("financial_aid", !!v)} />
              <span className="text-sm text-slate-600 dark:text-slate-300">I would like to apply for financial aid.</span>
            </label>
            <Textarea placeholder="Additional notes (optional)" value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
          </div>

          <Button type="submit" disabled={submitting || !valid} className="w-full bg-emerald-600 hover:bg-emerald-700">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting...</> : "Submit Registration"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}