import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function StaffSearchSelect({ value, onValueChange, placeholder = "Select staff member" }) {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const filteredMembers = teamMembers.filter(member => 
    member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedMember = teamMembers.find(m => m.email === value);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Select value={value} onValueChange={onValueChange}>
            <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
              <SelectValue placeholder={placeholder}>
                {selectedMember ? (selectedMember.full_name || selectedMember.email) : placeholder}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <div className="p-2 border-b dark:border-slate-700">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search staff..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 dark:bg-slate-800 dark:border-slate-700"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              {filteredMembers.length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                  No staff members found
                </div>
              ) : (
                filteredMembers.map((member) => (
                  <SelectItem key={member.id} value={member.email}>
                    <div className="flex flex-col">
                      <span className="font-medium">{member.full_name || member.email}</span>
                      {member.full_name && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">{member.email}</span>
                      )}
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}