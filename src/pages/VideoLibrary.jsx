import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { AdisalPageHeader, FilterPill, TenetBadge, LevelBadge, TENET_COLORS } from "@/components/adisal/ui";
import { Input } from "@/components/ui/input";
import { Search, Play } from "lucide-react";

const TENETS = ["explosive", "precise", "insightful", "combative"];

export default function VideoLibrary() {
  const [search, setSearch] = useState("");
  const [tenetFilter, setTenetFilter] = useState("all");

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ["vl-videos"],
    queryFn: () => base44.entities.TrainingVideo.list("order", 200),
  });

  const filtered = useMemo(() => {
    return videos.filter((v) => {
      if (search && !v.title?.toLowerCase().includes(search.toLowerCase())) return false;
      if (tenetFilter !== "all" && v.tenet !== tenetFilter) return false;
      return true;
    });
  }, [videos, search, tenetFilter]);

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <AdisalPageHeader
        breadcrumb="Training Resources"
        title="VIDEO"
        titleAccent="LIBRARY"
        subtitle="Film study, technique breakdowns, and training videos organized by E.P.I.C. tenet."
      />

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap mb-6 p-4 bg-card border border-border rounded-lg">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search videos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <FilterPill active={tenetFilter === "all"} onClick={() => setTenetFilter("all")}>All Videos</FilterPill>
          {TENETS.map((t) => (
            <FilterPill key={t} active={tenetFilter === t} onClick={() => setTenetFilter(t)}>{TENET_COLORS[t].label}</FilterPill>
          ))}
        </div>
      </div>

      <div className="text-xs font-bold tracking-wider uppercase text-muted-foreground mb-3">{filtered.length} VIDEOS</div>

      {isLoading ? (
        <div className="text-center py-20 text-muted-foreground">Loading videos...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Play className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No videos found. Add training videos to the library.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filtered.map((v) => (
            <div key={v.id} className="bg-card border border-border rounded-lg overflow-hidden group cursor-pointer hover:border-primary/40 transition-colors">
              {/* Thumbnail */}
              <div className="relative aspect-video bg-secondary overflow-hidden">
                {v.thumbnail_url ? (
                  <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="w-10 h-10 text-muted-foreground/30" />
                  </div>
                )}
                {/* Badge */}
                {v.tenet && (
                  <div className="absolute top-2 left-2">
                    <TenetBadge tenet={v.tenet} />
                  </div>
                )}
                {/* Duration */}
                {v.duration && (
                  <div className="absolute bottom-2 right-2 bg-foreground/90 text-background text-[10px] font-bold px-1.5 py-0.5 rounded">
                    {v.duration}
                  </div>
                )}
              </div>
              {/* Content */}
              <div className="p-3">
                {v.level && <div className="mb-1.5"><LevelBadge level={v.level} /></div>}
                <h3 className="font-bold text-sm text-foreground line-clamp-2 mb-1">{v.title}</h3>
                {v.author && <p className="text-xs text-muted-foreground">{v.author}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}