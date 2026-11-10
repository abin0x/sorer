import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, CheckCircle2, BarChart3, Bell } from "lucide-react";
import OnboardingCardFlow from "@/components/onboarding/OnboardingCardFlow";
import { useOnboardingSubmit } from "@/lib/useOnboardingSubmit";

const HIGHLIGHTS = [
  { icon: TrendingUp, title: "Club-Wide Oversight", description: "See every branch, program, and team in one view" },
  { icon: CheckCircle2, title: "Approve Programs", description: "Review and approve programs before they launch" },
  { icon: BarChart3, title: "Cross-Branch Reporting", description: "Compare performance across all branches" },
];

export default function OnboardClubDirector() {
  const [phone, setPhone] = useState("");
  const [clubWideAlerts, setClubWideAlerts] = useState(true);
  const [boardReportingFreq, setBoardReportingFreq] = useState("monthly");
  const [strategicPriorities, setStrategicPriorities] = useState([]);
  const { submit, submitting } = useOnboardingSubmit("club_director");

  const PRIORITIES = [
    "Player Development",
    "Revenue Growth",
    "Facility Expansion",
    "Coaching Excellence",
    "Community Outreach",
    "Competitive Success",
  ];

  const togglePriority = (p) => {
    setStrategicPriorities((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  };

  return (
    <OnboardingCardFlow
      icon={TrendingUp}
      roleLabel="Club Director"
      welcomeMessage="As Club Director, you'll have club-wide oversight of every branch, program, and team."
      highlights={HIGHLIGHTS}
      renderContact={() => (
        <div className="space-y-1.5">
          <Label>Phone Number</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" />
        </div>
      )}
      actionsTitle="Oversight Preferences"
      actionsDescription="Tell us how you'd like to stay informed about the club."
      renderActions={() => (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox id="club-wide-alerts" checked={clubWideAlerts} onCheckedChange={setClubWideAlerts} />
            <Label htmlFor="club-wide-alerts" className="text-sm font-normal">Receive club-wide oversight alerts (all branches &amp; programs)</Label>
          </div>
          <div className="space-y-1.5">
            <Label>Board Reporting Frequency</Label>
            <Select value={boardReportingFreq} onValueChange={setBoardReportingFreq}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Strategic Priorities (select all that apply)</Label>
            <div className="flex flex-wrap gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePriority(p)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    strategicPriorities.includes(p)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-slate-200 text-slate-600 hover:border-primary/50"
                  }`}
                >
                  {p}
                </button>
              ))}
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
          title: "Oversight Preferences",
          stepIndex: 3,
          items: [
            { label: "Club-Wide Alerts", value: clubWideAlerts ? "On" : "Off" },
            { label: "Board Reporting", value: boardReportingFreq.charAt(0).toUpperCase() + boardReportingFreq.slice(1) },
            { label: "Strategic Priorities", value: strategicPriorities.join(", ") || "—" },
          ],
        },
      ]}
      onSubmit={() => submit({ phone, preferences: { club_wide_alerts: clubWideAlerts, board_reporting_frequency: boardReportingFreq, strategic_priorities: strategicPriorities } })}
      submitting={submitting}
    />
  );
}