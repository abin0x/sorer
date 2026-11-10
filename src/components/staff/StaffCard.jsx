import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Pencil, Phone, MapPin } from "lucide-react";

const roleBadgeMap = {
  master_admin: { label: "Master Admin", color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
  admin: { label: "Admin", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
  club_director: { label: "Club Director", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  club_admin: { label: "Club Admin", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  branch_director: { label: "Branch Director", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" },
  branch_admin: { label: "Branch Admin", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" },
  bookkeeper: { label: "Bookkeeper", color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
  project_manager: { label: "Project Manager", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300" },
  coach: { label: "Coach", color: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300" },
};

export default function StaffCard({ user, onEdit, onContact }) {
  const role = roleBadgeMap[user.custom_role] || { label: user.custom_role || "Staff", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" };
  const initials = (user.full_name || "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <Card className="dark:bg-slate-900 dark:border-slate-800 hover:shadow-lg transition-shadow group">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center text-white font-bold text-lg shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 dark:text-white truncate">{user.full_name || "Unnamed"}</h3>
            <Badge className={`text-xs mt-1 ${role.color}`}>{role.label}</Badge>
          </div>
        </div>

        {user.title && (
          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">{user.title}</p>
        )}

        <div className="space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
          {user.branch && (
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{user.branch}</span>
            </div>
          )}
          {user.email && (
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{user.email}</span>
            </div>
          )}
          {user.phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{user.phone}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button size="sm" variant="outline" className="flex-1 dark:border-slate-700" onClick={() => onEdit(user)}>
            <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit
          </Button>
          <Button size="sm" variant="outline" className="flex-1 dark:border-slate-700" onClick={() => onContact(user)}>
            <Mail className="w-3.5 h-3.5 mr-1.5" /> Contact
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}