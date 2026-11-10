// Builds the standard game-day task set (referee, trainer, matchday prep) for a game booking.
function dueDate(gameDate, daysBefore) {
  const d = new Date(gameDate);
  d.setDate(d.getDate() - daysBefore);
  return d.toISOString().split("T")[0];
}

export function buildGameTaskTemplates({ eventId, gameDate, homeLabel, awayLabel, fieldName }) {
  const matchup = `${homeLabel} vs ${awayLabel}`;
  return [
    {
      title: `Schedule & pay referees — ${matchup}`,
      description: `Confirm number of referees needed, assign referees, confirm availability, and submit payment request to the bookkeeper. Field: ${fieldName || "TBD"}.`,
      category: "Match Day Operations",
      task_type: "referee_schedule",
      requires_payment: true,
      due_date: dueDate(gameDate, 7),
      event_id: eventId,
    },
    {
      title: `Schedule & pay trainer — ${matchup}`,
      description: `Confirm trainer availability, assign trainer, and submit payment request to the bookkeeper.`,
      category: "Match Day Operations",
      task_type: "trainer_schedule",
      requires_payment: true,
      due_date: dueDate(gameDate, 7),
      event_id: eventId,
    },
    {
      title: `Matchday preparation — ${matchup}`,
      description: `Set up tents, place corner flags, position benches, stock water/supplies, confirm field markings and restroom access.`,
      category: "Match Day Operations",
      task_type: "matchday_prep",
      requires_payment: false,
      due_date: dueDate(gameDate, 1),
      event_id: eventId,
    },
  ];
}