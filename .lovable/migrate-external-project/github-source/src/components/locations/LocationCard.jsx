import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Pencil, GitBranch, UserCog, Shield, Users, Trophy, Trash2, UserCheck, Briefcase } from "lucide-react";

const TYPE_COLORS = {
  nexus: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900 dark:text-amber-300",
  branch: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900 dark:text-emerald-300",
  regional: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-300",
  training: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900 dark:text-purple-300",
};

export default function LocationCard({ location, counts, onEdit, onDelete }) {
  const girls = counts?.girls || 0;
  const boys = counts?.boys || 0;
  const teams = counts?.teams || 0;
  const coaches = counts?.coaches || 0;
  const staff = counts?.staff || 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">{location.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{location.role_description || "—"}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(location)}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => onDelete(location)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        <Badge className={`text-xs ${TYPE_COLORS[location.branch_type] || TYPE_COLORS.branch}`}>
          {location.branch_type}
        </Badge>

        {/* Player & Team Counts */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="flex flex-col items-center justify-center rounded-lg bg-pink-50 dark:bg-pink-900/30 py-2 px-1">
            <span className="text-lg font-bold text-pink-600 dark:text-pink-300 leading-none">{girls}</span>
            <span className="text-[10px] text-pink-500 dark:text-pink-400 font-medium mt-1 flex items-center gap-0.5">
              <Users className="w-2.5 h-2.5" /> Girls
            </span>
          </div>
          <div className="flex flex-col items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30 py-2 px-1">
            <span className="text-lg font-bold text-blue-600 dark:text-blue-300 leading-none">{boys}</span>
            <span className="text-[10px] text-blue-500 dark:text-blue-400 font-medium mt-1 flex items-center gap-0.5">
              <Users className="w-2.5 h-2.5" /> Boys
            </span>
          </div>
          <div className="flex flex-col items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/30 py-2 px-1">
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-300 leading-none">{teams}</span>
            <span className="text-[10px] text-emerald-500 dark:text-emerald-400 font-medium mt-1 flex items-center gap-0.5">
              <Trophy className="w-2.5 h-2.5" /> Teams
            </span>
          </div>
        </div>

        {/* Coach & Staff Counts */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col items-center justify-center rounded-lg bg-teal-50 dark:bg-teal-900/30 py-2 px-1">
            <span className="text-lg font-bold text-teal-600 dark:text-teal-300 leading-none">{coaches}</span>
            <span className="text-[10px] text-teal-500 dark:text-teal-400 font-medium mt-1 flex items-center gap-0.5">
              <UserCheck className="w-2.5 h-2.5" /> Coaches
            </span>
          </div>
          <div className="flex flex-col items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/30 py-2 px-1">
            <span className="text-lg font-bold text-indigo-600 dark:text-indigo-300 leading-none">{staff}</span>
            <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium mt-1 flex items-center gap-0.5">
              <Briefcase className="w-2.5 h-2.5" /> Staff
            </span>
          </div>
        </div>

        {(location.city || location.address) && (
          <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            {[location.address, location.city, location.state, location.zip_code].filter(Boolean).join(", ")}
          </p>
        )}
        {location.phone && (
          <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1">
            <Phone className="w-3.5 h-3.5 shrink-0" /> {location.phone}
          </p>
        )}
        {/* Branch Leadership */}
        {(location.branch_director_name || location.branch_director_email) && (
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-100 dark:border-slate-800">
            <Shield className="w-3.5 h-3.5 text-purple-500 shrink-0" />
            <span className="font-medium">Director:</span>
            <span className="truncate">{location.branch_director_name || location.branch_director_email}</span>
          </div>
        )}
        {(location.branch_admin_name || location.branch_admin_email) && (
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <UserCog className="w-3.5 h-3.5 text-violet-500 shrink-0" />
            <span className="font-medium">Admin:</span>
            <span className="truncate">{location.branch_admin_name || location.branch_admin_email}</span>
          </div>
        )}
        {location.facilities?.length > 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-500 truncate">
            Facilities: {location.facilities.join(", ")}
          </p>
        )}
        {!location.is_active && <Badge variant="outline" className="text-xs">Inactive</Badge>}
      </CardContent>
    </Card>
  );
}