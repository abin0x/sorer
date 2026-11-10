import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, BarChart3, Users, ClipboardCheck, Bell } from "lucide-react";
import OnboardingCardFlow from "@/components/onboarding/OnboardingCardFlow";
import { useOnboardingSubmit } from "@/lib/useOnboardingSubmit";

const HIGHLIGHTS = [
  { icon: Trophy, title: "Platform Oversight", description: "Visibility of an entire competitive platform (e.g. MLS-Next, Girls Academy)" },
  { icon: Users, title: "View Platform Teams", description: "See every team and player competing under your platform" },
  { icon: BarChart3, title: "Cross-Platform Reporting", description: "Compare performance and attendance across teams" },
];

export default function OnboardPlatformDirector() {
  const [phone, setPhone] = useState("");
  const [platformId, setPlatformId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [platforms, setPlatforms] = useState([]);
  const [branches, setBranches] = useState([]);
  const [reportingFreq, setReportingFreq] = useState("weekly");
  const [coachDevAlerts, setCoachDevAlerts] = useState(true);
  const { submit, submitting } = useOnboardingSubmit("platform_director");

  useEffect(() => {
    base44.entities.Platform.list().then(setPlatforms).catch(() => setPlatforms([]));
    base44.entities.Location.list().then(setBranches).catch(() => setBranches([]));
  }, []);

  const platformName = platforms.find((p) => p.id === platformId)?.name || "";
  const branchName = branches.find((b) => b.id === branchId)?.name || "";

  return (
    <OnboardingCardFlow
      icon={Trophy}
      roleLabel="Platform Director"
      welcomeMessage="As Platform Director, you'll have oversight of an entire competitive platform within your branch."
      highlights={HIGHLIGHTS}
      renderContact={() => (
        <div className="space-y-1.5">
          <Label>Phone Number</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" />
        </div>
      )}
      actionsTitle="Your Platform & Branch"
      actionsDescription="Select the competitive platform you oversee and the branch it belongs to."
      renderActions={() => (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Competitive Platform</Label>
            <Select value={platformId} onValueChange={setPlatformId}>
              <SelectTrigger><SelectValue placeholder="Select a platform (optional)" /></SelectTrigger>
              <SelectContent>
                {platforms.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Your Branch</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger><SelectValue placeholder="Select your branch (optional)" /></SelectTrigger>
              <SelectContent>
                {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 pt-2">
            <Label className="text-sm font-semibold flex items-center gap-1.5"><Bell className="w-4 h-4" /> Reporting Preferences</Label>
            <div className="space-y-1.5">
              <Label className="text-xs">Reporting Frequency</Label>
              <Select value={reportingFreq} onValueChange={setReportingFreq}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="coach-dev-alerts" checked={coachDevAlerts} onCheckedChange={setCoachDevAlerts} />
              <Label htmlFor="coach-dev-alerts" className="text-sm font-normal">Notify me about coaching development milestones</Label>
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
          title: "Platform & Reporting",
          stepIndex: 3,
          items: [
            { label: "Platform", value: platformName },
            { label: "Branch", value: branchName },
            { label: "Reporting Frequency", value: reportingFreq.charAt(0).toUpperCase() + reportingFreq.slice(1) },
            { label: "Coach Dev Alerts", value: coachDevAlerts ? "On" : "Off" },
          ],
        },
      ]}
      onSubmit={() => submit({ phone, platform_id: platformId, branch_id: branchId, preferences: { reporting_frequency: reportingFreq, coach_dev_alerts: coachDevAlerts } })}
      submitting={submitting}
    />
  );
}