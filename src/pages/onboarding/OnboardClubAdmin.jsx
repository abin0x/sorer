import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, Users, Settings, Wallet, Plus, Trash2, ArrowLeftRight, CalendarClock, ClipboardCheck, Palette, MapPin } from "lucide-react";
import OnboardingCardFlow from "@/components/onboarding/OnboardingCardFlow";
import { useOnboardingSubmit } from "@/lib/useOnboardingSubmit";
import { useTenant } from "@/lib/TenantContext";

const HIGHLIGHTS = [
  { icon: Users, title: "Manage Users & Roles", description: "Invite staff and control who can access what" },
  { icon: Settings, title: "Configure Club Settings", description: "Set up branding, branches, and preferences" },
  { icon: Wallet, title: "Track Finances & Reports", description: "See payments, expenses, and club-wide reports" },
  { icon: ArrowLeftRight, title: "Migrate from Another Platform", description: "Import your existing data from TeamSnap, SportsEngine, and more" },
];

const COMPETITOR_SOURCES = [
  { value: "teamsnap", label: "TeamSnap" },
  { value: "sportsengine", label: "SportsEngine" },
  { value: "sprocket", label: "Sprocket" },
  { value: "leagueapps", label: "LeagueApps" },
  { value: "playmetrics", label: "PlayMetrics" },
  { value: "waresport", label: "WareSport" },
  { value: "spreadsheet_other", label: "Spreadsheet / Other" },
];

