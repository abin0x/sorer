import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter } from "lucide-react";
import MultiBranchSelect from "../shared/MultiBranchSelect";

const SEASONS = ["Summer", "Fall", "Winter 1", "Winter 2", "Spring"];
const BRANCHES = [
  "Dearborn", "Downriver", "Genesee", "Girls Academy", "Huron Valley",
  "Jackson", "Lansing", "Marshall", "MLS Next", "Northville", "Novi/CW3",
  "Pre GA", "Pre MLS Next", "United", "West Bloomfield"
];
const GENDER_OPTIONS = ["Boys", "Girls", "Boys and Girls"];

export default function FilterBar({
  searchTerm,
  onSearchChange,
  selectedAssignee,
  onAssigneeChange,
  selectedPriority,
  onPriorityChange,
  selectedSeason,
  onSeasonChange,
  branchFilters,
  onBranchFiltersChange,
  selectedGender,
  onGenderChange,
  teamMembers = []
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search programs..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 dark:bg-slate-800 dark:border-slate-700"
        />
      </div>

      <Select value={selectedAssignee} onValueChange={onAssigneeChange}>
        <SelectTrigger className="w-[160px] dark:bg-slate-800 dark:border-slate-700">
          <SelectValue placeholder="Program Lead" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Leads</SelectItem>
          {teamMembers.map((member) => (
            <SelectItem key={member.email} value={member.email}>
              {member.full_name || member.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedPriority} onValueChange={onPriorityChange}>
        <SelectTrigger className="w-[140px] dark:bg-slate-800 dark:border-slate-700">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priority</SelectItem>
          <SelectItem value="low">Low</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="high">High</SelectItem>
        </SelectContent>
      </Select>

      <Select value={selectedSeason} onValueChange={onSeasonChange}>
        <SelectTrigger className="w-[140px] dark:bg-slate-800 dark:border-slate-700">
          <SelectValue placeholder="Season" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Seasons</SelectItem>
          {SEASONS.map((season) => (
            <SelectItem key={season} value={season}>{season}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="w-[200px]">
        <MultiBranchSelect
          value={branchFilters}
          onValueChange={onBranchFiltersChange}
          placeholder="All Branches"
        />
      </div>

      <Select value={selectedGender} onValueChange={onGenderChange}>
        <SelectTrigger className="w-[140px] dark:bg-slate-800 dark:border-slate-700">
          <SelectValue placeholder="Gender" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Gender</SelectItem>
          {GENDER_OPTIONS.map((gender) => (
            <SelectItem key={gender} value={gender}>{gender}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}