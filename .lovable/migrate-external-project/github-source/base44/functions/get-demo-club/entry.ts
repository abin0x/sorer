import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

const DEMO_SLUG = "demo-fc";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    let clubs = await svc.entities.Club.filter({ slug: DEMO_SLUG });
    let demoClub = clubs[0];

    if (!demoClub) {
      demoClub = await seedDemoData(svc);
    }

    const [branches, teams, players, events, messages, payments] = await Promise.all([
      svc.entities.Location.filter({ club_id: demoClub.id }),
      svc.entities.Team.filter({ club_id: demoClub.id }),
      svc.entities.Player.filter({ club_id: demoClub.id }),
      svc.entities.CalendarEvent.filter({ club_id: demoClub.id }),
      svc.entities.Message.filter({ club_id: demoClub.id }),
      svc.entities.Payment.filter({ club_id: demoClub.id }),
    ]);

    return Response.json({ club: demoClub, branches, teams, players, events, messages, payments });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function seedDemoData(svc) {
  const now = new Date();

  const club = await svc.entities.Club.create({
    name: "Demo FC",
    slug: DEMO_SLUG,
    is_demo: true,
    status: "active",
    plan_tier: "pro",
    primary_color: "#399F7D",
    secondary_color: "#F59E0B",
    director_name: "Sarah Mitchell",
    primary_contact_name: "Sarah Mitchell",
    primary_contact_email: "director@demofc.example",
    max_players: 100,
    max_branches: 10,
    max_teams: 20,
  });
  const clubId = club.id;

  const branches = await svc.entities.Location.bulkCreate([
    { club_id: clubId, name: "Northside Branch", address: "123 North Field Dr", city: "Northville", state: "MI", branch_type: "nexus", is_active: true, branch_director_name: "Mike Stevens", branch_director_email: "mike@demofc.example" },
    { club_id: clubId, name: "Southside Branch", address: "456 South Pitch Ave", city: "Southfield", state: "MI", branch_type: "branch", is_active: true, branch_director_name: "Jen Parker", branch_director_email: "jen@demofc.example" },
  ]);

  const teams = await svc.entities.Team.bulkCreate([
    { club_id: clubId, name: "U12 Boys Lightning", age_group: "U12", gender: "Boys", playing_format: "9v9", location_id: branches[0].id, location_name: branches[0].name, season: "2026-2027", league: "Regional League", max_roster_size: 16 },
    { club_id: clubId, name: "U12 Girls Storm", age_group: "U12", gender: "Girls", playing_format: "9v9", location_id: branches[0].id, location_name: branches[0].name, season: "2026-2027", league: "Regional League", max_roster_size: 16 },
    { club_id: clubId, name: "U14 Boys Thunder", age_group: "U14", gender: "Boys", playing_format: "11v11", location_id: branches[1].id, location_name: branches[1].name, season: "2026-2027", league: "State League", max_roster_size: 18 },
  ]);

  const firstNames = ["James","Liam","Noah","Ethan","Lucas","Mason","Aiden","Oliver","Ella","Mia","Ava","Sofia","Isabella","Zoe","Chloe","Riley","Caleb","Henry"];
  const lastNames = ["Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez","Wilson","Anderson","Taylor","Thomas","Moore","Lee","Clark","Lewis"];
  const playersData = [];
  for (let i = 0; i < 18; i++) {
    const team = teams[i % 3];
    const birthYear = 2014 - (i % 3);
    const month = String((i % 12) + 1).padStart(2, "0");
    const day = String((i % 28) + 1).padStart(2, "0");
    playersData.push({
      club_id: clubId,
      first_name: firstNames[i],
      last_name: lastNames[i],
      date_of_birth: `${birthYear}-${month}-${day}`,
      gender: team.gender === "Boys" ? "Boys" : "Girls",
      guardian_id: "demo-guardian-" + i,
      guardian_name: `Parent ${lastNames[i]}`,
      location_id: team.location_id,
      location_name: team.location_name,
      team_id: team.id,
      team_name: team.name,
      age_group: team.age_group,
      status: "active",
      season: "2026-2027",
    });
  }
  await svc.entities.Player.bulkCreate(playersData);

  const eventsData = [];
  const eventTypes = ["practice", "game", "practice", "practice", "game", "practice", "practice", "game"];
  for (let i = 0; i < 8; i++) {
    const team = teams[i % 3];
    const start = new Date(now.getTime() + (i + 1) * 24 * 60 * 60 * 1000);
    start.setHours(17, 0, 0, 0);
    const end = new Date(start.getTime() + 90 * 60 * 1000);
    const isGame = eventTypes[i] === "game";
    eventsData.push({
      club_id: clubId,
      title: isGame ? `${team.name} vs Rival FC` : `${team.name} Training`,
      event_type: eventTypes[i],
      start_datetime: start.toISOString(),
      end_datetime: end.toISOString(),
      location_text: team.location_name + " — Field 1",
      team_ids: [team.id],
      team_names: [team.name],
      status: "confirmed",
      visibility: "team_only",
      rsvp_required: isGame,
    });
  }
  await svc.entities.CalendarEvent.bulkCreate(eventsData);

  await svc.entities.Message.bulkCreate([
    { club_id: clubId, program_id: "demo", sender_email: "mike@demofc.example", sender_name: "Coach Mike", content: "Hi parents — tomorrow's practice is moved to 5pm on Field 2. Please bring cleats and water.", is_announcement: true },
    { club_id: clubId, program_id: "demo", sender_email: "sarah@demofc.example", sender_name: "Director Sarah", content: "Welcome to the 2026-2027 season, Demo FC families! Let's make it a great one.", is_announcement: true },
    { club_id: clubId, program_id: "demo", sender_email: "jen@demofc.example", sender_name: "Coach Jen", content: "Game day Saturday at 10am — players should arrive 30 minutes early for warm-up.", is_announcement: true },
    { club_id: clubId, program_id: "demo", sender_email: "tom@demofc.example", sender_name: "Coach Tom", content: "We're registered for the Spring Cup tournament. Details and travel info to follow this week.", is_announcement: true },
  ]);

  const payStatuses = ["paid_in_full", "paid_in_full", "past_due", "paid_in_full", "active"];
  const amounts = [850, 850, 850, 950, 850];
  for (let i = 0; i < 5; i++) {
    const team = teams[i % 3];
    await svc.entities.Payment.create({
      club_id: clubId,
      source_type: "registration",
      source_id: "demo-" + i,
      source_label: `${team.name} — Registration`,
      player_name: `${firstNames[i]} ${lastNames[i]}`,
      guardian_name: `Parent ${lastNames[i]}`,
      amount: amounts[i],
      currency: "USD",
      payment_method: "card",
      status: payStatuses[i],
      payment_date: now.toISOString().slice(0, 10),
      recorded_by: "bookkeeper@demofc.example",
    });
  }

  return club;
}