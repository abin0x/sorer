import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  ensureDefaultChannels, resolveMembership, filterReadableChannels, resolveChannelAudienceEmails,
} from "@/lib/beaconChannels";

/** Loads everything the Beacon Channels experience needs for the current user's club. */
export default function useBeaconData(user) {
  const queryClient = useQueryClient();
  const clubId = user?.club_id;

  const { data: teams = [] } = useQuery({ queryKey: ["beacon-teams", clubId], queryFn: () => base44.entities.Team.filter({ club_id: clubId }, "-created_date", 300), enabled: !!clubId });
  const { data: coaches = [] } = useQuery({ queryKey: ["beacon-coaches", clubId], queryFn: () => base44.entities.Coach.filter({ club_id: clubId }, "last_name", 300), enabled: !!clubId });
  const { data: guardians = [] } = useQuery({ queryKey: ["beacon-guardians", clubId], queryFn: () => base44.entities.Guardian.filter({ club_id: clubId }, "-created_date", 500), enabled: !!clubId });
  const { data: players = [] } = useQuery({ queryKey: ["beacon-players", clubId], queryFn: () => base44.entities.Player.filter({ club_id: clubId }, "-created_date", 1000), enabled: !!clubId });

  const { data: channels = [], isLoading: channelsLoading } = useQuery({
    queryKey: ["beacon-channels", clubId],
    queryFn: () => base44.entities.Channel.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  // Server-resolved team access — the same set the channel read rules enforce.
  const [teamAccess, setTeamAccess] = useState(null);
  useEffect(() => {
    if (!clubId) return;
    let active = true;
    base44.functions.invoke("beacon-team-access", {})
      .then((r) => {
        if (!active) return;
        setTeamAccess(r.data?.team_ids || []);
        queryClient.invalidateQueries({ queryKey: ["beacon-channels", clubId] });
        queryClient.invalidateQueries({ queryKey: ["beacon-messages"] });
      })
      .catch(() => {});
    return () => { active = false; };
  }, [clubId]);

  const membership = useMemo(() => {
    const base = resolveMembership(user, { teams, coaches, guardians });
    // The server's answer mirrors the database read rules, so prefer it.
    if (Array.isArray(teamAccess) && !base.allTeams) return { ...base, teamIds: teamAccess };
    if ((user?.custom_role || user?.role) === "parent_guardian" && base.guardianRecord) {
      const myChildren = players.filter((p) => (p.guardian_ids?.length ? p.guardian_ids : [p.guardian_id]).includes(base.guardianRecord.id));
      return { ...base, teamIds: [...new Set(myChildren.map((c) => c.team_id).filter(Boolean))] };
    }
    return base;
  }, [user, teams, coaches, guardians, players, teamAccess]);

  // Idempotent: seed any missing default channels once teams are known.
  // Staff only — a team-scoped member cannot see every channel, so seeding
  // from their view would recreate the channels they cannot see.
  useEffect(() => {
    if (!clubId || teams.length === 0 || channelsLoading || !membership.allTeams) return;
    ensureDefaultChannels(clubId, teams).then((created) => {
      if (created !== undefined) queryClient.invalidateQueries({ queryKey: ["beacon-channels", clubId] });
    });
  }, [clubId, teams.length, channelsLoading, membership.allTeams]);

  const readableChannels = useMemo(() => filterReadableChannels(user, channels, membership), [user, channels, membership]);

  const clubChannels = useMemo(() => readableChannels.filter((c) => c.scope === "club"), [readableChannels]);
  const teamGroups = useMemo(() => {
    const byTeam = new Map();
    readableChannels.filter((c) => c.scope === "team").forEach((c) => {
      if (!byTeam.has(c.team_id)) byTeam.set(c.team_id, { teamId: c.team_id, teamName: c.team_name, channels: [] });
      byTeam.get(c.team_id).channels.push(c);
    });
    return [...byTeam.values()].sort((a, b) => (a.teamName || "").localeCompare(b.teamName || ""));
  }, [readableChannels]);

  const { data: prefRows = [] } = useQuery({
    queryKey: ["beacon-prefs", clubId],
    queryFn: () => base44.entities.NotificationPreference.filter({ club_id: clubId }),
    enabled: !!clubId,
  });
  const myPrefs = prefRows.find((p) => p.user_id === user?.id) || null;

  const audienceFor = (channel) => resolveChannelAudienceEmails(channel, { coaches, guardians, players });

  return {
    teams, coaches, guardians, players, channels: readableChannels, clubChannels, teamGroups,
    membership, prefRows, myPrefs, audienceFor, channelsLoading,
  };
}