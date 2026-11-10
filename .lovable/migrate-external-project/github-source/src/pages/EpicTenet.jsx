import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { BackLink, AdisalTabs, AdisalCard, SectionLabel } from "@/components/adisal/ui";
import { Button } from "@/components/ui/button";
import { Dumbbell, Calendar, Video, ChevronRight, Clock, Users, BookOpen } from "lucide-react";
import { createPageUrl } from "@/utils";

const TENETS = [
  {
    key: "e", letter: "E", word: "EXPLOSIVE", color: "#DE5045",
    desc: "Your physical engine. The Explosive tenet measures raw athleticism — speed off the mark, power in duels, endurance to dominate the 90th minute, and agility to change direction before opponents react.",
    skills: [
      { num: "01", title: "SPRINT SPEED & FIRST STEP ACCELERATION" },
      { num: "02", title: "STRENGTH & POWER IN DUELS" },
      { num: "03", title: "AEROBIC ENDURANCE" },
      { num: "04", title: "AGILITY & CHANGE OF DIRECTION" },
      { num: "05", title: "FLEXIBILITY & INJURY PREVENTION" },
    ],
    mentalConnection: "Explosive players combine physical ability with the Combative Effort tenet. They outwork opponents because they have decided to, not because they are told to.",
  },
  {
    key: "p", letter: "P", word: "PRECISE", color: "#3A7BD5",
    desc: "Technical mastery under pressure. Precise players execute flawlessly with both feet on every surface — whether a first touch in traffic, a cutback at pace, or a finish from a tight angle.",
    skills: [
      { num: "01", title: "FIRST TOUCH & RECEIVING UNDER PRESSURE" },
      { num: "02", title: "SHORT & LONG PASSING ACCURACY" },
      { num: "03", title: "DRIBBLING & 1V1 ATTACKING" },
      { num: "04", title: "FINISHING & SHOOTING" },
      { num: "05", title: "WEAK FOOT DEVELOPMENT" },
      { num: "06", title: "CROSSING & DELIVERY" },
    ],
    mentalConnection: "Precision under pressure is 50% technical and 50% Combative Mindset. The players who execute in big moments trust their training and quiet the noise.",
  },
  {
    key: "i", letter: "I", word: "INSIGHTFUL", color: "#399F7D",
    desc: "Reading the game before it happens. Insightful players see solutions two moves ahead — positioning is never accidental, decisions are never rushed, and transition play is always deliberate.",
    skills: [
      { num: "01", title: "POSITIONAL AWARENESS & SHAPE" },
      { num: "02", title: "DECISION MAKING SPEED" },
      { num: "03", title: "READING DEFENSIVE & ATTACKING LINES" },
      { num: "04", title: "PRESSING TRIGGERS & COMPACTNESS" },
      { num: "05", title: "TRANSITION PLAY (D-TO-A & A-TO-D)" },
      { num: "06", title: "SET PIECE EXECUTION" },
    ],
    mentalConnection: "Insightful players embody the Combative Awareness tenet. Their scanning becomes instinct, their positioning becomes identity.",
  },
  {
    key: "c", letter: "C", word: "COMBATIVE", color: "#D49D42",
    desc: "The competitive character that separates good from great. Combative players set the standard. Built on the M.E.N.T.A.L. framework, this tenet is the multiplier for everything else.",
    skills: [
      { num: "01", letter: "M", title: "MINDSET & CONFIDENCE" },
      { num: "02", letter: "E", title: "EFFORT & COMPETITIVE DRIVE" },
      { num: "03", letter: "N", title: "NEXT PLAY FOCUS & RESILIENCE" },
      { num: "04", letter: "T", title: "TEAM FIRST MENTALITY" },
      { num: "05", letter: "A", title: "AWARENESS & COMMUNICATION" },
      { num: "06", letter: "L", title: "LEADERSHIP & ACCOUNTABILITY" },
    ],
    mentalConnection: "The Combative tenet IS the M.E.N.T.A.L. framework. Every other tenet is amplified when a player competes with relentless effort, resilience, and team-first accountability.",
  },
];

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "training", label: "Training" },
  { key: "sessions", label: "Sessions" },
  { key: "videos", label: "Videos" },
];

