import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Trophy, Users, ListChecks, ClipboardCheck } from "lucide-react";
import OnboardingCardFlow from "@/components/onboarding/OnboardingCardFlow";
import { useOnboardingSubmit } from "@/lib/useOnboardingSubmit";

const HIGHLIGHTS = [
  { icon: Users, title: "Manage Rosters", description: "See your assigned team and every player on it" },
  { icon: ListChecks, title: "Set Lineups", description: "Plan lineups and formations for game day" },
  { icon: ClipboardCheck, title: "Track Attendance", description: "Record attendance for practices and games" },
];

const AGE_GROUPS = ["U8", "U9", "U10", "U11", "U12", "U13", "U14", "U15", "U16", "U17", "U18", "U19", "Senior"];

export default function OnboardCoach() {
  const [phone, setPhone] = useState("");
  const [certifications, setCertifications] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [preferredAgeGroups, setPreferredAgeGroups] = useState([]);
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const { submit, submitting } = useOnboardingSubmit("coach");

  const toggleAgeGroup = (ag) => {
    setPreferredAgeGroups((prev) => prev.includes(ag) ? prev.filter((a) => a !== ag) : [...prev, ag]);
  };

  return (
    <OnboardingCardFlow
      icon={Trophy}
      roleLabel="Coach"
      welcomeMessage="As a coach, you'll manage your roster, plan lineups, and track attendance for every session. Your club will assign your team after setup."
      highlights={HIGHLIGHTS}
      renderContact={() => (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Phone Number</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" />
          </div>
          <div className="space-y-1.5">
            <Label>Emergency Contact Name</Label>
            <Input value={emergencyContactName} onChange={(e) => setEmergencyContactName(e.target.value)} placeholder="Spouse, parent, etc." />
          </div>
          <div className="space-y-1.5">
            <Label>Emergency Contact Phone</Label>
            <Input value={emergencyContactPhone} onChange={(e) => setEmergencyContactPhone(e.target.value)} placeholder="(555) 123-4567" />
          </div>
        </div>
      )}
      actionsTitle="Coaching Details"
      actionsDescription="A few more details to get you set up. Your team will be assigned by the club."
      renderActions={() => (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Coaching Certifications</Label>
            <Textarea rows={2} value={certifications} onChange={(e) => setCertifications(e.target.value)} placeholder="e.g. USSF National D License, Safe Sport Certified" />
          </div>
          <div className="space-y-1.5">
            <Label>License Number (if any)</Label>
            <Input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder="e.g. USSF-D-12345" />
          </div>
          <div className="space-y-1.5">
            <Label>Preferred Age Groups</Label>
            <div className="flex flex-wrap gap-2">
              {AGE_GROUPS.map((ag) => (
                <button
                  key={ag}
                  type="button"
                  onClick={() => toggleAgeGroup(ag)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    preferredAgeGroups.includes(ag)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-slate-200 text-slate-600 hover:border-primary/50"
                  }`}
                >
                  {ag}
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
          items: [
            { label: "Phone", value: phone },
            { label: "Emergency Contact", value: emergencyContactName ? `${emergencyContactName} (${emergencyContactPhone})` : "" },
          ],
        },
        {
          title: "Coaching Details",
          stepIndex: 3,
          items: [
            { label: "Certifications", value: certifications },
            { label: "License #", value: licenseNumber },
            { label: "Preferred Age Groups", value: preferredAgeGroups.join(", ") },
          ],
        },
      ]}
      onSubmit={() => submit({ phone, certifications, license_number: licenseNumber, preferred_age_groups: preferredAgeGroups, emergency_contact: { name: emergencyContactName, phone: emergencyContactPhone } })}
      submitting={submitting}
    />
  );
}