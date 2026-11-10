import React from "react";
import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function TenantToolbar({ search, onSearch, status, onStatus, sort, onSort, onNew }) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
      <div className="relative flex-1">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search tenants…" className="pl-9" />
      </div>
      <Select value={status} onValueChange={onStatus}>
        <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="trialing">Trialing</SelectItem>
          <SelectItem value="suspended">Suspended</SelectItem>
          <SelectItem value="archived">Archived</SelectItem>
        </SelectContent>
      </Select>
      <Select value={sort} onValueChange={onSort}>
        <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Sort" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="-created_date">Newest first</SelectItem>
          <SelectItem value="created_date">Oldest first</SelectItem>
          <SelectItem value="name">Name A–Z</SelectItem>
        </SelectContent>
      </Select>
      <Button onClick={onNew} className="bg-emerald-600 hover:bg-emerald-700 shrink-0"><Plus className="w-4 h-4 mr-1.5" />New Tenant</Button>
    </div>
  );
}