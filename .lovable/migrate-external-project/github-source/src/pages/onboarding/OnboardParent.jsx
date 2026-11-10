import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { HeartHandshake, Plus, Trash2, UserPlus, Users, Calendar, MessageSquare } from "lucide-react";
import OnboardingCardFlow from "@/components/onboarding/OnboardingCardFlow";
import { useOnboardingSubmit } from "@/lib/useOnboardingSubmit";

const HIGHLIGHTS = [
  { icon: Users, title: "Register Players", description: "Add your children and enroll them in club programs" },
  { icon: Calendar, title: "View Schedules", description: "See practices, games, and events for every team" },
  { icon: MessageSquare, title: "Message Coaches", description: "Stay in touch with coaches and club staff" },
];

export default function OnboardParent() {
  const [phone, setPhone] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [children, setChildren] = useState([{ first_name: "", last_name: "", date_of_birth: "" }]);
  const [guardianInvites, setGuardianInvites] = useState([]);
  const { submit, submitting } = useOnboardingSubmit("parent_guardian");

  const updateChild = (idx, patch) => setChildren((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  const addChild = () => setChildren((prev) => [...prev, { first_name: "", last_name: "", date_of_birth: "" }]);
  const removeChild = (idx) => setChildren((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  const addGuardianInvite = () => setGuardianInvites((prev) => [...prev, { full_name: "", email: "", access_level: "full" }]);
  const updateGuardianInvite = (idx, patch) => setGuardianInvites((prev) => prev.map((g, i) => (i === idx ? { ...g, ...patch } : g)));
  const removeGuardianInvite = (idx) => setGuardianInvites((prev) => prev.filter((_, i) => i !== idx));

  const validChildren = children.filter((c) => c.first_name.trim() && c.last_name.trim());
  const validInvites = guardianInvites.filter((g) => g.email.trim());

  const handleSubmit = () => {
    submit({ phone, street_address: streetAddress, city, state, zip_code: zipCode, emergency_contact: { name: emergencyContactName, phone: emergencyContactPhone }, children: validChildren, guardian_invites: validInvites });
  };

  return (
    <OnboardingCardFlow
      icon={HeartHandshake}
      roleLabel="Parent / Guardian"
      welcomeMessage="As a parent, you'll register your children, track their schedules, and stay in touch with coaches — all from one place. Teams are assigned by your club after registration."
      highlights={HIGHLIGHTS}
      renderContact={() => (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Phone Number</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" />
          </div>
          <div className="space-y-1.5">
            <Label>Street Address</Label>
            <Input value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} placeholder="123 Main St" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
            </div>
            <div className="space-y-1.5">
              <Label>State</Label>
              <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="MI" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>ZIP Code</Label>
            <Input value={zipCode} onChange={(e) => setZipCode(e.target.value)} placeholder="48100" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>Emergency Contact Name</Label>
              <Input value={emergencyContactName} onChange={(e) => setEmergencyContactName(e.target.value)} placeholder="Spouse, parent, etc." />
            </div>
            <div className="space-y-1.5">
              <Label>Emergency Contact Phone</Label>
              <Input value={emergencyContactPhone} onChange={(e) => setEmergencyContactPhone(e.target.value)} placeholder="(555) 123-4567" />
            </div>
          </div>
        </div>
      )}
      actionsTitle="Add Your Children"
      actionsDescription="Add each child now, or skip and add them later. Your club will assign teams for you."
      renderActions={() => (
        <>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Your Children</Label>
              <Button variant="outline" size="sm" onClick={addChild}><Plus className="w-3.5 h-3.5 mr-1" /> Add Child</Button>
            </div>
            {children.map((child, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                <div className="space-y-1">
                  <Label className="text-xs">First Name</Label>
                  <Input value={child.first_name} onChange={(e) => updateChild(idx, { first_name: e.target.value })} className="h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Last Name</Label>
                  <Input value={child.last_name} onChange={(e) => updateChild(idx, { last_name: e.target.value })} className="h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Date of Birth</Label>
                  <Input type="date" value={child.date_of_birth} onChange={(e) => updateChild(idx, { date_of_birth: e.target.value })} className="h-9" />
                </div>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-red-600" onClick={() => removeChild(idx)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Invite Other Guardians (optional)</Label>
              <Button variant="outline" size="sm" onClick={addGuardianInvite}><UserPlus className="w-3.5 h-3.5 mr-1" /> Invite Guardian</Button>
            </div>
            <p className="text-xs text-slate-500">
              Invite a parent/guardian as an account co-owner. They'll be able to see information about players in your account, register a player, and view club information and news.
            </p>
            {guardianInvites.map((g, idx) => (
              <div key={idx} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-2">
                <div className="grid grid-cols-[1fr_1.2fr_auto] gap-2">
                  <Input placeholder="Name" value={g.full_name} onChange={(e) => updateGuardianInvite(idx, { full_name: e.target.value })} className="h-9" />
                  <Input type="email" placeholder="email@example.com" value={g.email} onChange={(e) => updateGuardianInvite(idx, { email: e.target.value })} className="h-9" />
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-red-600" onClick={() => removeGuardianInvite(idx)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="pl-1">
                  <Label className="text-xs text-slate-500 mb-1.5 block">Access Level</Label>
                  <RadioGroup value={g.access_level} onValueChange={(v) => updateGuardianInvite(idx, { access_level: v })} className="flex flex-col gap-1.5">
                    <div className="flex items-start gap-2">
                      <RadioGroupItem value="full" id={`g-${idx}-full`} className="mt-0.5" />
                      <div>
                        <Label htmlFor={`g-${idx}-full`} className="text-sm font-medium cursor-pointer">Yes, with Full Access</Label>
                        <p className="text-xs text-slate-500">Member has full administration access to the account</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <RadioGroupItem value="limited" id={`g-${idx}-limited`} className="mt-0.5" />
                      <div>
                        <Label htmlFor={`g-${idx}-limited`} className="text-sm font-medium cursor-pointer">Yes, with Limited Access</Label>
                        <p className="text-xs text-slate-500">Member has view-only access to player information, including calendars and messaging</p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      summarySections={[
        {
          title: "Contact & Address",
          stepIndex: 2,
          items: [
            { label: "Phone", value: phone },
            { label: "Address", value: [streetAddress, city, state, zipCode].filter(Boolean).join(", ") },
            { label: "Emergency Contact", value: emergencyContactName ? `${emergencyContactName} (${emergencyContactPhone})` : "" },
          ],
        },
        {
          title: "Children & Guardians",
          stepIndex: 3,
          items: [
            { label: "Children", value: validChildren.map((c) => `${c.first_name} ${c.last_name}`).join(", ") || `${validChildren.length}` },
            { label: "Guardians Invited", value: validInvites.length ? `${validInvites.length} (${validInvites.map((g) => g.access_level).join(", ")})` : "" },
          ],
        },
      ]}
      onSubmit={handleSubmit}
      submitting={submitting}
    />
  );
}