import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const CLUB_EVENT_TYPE = { tournament: "tournament", camp: "registration", clinic: "registration", class: "registration", open_play: "custom", social: "custom" };
const origin = () => (typeof window !== "undefined" ? window.location.origin : "");

export const fromClubEvent = (e) => ({
  key: `club_event:${e.id}`, source_type: "club_event", source_id: e.id, title: e.name,
  marketing_type: CLUB_EVENT_TYPE[e.type] || "custom", date: e.start_date, time: e.start_time,
  location: e.location, description: e.description, url: `${origin()}/EventSignup`,
});
export const fromTournament = (t) => ({
  key: `tournament:${t.id}`, source_type: "tournament", source_id: t.id, title: t.name, marketing_type: "tournament",
  date: t.start_date, location: "", description: t.description, age_group: t.age_group, url: `${origin()}/TournamentRegistration?tournament=${t.id}`,
});
const TRYOUT_TITLES = { main_tryout: "Club Tryout", open_training: "Open Training", supplemental_tryout: "Supplemental Tryout" };
export const fromTryout = (t) => ({
  key: `tryout:${t.id}`, source_type: "tryout", source_id: t.id, title: TRYOUT_TITLES[t.type] || "Tryout", marketing_type: "tryout",
  date: t.date, time: t.start_time, location: t.location, description: t.notes, url: t.registration_url || `${origin()}/TryoutSignup?id=${t.id}`,
});
const fromGame = (g) => ({
  key: `game:${g.id}`, source_type: "game", source_id: g.id, title: `${g.home_team_name || "Home"} vs ${g.away_team_name || "Away"}`,
  marketing_type: "match", date: g.start_datetime?.slice(0, 10), time: g.start_datetime?.slice(11, 16), location: g.location_text, description: g.notes,
});

export function useMarketingEvents(clubId) {
  return useQuery({
    queryKey: ["mkt-events", clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const [ce, t, te, g] = await Promise.all([
        base44.entities.ClubEvent.filter({ club_id: clubId }, { sort: "-start_date", limit: 100 }),
        base44.entities.Tournament.filter({ club_id: clubId }, { sort: "-start_date", limit: 50 }),
        base44.entities.TryoutEvent.filter({ club_id: clubId }, { sort: "-date", limit: 50 }),
        base44.entities.CalendarEvent.filter({ club_id: clubId, event_type: "game" }, { sort: "-start_datetime", limit: 100 }),
      ]);
      return [...ce.items.filter((e) => e.status !== "cancelled").map(fromClubEvent), ...t.items.map(fromTournament), ...te.items.map(fromTryout), ...g.items.map(fromGame)]
        .filter((e) => e.date)
        .sort((a, b) => a.date.localeCompare(b.date));
    },
  });
}