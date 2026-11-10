import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Mail, Send, Loader2, Search, Shield, Lock } from "lucide-react";
import { toast } from "sonner";
import MultiSelectDropdown from "@/components/communication/MultiSelectDropdown";
import RecipientRow from "@/components/communication/RecipientRow";
import { getCommunicationScope } from "@/lib/communicationAccess";

export default function ComposeTab({ user, initialRecipient }) {
  const queryClient = useQueryClient();
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [excludedKeys, setExcludedKeys] = useState(new Set());
  const [recipientSearch, setRecipientSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const { data: guardians = [] } = useQuery({ queryKey: ["comm-guardians"], queryFn: () => base44.entities.Guardian.list("-created_date", 500) });
  const { data: coaches = [] } = useQuery({ queryKey: ["comm-coaches"], queryFn: () => base44.entities.Coach.list("last_name", 200) });
  const { data: locations = [] } = useQuery({ queryKey: ["comm-locations"], queryFn: () => base44.entities.Location.list("name", 100) });
  const { data: platforms = [] } = useQuery({ queryKey: ["comm-platforms"], queryFn: () => base44.entities.Platform.list() });
  const { data: teams = [] } = useQuery({ queryKey: ["comm-teams"], queryFn: () => base44.entities.Team.list("-created_date", 200) });
  const { data: players = [] } = useQuery({ queryKey: ["comm-players"], queryFn: () => base44.entities.Player.list("-created_date", 500) });

  const scope = useMemo(
    () => getCommunicationScope(user, { teams, coaches, guardians, players, locations, platforms }),
    [user, teams, coaches, guardians, players, locations, platforms]
  );

  const guardianMap = useMemo(() => new Map(guardians.map((g) => [g.id, g])), [guardians]);
  const coachMap = useMemo(() => new Map(coaches.map((c) => [c.id, c])), [coaches]);

  // Resolve active branch + team lists from scope + selections
  const activeBranches = scope.branchFilter?.locked ? scope.branchFilter.value ? [scope.branchFilter.value] : [] : selectedBranches;
  const teamsInScope = useMemo(() => {
    if (scope.teamFilter?.locked) return teams.filter((t) => (scope.teamFilter.value || []).includes(t.id));
    if (activeBranches.length > 0) return teams.filter((t) => activeBranches.includes(t.location_name));
    return teams;
  }, [teams, scope, activeBranches]);

  const activeTeams = useMemo(() => {
    if (scope.teamFilter?.locked) return teamsInScope;
    if (selectedTeams.length > 0) return teamsInScope.filter((t) => selectedTeams.includes(t.id));
    return teamsInScope;
  }, [teamsInScope, scope, selectedTeams]);

  // Build recipient pool
  const recipients = useMemo(() => {
    if (initialRecipient) {
      return [{ key: `direct_${initialRecipient.email}`, type: "direct", name: initialRecipient.name, email: initialRecipient.email }];
    }
    if (!scope.canCompose) return [];
    if (scope.mode === "parent_direct") return scope.recipientPool || [];
    if (scope.mode === "team" && scope.teamFilter?.locked) {

      // Coaches/team managers: pre-select parents role
    }
    const list = [];
    const roles = selectedRoles.length > 0 ? selectedRoles : scope.teamFilter?.locked ? scope.roleOptions.map((r) => r.value) : [];

    if (roles.includes("coach")) {
      const coachIds = new Set();
      activeTeams.forEach((t) => {
        const ids = t.coach_ids?.length > 0 ? t.coach_ids : t.coach_id ? [t.coach_id] : [];
        ids.forEach((id) => coachIds.add(id));
      });
      coachIds.forEach((id) => {
        const c = coachMap.get(id);
        if (!c) return;
        const teamNames = activeTeams.filter((t) => (t.coach_ids?.length ? t.coach_ids : [t.coach_id]).includes(id)).map((t) => t.name);
        list.push({ key: `coach_${id}`, type: "coach", name: `${c.first_name} ${c.last_name}`, email: c.email, phone: c.phone, teams: teamNames });
      });
    }

    if (roles.includes("parent")) {
      const activeTeamIds = new Set(activeTeams.map((t) => t.id));
      const guardianToPlayers = new Map();
      players.filter((p) => activeTeamIds.has(p.team_id)).forEach((p) => {
        const gids = p.guardian_ids?.length > 0 ? p.guardian_ids : p.guardian_id ? [p.guardian_id] : [];
        gids.forEach((gid) => {
          if (!guardianToPlayers.has(gid)) guardianToPlayers.set(gid, []);
          guardianToPlayers.get(gid).push(`${p.first_name} ${p.last_name}`);
        });
      });
      guardianToPlayers.forEach((playerNames, gid) => {
        const g = guardianMap.get(gid);
        if (!g) return;
        list.push({ key: `parent_${gid}`, type: "parent", name: `${g.first_name} ${g.last_name}`, email: g.email, phone: g.phone, players: playerNames });
      });
    }

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [scope, selectedRoles, activeTeams, coachMap, guardianMap, players, initialRecipient]);

  const searchedRecipients = useMemo(() => {
    if (!recipientSearch.trim()) return recipients;
    const q = recipientSearch.toLowerCase();
    return recipients.filter((r) => r.name.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q));
  }, [recipients, recipientSearch]);

  const selectedRecipients = useMemo(() => recipients.filter((r) => !excludedKeys.has(r.key) && r.email), [recipients, excludedKeys]);

  const toggleRecipient = (key) => {
    setExcludedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);else
      next.add(key);
      return next;
    });
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {toast.error("Subject and message are required");return;}
    if (selectedRecipients.length === 0) {toast.error("No recipients selected");return;}
    setSending(true);
    try {
      const html = body.replace(/\n/g, "<br/>");
      const result = await base44.functions.invoke("sendBulkEmails", {
        recipients: selectedRecipients.map((r) => r.email),
        subject,
        html,
        from_name: user?.full_name || "Club Admin"
      });
      toast.success(`Sent to ${result.sent || selectedRecipients.length} recipients`);
      setSubject("");setBody("");
      queryClient.invalidateQueries({ queryKey: ["comm-email-logs"] });
    } catch (e) {
      toast.error("Failed to send: " + (e.message || "Unknown error"));
    } finally {
      setSending(false);
    }
  };

  if (!scope.canCompose && !initialRecipient) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-12 text-center">
          <Mail className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">You have receive-only communication rights.</p>
          <p className="text-xs text-muted-foreground mt-1">You'll get club messages via email and the inbox tab. Contact an admin if you need send access.</p>
        </CardContent>
      </Card>);

  }

  return (
    <div className="space-y-4">
      {/* Scope banner */}
      {!initialRecipient && (
      <div className="flex items-center gap-2 p-3 rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
        <Shield className="w-4 h-4 text-primary shrink-0" />
        <p className="text-sm text-foreground">
          <span className="font-semibold">Your access:</span> {scope.scopeLabel}
        </p>
      </div>
      )}
      {initialRecipient && (
      <div className="flex items-center gap-2 p-3 rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
        <Mail className="w-4 h-4 text-primary shrink-0" />
        <p className="text-sm text-foreground truncate">
          <span className="font-semibold">Direct message to:</span> {initialRecipient.name} ({initialRecipient.email})
        </p>
      </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Filters + recipients */}
        <div className="lg:col-span-2 space-y-4">
          {!initialRecipient && scope.mode !== "parent_direct" &&
          <Card className="border-border/60 rounded-2xl">
            <CardHeader><CardTitle className="text-base">Filters</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {scope.branchFilter &&
              <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block flex items-center gap-1 hidden">
                    Branch {scope.branchFilter.locked && <Lock className="w-3 h-3" />}
                  </label>
                  <MultiSelectDropdown
                  label="Branch"
                  options={scope.branchFilter.options}
                  selected={scope.branchFilter.locked ? scope.branchFilter.value ? [scope.branchFilter.value] : [] : selectedBranches}
                  onChange={scope.branchFilter.locked ? () => {} : (v) => {setSelectedBranches(v);setSelectedTeams([]);}} />
                
                </div>
              }
              {scope.platformFilter &&
              <div className="flex items-center gap-2 p-2 rounded-lg bg-fuchsia-50 border border-fuchsia-200">
                  <Lock className="w-3 h-3 text-fuchsia-600" />
                  <span className="text-sm text-fuchsia-900">Platform: {scope.platformFilter.value || "—"}</span>
                </div>
              }
              <div>
                <MultiSelectDropdown
                  label="Team"
                  options={scope.teamFilter?.options || []}
                  selected={scope.teamFilter?.locked ? scope.teamFilter.value || [] : selectedTeams}
                  onChange={scope.teamFilter?.locked ? () => {} : setSelectedTeams}
                  searchable />
                
              </div>
              {scope.roleOptions?.length > 0 &&
              <div>
                  <MultiSelectDropdown
                  label="Role"
                  options={scope.roleOptions}
                  selected={selectedRoles}
                  onChange={setSelectedRoles} />
                
                </div>
              }
            </CardContent>
          </Card>
          }

          <Card className="border-border/60 rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-sm flex items-center gap-2"><Mail className="w-4 h-4 text-primary" /> Recipients ({selectedRecipients.length}/{recipients.length})</CardTitle>
              {recipients.length > 0 &&
              <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-6 text-[11px] px-2" onClick={() => setExcludedKeys(new Set())}>Select All</Button>
                  <Button variant="ghost" size="sm" className="h-6 text-[11px] px-2" onClick={() => setExcludedKeys(new Set(recipients.map((r) => r.key)))}>Deselect All</Button>
                </div>
              }
            </CardHeader>
            <CardContent>
              {recipients.length === 0 ?
              <p className="text-xs text-muted-foreground">Select a role to build the recipient list.</p> :

              <>
                  <div className="relative mb-2">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input value={recipientSearch} onChange={(e) => setRecipientSearch(e.target.value)} placeholder="Search recipients..." className="h-8 pl-8 text-sm" />
                  </div>
                  <div className="max-h-96 overflow-y-auto space-y-0.5">
                    {searchedRecipients.map((r) =>
                  <RecipientRow key={r.key} recipient={r} checked={!excludedKeys.has(r.key)} onToggle={toggleRecipient} />
                  )}
                  </div>
                </>
              }
            </CardContent>
          </Card>
        </div>

        {/* Composer */}
        <div className="lg:col-span-3">
          <Card className="border-border/60 rounded-2xl h-full">
            <CardHeader><CardTitle className="text-base">Compose Message</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Subject</label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Enter subject line..." className="rounded-xl" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Message</label>
                <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type your message here..." rows={10} className="resize-none rounded-xl" />
              </div>
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/60">
                <div className="text-xs text-muted-foreground">
                  <Badge variant="outline" className="rounded-full">{selectedRecipients.length} recipients</Badge>
                </div>
                <Button onClick={handleSend} disabled={sending || !subject.trim() || !body.trim() || selectedRecipients.length === 0} className="bg-primary hover:bg-primary/90 text-white rounded-full shrink-0">
                  {sending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</> : <><Send className="w-4 h-4 mr-2" /> Send</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>);

}