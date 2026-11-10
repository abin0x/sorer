import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, Briefcase, CheckCircle2, Clock, ListTodo, AlertCircle } from "lucide-react";

const ROLE_CONFIG = {
  admin: { label: "Admin", color: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-300" },
  director: { label: "Director", color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-300" },
  branch_director: { label: "Branch Director", color: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900 dark:text-purple-300" },
  staff: { label: "Staff", color: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300" }
};

export default function TeamMemberCard({ member, stats, onClick }) {
  const roleConfig = ROLE_CONFIG[member.role] || ROLE_CONFIG.staff;

  return (
    <Card 
      className="hover:shadow-lg transition-all duration-200 cursor-pointer dark:bg-slate-900 dark:border-slate-800"
      onClick={() => onClick(member)}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-lg">
              {member.full_name?.[0]?.toUpperCase() || member.email?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 dark:text-white truncate">
              {member.full_name || 'Unnamed User'}
            </h3>
            <Badge className={`mt-1 ${roleConfig.color} text-xs`}>
              {roleConfig.label}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Contact Info */}
        <div className="space-y-2 text-sm">
          {member.title && (
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Briefcase className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{member.title}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <Mail className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{member.email}</span>
          </div>
          {member.phone && (
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Phone className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{member.phone}</span>
            </div>
          )}
          {member.address && (
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{member.address}</span>
            </div>
          )}
        </div>

        {/* Program Stats as Counters */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="ghost"
              className="h-auto flex-col items-start p-3 hover:bg-slate-50 dark:hover:bg-slate-800"
              onClick={(e) => {
                e.stopPropagation();
                onClick(member);
              }}
            >
              <div className="font-semibold text-lg text-slate-900 dark:text-white">{stats.total}</div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Programs</div>
              <div className="flex gap-1 mt-1 flex-wrap">
                {stats.todo > 0 && (
                  <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {stats.todo} Todo
                  </Badge>
                )}
                {stats.inProgress > 0 && (
                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                    {stats.inProgress} In Progress
                  </Badge>
                )}
                {stats.inReview > 0 && (
                  <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                    {stats.inReview} In Review
                  </Badge>
                )}
                {stats.completed > 0 && (
                  <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                    {stats.completed} Done
                  </Badge>
                )}
              </div>
            </Button>

            <Button
              variant="ghost"
              className="h-auto flex-col items-start p-3 hover:bg-slate-50 dark:hover:bg-slate-800"
              onClick={(e) => {
                e.stopPropagation();
                onClick(member);
              }}
            >
              <div className="font-semibold text-lg text-slate-900 dark:text-white">{stats.tasks.length}</div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Tasks</div>
              <div className="flex gap-1 mt-1 flex-wrap">
                {stats.tasks.filter(t => t.completed).length > 0 && (
                  <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                    {stats.tasks.filter(t => t.completed).length} Done
                  </Badge>
                )}
                {stats.tasks.filter(t => !t.completed).length > 0 && (
                  <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {stats.tasks.filter(t => !t.completed).length} Pending
                  </Badge>
                )}
              </div>
            </Button>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center p-2 bg-slate-50 dark:bg-slate-800 rounded">
            <div className="font-bold text-slate-900 dark:text-white">{stats.notes.length}</div>
            <div className="text-slate-600 dark:text-slate-400">Notes</div>
          </div>
          <div className="text-center p-2 bg-slate-50 dark:bg-slate-800 rounded">
            <div className="font-bold text-slate-900 dark:text-white">{stats.expenses.length}</div>
            <div className="text-slate-600 dark:text-slate-400">Expenses</div>
          </div>
          <div className="text-center p-2 bg-slate-50 dark:bg-slate-800 rounded">
            <div className="font-bold text-slate-900 dark:text-white">${stats.totalStaffPay.toLocaleString()}</div>
            <div className="text-slate-600 dark:text-slate-400">Pay</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}