export default function EpicTenet() {
  const [active, setActive] = useState("c");
  const [tab, setTab] = useState("overview");
  const tenet = TENETS.find((t) => t.key === active);

  const { data: sessions = [] } = useQuery({
    queryKey: ["epic-sessions"],
    queryFn: () => base44.entities.TrainingSession.list("order", 200),
  });
  const { data: testSessions = [] } = useQuery({
    queryKey: ["epic-test-sessions"],
    queryFn: () => base44.entities.TestSession.list("-test_date", 50),
  });
  const { data: videos = [] } = useQuery({
    queryKey: ["epic-videos"],
    queryFn: () => base44.entities.TrainingVideo.list("order", 200),
  });

  const tenetSessions = sessions.filter((s) => s.tenet === tenet.key);
  const tenetVideos = videos.filter((v) => v.tenet === tenet.key);

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto relative">
      <BackLink to={createPageUrl("CenterOfExcellence")} />

      {/* Tenet selector */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {TENETS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setActive(t.key); setTab("overview"); }}
            className="px-4 py-3 rounded-lg border-2 text-left transition-all"
            style={active === t.key
              ? { borderColor: t.color, background: t.color, color: "white" }
              : { borderColor: "#E5E7EB", background: "white", color: "#64748B" }}
          >
            <span className="text-lg font-extrabold">{t.letter}</span>
            <span className="text-xs font-bold tracking-wider uppercase ml-1">— {t.word}</span>
          </button>
        ))}
      </div>

      {/* Hero section with watermark */}
      <div className="relative mb-6 overflow-hidden">
        <span
          className="absolute -top-8 -right-4 text-[200px] font-extrabold leading-none select-none pointer-events-none"
          style={{ color: tenet.color, opacity: 0.06 }}
        >
          {tenet.letter}
        </span>
        <div className="relative">
          <div className="text-xs font-bold tracking-wider uppercase mb-2" style={{ color: tenet.color }}>
            — E.P.I.C. TENET
          </div>
          <div className="flex items-center gap-4 mb-4">
            <h1 className="text-5xl font-extrabold tracking-tight text-foreground">
              <span style={{ color: tenet.color }}>{tenet.letter}</span> — {tenet.word}
            </h1>
          </div>
          <p className="text-muted-foreground max-w-2xl">{tenet.desc}</p>
        </div>
      </div>

      <AdisalTabs tabs={TABS} active={tab} onChange={setTab} />

      {/* Tab content */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Key Skills */}
          <div>
            <SectionLabel>Key Skills</SectionLabel>
            <div className="space-y-2">
              {tenet.skills.map((s) => (
                <AdisalCard key={s.num} className="p-4 flex items-center gap-4">
                  <span className="text-xs font-bold text-muted-foreground w-6">{s.num}</span>
                  {s.letter && (
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold shrink-0"
                      style={{ background: tenet.color + "15", color: tenet.color }}>
                      {s.letter}
                    </span>
                  )}
                  <span className="text-sm font-bold tracking-wide text-foreground">{s.title}</span>
                </AdisalCard>
              ))}
            </div>
            {/* Mental Connection */}
            <div className="mt-4 p-4 rounded-lg bg-secondary/30 border-l-4" style={{ borderColor: tenet.color }}>
              <div className="text-xs font-bold tracking-wider uppercase mb-2" style={{ color: tenet.color }}>
                The Mental Connection
              </div>
              <p className="text-sm text-foreground">{tenet.mentalConnection}</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <SectionLabel>Quick Actions</SectionLabel>
            <div className="space-y-3">
              {[
                { icon: Dumbbell, title: "VIEW TRAINING DRILLS", desc: "Structured sessions and exercises for this tenet", to: createPageUrl("KnowledgeBank") },
                { icon: Calendar, title: "BOOK A SESSION", desc: "Schedule focused coaching with a specialist", to: createPageUrl("TestDayManager") },
                { icon: Video, title: "WATCH TRAINING VIDEOS", desc: "Film study and technique breakdowns", to: createPageUrl("VideoLibrary") },
              ].map((a) => (
                <Link key={a.title} to={a.to}>
                  <AdisalCard className="p-4 flex items-center gap-4 group cursor-pointer">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: tenet.color + "15" }}>
                      <a.icon className="w-5 h-5" style={{ color: tenet.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold tracking-wide uppercase text-foreground">{a.title}</div>
                      <div className="text-xs text-muted-foreground">{a.desc}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </AdisalCard>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "training" && (
        <div>
          <SectionLabel>Training Sessions — {tenet.word}</SectionLabel>
          {tenetSessions.length === 0 ? (
            <div className="text-center py-16">
              <Dumbbell className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No training sessions tagged for this tenet yet.</p>
              <Link to={createPageUrl("KnowledgeBank")}>
                <Button variant="outline" className="mt-4">Browse All Sessions</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tenetSessions.map((s) => (
                <AdisalCard key={s.id} className="p-4">
                  <div className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground mb-1">{s.position}</div>
                  <h3 className="font-bold text-sm text-foreground mb-1">{s.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{s.description}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {s.duration_minutes && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{s.duration_minutes}m</span>}
                    {s.player_count && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{s.player_count}</span>}
                  </div>
                </AdisalCard>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "sessions" && (
        <div>
          <SectionLabel>Scheduled Test Sessions</SectionLabel>
          {testSessions.length === 0 ? (
            <div className="text-center py-16">
              <Calendar className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No test sessions scheduled yet.</p>
              <Link to={createPageUrl("TestDayManager")}>
                <Button variant="outline" className="mt-4">Schedule a Test Day</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {testSessions.map((ts) => (
                <AdisalCard key={ts.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded"
                      style={{ background: tenet.color + "15", color: tenet.color }}>
                      {ts.assessment_type || "skill"}
                    </span>
                    <span className="text-xs text-muted-foreground">{ts.status}</span>
                  </div>
                  <h3 className="font-bold text-sm text-foreground mb-2">{ts.title}</h3>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5"><Calendar className="w-3 h-3" />{ts.test_date} at {ts.start_time}</div>
                    {ts.location && <div className="flex items-center gap-1.5"><BookOpen className="w-3 h-3" />{ts.location}</div>}
                    <div className="flex items-center gap-1.5"><Users className="w-3 h-3" />{ts.roster_player_ids?.length || 0} players</div>
                  </div>
                </AdisalCard>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "videos" && (
        <div>
          <SectionLabel>Training Videos — {tenet.word}</SectionLabel>
          {tenetVideos.length === 0 ? (
            <div className="text-center py-16">
              <Video className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No videos tagged for this tenet yet.</p>
              <Link to={createPageUrl("VideoLibrary")}>
                <Button variant="outline" className="mt-4">Browse All Videos</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {tenetVideos.map((v) => (
                <div key={v.id} className="bg-card border border-border rounded-lg overflow-hidden group cursor-pointer hover:border-primary/40 transition-colors">
                  <div className="relative aspect-video bg-secondary flex items-center justify-center">
                    {v.thumbnail_url ? (
                      <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover" />
                    ) : (
                      <Video className="w-8 h-8 text-muted-foreground/30" />
                    )}
                    {v.duration && (
                      <div className="absolute bottom-2 right-2 bg-foreground/90 text-background text-[10px] font-bold px-1.5 py-0.5 rounded">
                        {v.duration}
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-bold text-sm text-foreground line-clamp-2 mb-1">{v.title}</h3>
                    {v.author && <p className="text-xs text-muted-foreground">{v.author}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}