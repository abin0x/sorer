import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Bell, Mail, Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { TABS, TAB_LABELS } from "./useCOEData";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export default function COEHeader({ data }) {
  const navigate = useNavigate();
  const { filters, setFilters, activeTab, setActiveTab, filteredCount, teamCount, teams } = data;
  const ageOptions = [...new Set(teams.map(t => t.age_group).filter(Boolean))].sort();
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const teamRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (teamRef.current && !teamRef.current.contains(e.target)) setTeamDropdownOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleTeam = (id) => {
    setFilters(f => ({
      ...f,
      teams: f.teams.includes(id) ? f.teams.filter(t => t !== id) : [...f.teams, id]
    }));
  };

  const selectedTeamLabel = filters.teams.length === 0 ? "All Teams" : `${filters.teams.length} Team${filters.teams.length !== 1 ? "s" : ""}`;

  return (
    <div className="bg-white border-b border-gray-200">
      {/* Title + Actions */}
      <div className="px-4 lg:px-8 pt-6 pb-4 max-w-[1400px] mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <div className="text-xs font-bold tracking-wider uppercase text-primary mb-1">Player Development</div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
              CENTER OF <span className="text-primary">EXCELLENCE</span>
            </h1>
            <p className="text-xs text-gray-500 mt-1.5 max-w-2xl">
              Every measurable — skill tests, physical assessments, evaluations, and EPIC teams — in one fillable view.
              Filter by team, gender, or age group and the analytics recompute instantly. Click any player or team to drill in.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button className="bg-[#2ecc71] hover:bg-[#27ae60] text-white text-xs" onClick={() => toast.info("Generating recommendations for players needing attention…")}>
              <Sparkles className="w-3.5 h-3.5" /> Generate All
            </Button>
            <Button variant="outline" className="text-xs" onClick={() => toast.info("Notifications queued for players with missing assessments.")}>
              <Bell className="w-3.5 h-3.5" /> Notify All
            </Button>
            <Button variant="outline" className="text-xs" onClick={() => navigate("/EmailLogs")}>
              <Mail className="w-3.5 h-3.5" /> Email Monitor
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 lg:px-8 pb-3 max-w-[1400px] mx-auto flex items-center gap-3 flex-wrap">
        {/* Multi-select Teams dropdown */}
        <div className="relative" ref={teamRef}>
          <button
            onClick={() => setTeamDropdownOpen(o => !o)}
            className="h-8 px-3 text-xs rounded-md border border-gray-200 bg-white flex items-center gap-1.5 hover:border-gray-300 min-w-[120px]"
          >
            {selectedTeamLabel}
            <ChevronDown className="w-3 h-3 ml-auto text-gray-400" />
          </button>
          {teamDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto min-w-[220px] p-1">
              <button
                onClick={() => { setFilters(f => ({ ...f, teams: [] })); }}
                className={cn("w-full text-left px-2 py-1.5 text-xs rounded hover:bg-gray-50 flex items-center gap-2", filters.teams.length === 0 && "text-primary font-medium")}
              >
                <Check className={cn("w-3 h-3", filters.teams.length === 0 ? "opacity-100" : "opacity-0")} /> All Teams
              </button>
              <div className="border-t border-gray-100 my-0.5" />
              {teams.map(t => (
                <button
                  key={t.id}
                  onClick={() => toggleTeam(t.id)}
                  className={cn("w-full text-left px-2 py-1.5 text-xs rounded hover:bg-gray-50 flex items-center gap-2", filters.teams.includes(t.id) && "text-primary font-medium")}
                >
                  <Check className={cn("w-3 h-3", filters.teams.includes(t.id) ? "opacity-100" : "opacity-0")} /> {t.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <Select value={filters.gender} onValueChange={(v) => setFilters(f => ({ ...f, gender: v }))}>
          <SelectTrigger className="w-32 text-xs h-8"><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Genders</SelectItem>
            <SelectItem value="Boys">Boys</SelectItem>
            <SelectItem value="Girls">Girls</SelectItem>
            <SelectItem value="Boys and Girls">Both</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.age} onValueChange={(v) => setFilters(f => ({ ...f, age: v }))}>
          <SelectTrigger className="w-36 text-xs h-8"><SelectValue placeholder="All Ages" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ages</SelectItem>
            {ageOptions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-gray-400 ml-auto font-semibold uppercase tracking-wide">Showing {filteredCount} Players Across {teamCount} Teams</span>
      </div>

      {/* Tabs */}
      <div className="px-4 lg:px-8 max-w-[1400px] mx-auto">
        <div className="flex gap-6 border-b border-gray-200 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "pb-3 text-sm font-semibold tracking-wide uppercase transition-colors -mb-px border-b-2 whitespace-nowrap",
                activeTab === tab ? "text-primary border-primary" : "text-gray-400 border-transparent hover:text-gray-700"
              )}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}