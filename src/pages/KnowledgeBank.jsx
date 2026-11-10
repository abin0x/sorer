import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { AdisalPageHeader, AdisalTabs, AdisalCard, TenetBadge, LevelBadge } from "@/components/adisal/ui";
import { Input } from "@/components/ui/input";
import { Search, Clock, Users, ChevronRight, BookOpen, Calendar, GraduationCap } from "lucide-react";
import PositionGuide from "@/components/knowledge/PositionGuide";
import CurriculumTab from "@/components/knowledge/CurriculumTab";
import ResponsiveSelect from "@/components/shared/ResponsiveSelect";

const TABS = [
  { key: "guides", label: "Position Guides" },
  { key: "curriculum", label: "Curriculum" },
  { key: "library", label: "Session Library" },
  { key: "scheduled", label: "Scheduled Classes" },
];

const POSITION_ICONS = {
  Goalkeeper: "🧤",
  Centerback: "🛡️",
  Midfielder: "⚽",
  Forward: "⚡",
  Defender: "🛡️",
  Winger: "💨",
};

export default function KnowledgeBank() {
  const [tab, setTab] = useState("guides");
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState("all");
  const [topicFilter, setTopicFilter] = useState("all");

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["kb-sessions"],
    queryFn: () => base44.entities.TrainingSession.list("order", 200),
  });

  const { data: user } = useQuery({
    queryKey: ["kb-user"],
    queryFn: () => base44.auth.me().catch(() => null),
  });

  const positions = useMemo(() => [...new Set(sessions.map((s) => s.position).filter(Boolean))], [sessions]);
  const topics = useMemo(() => [...new Set(sessions.map((s) => s.topic).filter(Boolean))], [sessions]);

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      if (search && !s.title?.toLowerCase().includes(search.toLowerCase())) return false;
      if (posFilter !== "all" && s.position !== posFilter) return false;
      if (topicFilter !== "all" && s.topic !== topicFilter) return false;
      return true;
    });
  }, [sessions, search, posFilter, topicFilter]);

  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach((s) => {
      if (!map[s.position]) map[s.position] = [];
      map[s.position].push(s);
    });
    return map;
  }, [filtered]);

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <AdisalPageHeader
        breadcrumb="Coach Resources"
        title="KNOWLEDGE"
        titleAccent="BANK"
        subtitle="Position intelligence, curriculum library & training sessions"
      />

      <AdisalTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "guides" && <PositionGuide />}

      {tab === "curriculum" && <CurriculumTab user={user} />}

      {tab !== "guides" && tab !== "curriculum" && (
      <>
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search sessions..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <ResponsiveSelect
          value={posFilter}
          onChange={setPosFilter}
          label="Position"
          options={[{ value: "all", label: "All Positions" }, ...positions.map((p) => ({ value: p, label: p }))]}
        />
        <ResponsiveSelect
          value={topicFilter}
          onChange={setTopicFilter}
          label="Topic"
          options={[{ value: "all", label: "All Topics" }, ...topics.map((t) => ({ value: t, label: t }))]}
        />
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-muted-foreground">Loading sessions...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-20">
          <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No training sessions found. Add sessions to build your curriculum library.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([pos, posSessions]) => (
          <div key={pos} className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{POSITION_ICONS[pos] || "⚽"}</span>
              <h2 className="text-sm font-bold tracking-wider uppercase text-foreground">{pos}</h2>
              <span className="text-xs text-muted-foreground">({posSessions.length} sessions)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {posSessions.map((s) => (
                <AdisalCard key={s.id} className="p-4 cursor-pointer group">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex gap-1.5 flex-wrap">
                      {s.tenet && <TenetBadge tenet={s.tenet} />}
                      {s.level && <LevelBadge level={s.level} />}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground mb-1">{s.position}</div>
                  <h3 className="font-bold text-sm text-foreground mb-1">{s.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{s.description}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                    {s.duration_minutes && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {s.duration_minutes} min</span>}
                    {s.player_count && <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {s.player_count}</span>}
                  </div>
                  {s.objective && (
                    <div className="pt-3 border-t border-border">
                      <p className="text-[11px] font-bold tracking-wide uppercase text-primary">{s.objective}</p>
                    </div>
                  )}
                </AdisalCard>
              ))}
            </div>
          </div>
        ))
      )}
      </>
      )}
    </div>
  );
}