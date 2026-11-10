import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GitBranch, CheckCircle2, Shield, Bell } from "lucide-react";
import OnboardingCardFlow from "@/components/onboarding/OnboardingCardFlow";
import { useOnboardingSubmit } from "@/lib/useOnboardingSubmit";

const HIGHLIGHTS = [
  { icon: GitBranch, title: "Oversee Branch Programs", description: "Manage every program running at your branch" },
  { icon: CheckCircle2, title: "Approve Registrations", description: "Review and approve player registrations" },
  { icon: Shield, title: "Manage Teams & Recruiting", description: "Build teams and run tryouts for your branch" },
];

export default function OnboardBranchDirector() {
  const [phone, setPhone] = useState("");
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState([]);
  const [regAlerts, setRegAlerts] = useState(true);
  const [expenseAlerts, setExpenseAlerts] = useState(true);
  const [tryoutAlerts, setTryoutAlerts] = useState(true);
  const { submit, submitting } = useOnboardingSubmit("branch_director");

  useEffect(() => {
    base44.entities.Location.list().then(setBranches).catch(() => setBranches([]));
  }, []);

  const branchName = branches.find((b) => b.id === branchId)?.name || "";

  return (
    <OnboardingCardFlow
      icon={GitBranch}
      roleLabel="Branch Director"
      welcomeMessage="As Branch Director, you'll oversee programs, teams, and recruiting for your branch."
      highlights={HIGHLIGHTS}
      renderContact={() => (
        <div className="space-y-1.5">
          <Label>Phone Number</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" />
        </div>
      )}
      actionsTitle="Your Branch"
      actionsDescription="As Branch Director, you'll have approval authority over programs and registrations for this branch."
      renderActions={() => (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Your Branch</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger><SelectValue placeholder="Select your branch" /></SelectTrigger>
              <SelectContent>
                {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 pt-2">
            <Label className="text-sm font-semibold flex items-center gap-1.5"><Bell className="w-4 h-4" /> Notification Preferences</Label>
            <div className="flex items-center gap-2">
              <Checkbox id="reg-alerts" checked={regAlerts} onCheckedChange={setRegAlerts} />
              <Label htmlFor="reg-alerts" className="text-sm font-normal">Notify me when registrations need approval</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="expense-alerts" checked={expenseAlerts} onCheckedChange={setExpenseAlerts} />
              <Label htmlFor="expense-alerts" className="text-sm font-normal">Notify me when expenses need approval</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="tryout-alerts" checked={tryoutAlerts} onCheckedChange={setTryoutAlerts} />
              <Label htmlFor="tryout-alerts" className="text-sm font-normal">Notify me about tryout planning deadlines</Label>
            </div>
          </div>
        </div>
      )}
      summarySections={[
        {
          title: "Contact",
          stepIndex: 2,
          items: [{ label: "Phone", value: phone }],
        },
        {
          title: "Branch & Notifications",
          stepIndex: 3,
          items: [
            { label: "Branch", value: branchName },
            { label: "Registration Alerts", value: regAlerts ? "On" : "Off" },
            { label: "Expense Alerts", value: expenseAlerts ? "On" : "Off" },
            { label: "Tryout Alerts", value: tryoutAlerts ? "On" : "Off" },
          ],
        },
      ]}
      onSubmit={() => submit({ phone, branch_id: branchId, preferences: { reg_alerts: regAlerts, expense_alerts: expenseAlerts, tryout_alerts: tryoutAlerts } })}
      submitting={submitting}
    />
  );
}