export default function OnboardClubAdmin() {
  const { brand } = useTenant();
  const { submit, submitting } = useOnboardingSubmit("club_admin");

  // Personal info
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("");
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [weeklyReports, setWeeklyReports] = useState(true);

  // Club branding
  const [primaryColor, setPrimaryColor] = useState(brand.primary_color || "#399F7D");
  const [clubName, setClubName] = useState(brand.club_name || "");

  // Branches
  const [branches, setBranches] = useState([{ name: "", city: "", state: "" }]);

  // Migration
  const [migrationSource, setMigrationSource] = useState("");
  const [skipMigration, setSkipMigration] = useState(false);

  // Season
  const [seasonName, setSeasonName] = useState("");
  const [seasonStart, setSeasonStart] = useState("");
  const [seasonEnd, setSeasonEnd] = useState("");

  // Tryouts
  const [tryoutDate, setTryoutDate] = useState("");
  const [tryoutLocation, setTryoutLocation] = useState("");
  const [skipTryouts, setSkipTryouts] = useState(false);

  useEffect(() => {
    base44.auth.me().then((u) => {
      if (u?.phone) setPhone(u.phone);
      if (u?.title) setTitle(u.title);
    }).catch(() => {});
  }, []);

  const updateBranch = (idx, patch) => setBranches((prev) => prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)));
  const addBranch = () => setBranches((prev) => [...prev, { name: "", city: "", state: "" }]);
  const removeBranch = (idx) => setBranches((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  const validBranches = branches.filter((b) => b.name.trim());

  const handleSubmit = () => {
    const data = {
      phone,
      title,
      preferences: { email_alerts: emailAlerts, weekly_reports: weeklyReports },
      club_branding: { primary_color: primaryColor, club_name: clubName },
      branches: validBranches,
      migration: { competitor_source: skipMigration ? null : migrationSource, skip: skipMigration },
      season: seasonName.trim() ? { name: seasonName, start_date: seasonStart, end_date: seasonEnd } : null,
      tryouts: !skipTryouts && tryoutDate ? { date: tryoutDate, location: tryoutLocation } : null,
    };
    // After onboarding, go to migration wizard if not skipped, else tryout planner if tryouts set, else home
    const redirect = !skipMigration && migrationSource
      ? "/MigrationWizard"
      : (!skipTryouts && tryoutDate)
        ? "/TryoutDashboard"
        : "/home";
    submit(data, redirect);
  };

  // Step index mapping for review edit links
  // 0=welcome, 1=highlights, 2=contact, 3=branding, 4=branches, 5=migration, 6=season, 7=tryouts, 8=review
  const summarySections = [
    {
      title: "Contact & Preferences",
      stepIndex: 2,
      items: [
        { label: "Phone", value: phone },
        { label: "Title", value: title },
        { label: "Email Alerts", value: emailAlerts ? "On" : "Off" },
        { label: "Weekly Reports", value: weeklyReports ? "On" : "Off" },
      ],
    },
    {
      title: "Club Branding",
      stepIndex: 3,
      items: [
        { label: "Club Name", value: clubName || brand.club_name },
        { label: "Primary Color", value: primaryColor },
      ],
    },
    {
      title: "Branches",
      stepIndex: 4,
      items: validBranches.length > 0
        ? validBranches.map((b) => ({ label: b.name, value: [b.city, b.state].filter(Boolean).join(", ") }))
        : [{ label: "Branches", value: "None added yet" }],
    },
    {
      title: "Data Migration",
      stepIndex: 5,
      items: [
        { label: "Status", value: skipMigration ? "Skip for now" : migrationSource ? COMPETITOR_SOURCES.find((s) => s.value === migrationSource)?.label || migrationSource : "Not selected" },
      ],
    },
    {
      title: "Season",
      stepIndex: 6,
      items: seasonName.trim()
        ? [
            { label: "Season Name", value: seasonName },
            { label: "Start Date", value: seasonStart || "—" },
            { label: "End Date", value: seasonEnd || "—" },
          ]
        : [{ label: "Season", value: "Not set up yet" }],
    },
    {
      title: "Tryouts",
      stepIndex: 7,
      items: skipTryouts
        ? [{ label: "Tryouts", value: "Skip for now" }]
        : tryoutDate
          ? [
              { label: "Tryout Date", value: tryoutDate },
              { label: "Location", value: tryoutLocation || "—" },
            ]
          : [{ label: "Tryouts", value: "Not set up yet" }],
    },
  ];

  const customSteps = [
    {
      key: "branding",
      label: "Branding",
      title: "Club Branding",
      description: "Confirm your club's identity. You can change these later in Settings.",
      render: () => (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Club Name</Label>
            <Input value={clubName} onChange={(e) => setClubName(e.target.value)} placeholder={brand.club_name || "Your Club Name"} />
          </div>
          <div className="space-y-1.5">
            <Label>Primary Color</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer"
              />
              <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="flex-1" />
              <div className="w-10 h-10 rounded-lg border border-slate-200" style={{ backgroundColor: primaryColor }} />
            </div>
            <p className="text-xs text-slate-500">This color appears across your club's dashboards, buttons, and branding.</p>
          </div>
        </div>
      ),
    },
    {
      key: "branches",
      label: "Branches",
      title: "Branch Structure",
      description: "Add your club's branches (locations). You can add more later.",
      render: () => (
        <div className="space-y-3">
          {branches.map((b, idx) => (
            <div key={idx} className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.7fr)_auto] gap-2 items-end border border-border rounded-lg p-3">
              <div className="space-y-1">
                <Label className="text-xs">Branch Name</Label>
                <Input value={b.name} onChange={(e) => updateBranch(idx, { name: e.target.value })} placeholder="e.g. North Campus" className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">City</Label>
                <Input value={b.city} onChange={(e) => updateBranch(idx, { city: e.target.value })} placeholder="City" className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">State</Label>
                <Input value={b.state} onChange={(e) => updateBranch(idx, { state: e.target.value })} placeholder="MI" className="h-9" />
              </div>
              <Button variant="ghost" size="icon" aria-label={`Remove branch ${idx + 1}`} className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={() => removeBranch(idx)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addBranch}><Plus className="w-3.5 h-3.5 mr-1" /> Add Branch</Button>
        </div>
      ),
    },
    {
      key: "migration",
      label: "Migration",
      title: "Data Migration",
      description: "Import your existing data from another platform. You can skip this and do it later.",
      render: () => (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox id="skip-migration" checked={skipMigration} onCheckedChange={setSkipMigration} />
            <Label htmlFor="skip-migration" className="text-sm font-normal">Skip for now — I'll set up migration later</Label>
          </div>
          {!skipMigration && (
            <div className="space-y-1.5">
              <Label>Which platform are you migrating from?</Label>
              <Select value={migrationSource} onValueChange={setMigrationSource}>
                <SelectTrigger><SelectValue placeholder="Select your previous platform" /></SelectTrigger>
                <SelectContent>
                  {COMPETITOR_SOURCES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                After onboarding, you'll be taken to the Migration Wizard to upload your data files.
              </p>
            </div>
          )}
        </div>
      ),
    },
    {
      key: "season",
      label: "Season",
      title: "Season Planning",
      description: "Create your first season. You can add more seasons later.",
      render: () => (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Season Name</Label>
            <Input value={seasonName} onChange={(e) => setSeasonName(e.target.value)} placeholder="e.g. Fall 2026" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input type="date" value={seasonStart} onChange={(e) => setSeasonStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <Input type="date" value={seasonEnd} onChange={(e) => setSeasonEnd(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-slate-500">Leave blank to skip — you can create your first season from the Seasons page later.</p>
        </div>
      ),
    },
    {
      key: "tryouts",
      label: "Tryouts",
      title: "Tryout Planning",
      description: "Set up your tryout dates. You can skip this and use the Tryout Planner later.",
      render: () => (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox id="skip-tryouts" checked={skipTryouts} onCheckedChange={setSkipTryouts} />
            <Label htmlFor="skip-tryouts" className="text-sm font-normal">Skip for now — I'll plan tryouts later</Label>
          </div>
          {!skipTryouts && (
            <>
              <div className="space-y-1.5">
                <Label>Main Tryout Date</Label>
                <Input type="date" value={tryoutDate} onChange={(e) => setTryoutDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Tryout Location</Label>
                <Input value={tryoutLocation} onChange={(e) => setTryoutLocation(e.target.value)} placeholder="e.g. Main Campus - Field 1" />
              </div>
              <p className="text-xs text-slate-500">
                After onboarding, you'll be taken to the Tryout Planner to build your full tryout schedule.
              </p>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <OnboardingCardFlow
      icon={ShieldCheck}
      roleLabel="Club Admin"
      welcomeMessage="As Club Admin, you'll set up your club's branding, branches, migration, and season planning. This guided setup will get you ready for your first season."
      highlights={HIGHLIGHTS}
      renderContact={() => (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Phone Number</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" />
          </div>
          <div className="space-y-1.5">
            <Label>Your Title / Role</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Club Administrator, Operations Director" />
          </div>
        </div>
      )}
      actionsTitle="Notification Preferences"
      renderActions={() => (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox id="email-alerts" checked={emailAlerts} onCheckedChange={setEmailAlerts} />
            <Label htmlFor="email-alerts" className="text-sm font-normal">Email me important club alerts</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="weekly-reports" checked={weeklyReports} onCheckedChange={setWeeklyReports} />
            <Label htmlFor="weekly-reports" className="text-sm font-normal">Send me a weekly summary report</Label>
          </div>
        </div>
      )}
      customSteps={customSteps}
      summarySections={summarySections}
      onSubmit={handleSubmit}
      submitting={submitting}
    />
  );
}