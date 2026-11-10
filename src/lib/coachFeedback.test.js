import { describe, expect, it } from "bun:test";
import { coachFeedbackRequest, generateCoachFeedback, normalizeCoachFeedback } from "./coachFeedback";

const player = { id: "player-1", club_id: "club-1", first_name: "Ava", last_name: "Martinez", position: "Midfielder", age_group: "U17" };
const notes = [{ id: "note-1", note_text: "Scanning early and connecting passes.", context: "practice", tags: ["technical", "tactical"] }];

describe("coach feedback generation", () => {
  it("grounds the prompt in selected notes and the latest evaluation", () => {
    const { request } = coachFeedbackRequest({
      player,
      notes,
      evaluations: [{ strengths: "First touch", areas_of_growth: "Weak-foot passing" }],
    });
    expect(request.prompt).toContain("Scanning early and connecting passes.");
    expect(request.prompt).toContain("First touch");
    expect(request.prompt).toContain("Weak-foot passing");
    expect(request.prompt).toContain("at least one strength");
  });

  it("rejects generation without a selected or newly saved note", () => {
    expect(() => coachFeedbackRequest({ player, notes: [] })).toThrow("Select at least one note");
  });

  it("never accepts hallucinated videos outside the club library candidates", () => {
    const normalized = normalizeCoachFeedback({
      feedback_text: "Strong scanning. Keep progressing your left foot.",
      strengths: ["Early scanning"],
      development_priorities: ["Left-foot passing"],
      recommended_videos: [{ video_id: "foreign-video", title: "Injected", reason: "Not allowed" }],
    }, [{ video_id: "club-video", title: "First-touch basics" }]);
    expect(normalized.recommended_videos).toEqual([]);
  });

  it("creates a club-scoped private draft and waits for staff approval", async () => {
    let saved;
    const created = await generateCoachFeedback({
      player,
      clubId: "club-1",
      notes,
      evaluations: [],
      videos: [{ id: "video-1", title: "Receiving on the half-turn", tenet: "precise" }],
      curriculumDocs: [],
      userEmail: "coach@example.com",
      invokeLLM: async () => ({
        feedback_text: "Ava is scanning earlier. Next, keep building weak-foot repetitions.",
        strengths: ["Early scanning"],
        development_priorities: ["Weak-foot repetitions"],
        recommended_videos: [{ video_id: "video-1", reason: "Supports receiving body shape." }],
        suggested_goal: { description: "Three weak-foot sessions", measurable_target: "15 minutes weekly" },
      }),
      createFeedback: async (payload) => { saved = payload; return { id: "draft-1", ...payload }; },
    });
    expect(saved.club_id).toBe("club-1");
    expect(saved.player_id).toBe("player-1");
    expect(saved.note_id).toBe("note-1");
    expect(saved.status).toBe("draft");
    expect(saved.sent_at).toBeUndefined();
    expect(created.recommended_videos[0].title).toBe("Receiving on the half-turn");
  });
});
