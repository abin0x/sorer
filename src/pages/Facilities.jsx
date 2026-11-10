import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MapPin, Building2, Link2, ArrowRight } from "lucide-react";
import { createPageUrl } from "@/utils";
import { useSearchParams } from '@/lib/router-compat';
import FacilityManager from "@/components/facilities/FacilityManager";
import FacilityAvailabilityCard from "@/components/facilities/FacilityAvailabilityCard";
import FacilityLinkDialog from "@/components/facilities/FacilityLinkDialog";
import WeeklyScheduleTab from "@/components/facilities/WeeklyScheduleTab";
import BookingsTab from "@/components/facilities/BookingsTab";

export default function Facilities() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get("tab") || "availability");

  useEffect(() => {
    const urlTab = searchParams.get("tab");
    if (urlTab) setTab(urlTab);
  }, [searchParams]);
  const [linkDialog, setLinkDialog] = useState({ open: false, facility: null });

  const { data: facilities = [], isLoading } = useQuery({
    queryKey: ["facilities-manage"],
    queryFn: () => base44.entities.Facility.list("name", 200),
  });
  const { data: programs = [] } = useQuery({
    queryKey: ["programs-for-facilities"],
    queryFn: () => base44.entities.Program.list("-created_date", 300),
  });
  const { data: events = [] } = useQuery({
    queryKey: ["events-for-facilities"],
    queryFn: () => base44.entities.CalendarEvent.list("start_datetime", 300),
  });
  const { data: locations = [] } = useQuery({
    queryKey: ["locations-for-facilities"],
    queryFn: () => base44.entities.Location.list("name", 100),
  });

  const branchFilter = useState("all")[0];
  const [branchFilterVal, setBranchFilterVal] = useState("all");

  const filteredFacilities = useMemo(() => {
    if (branchFilterVal === "all") return facilities;
    return facilities.filter((f) => f.location_id === branchFilterVal);
  }, [facilities, branchFilterVal]);

  const unlinkedPrograms = programs.filter((p) => !p.facility_id);

  return (
    <div className="min-h-screen bg-white p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <div className="text-xs font-bold tracking-wider uppercase text-primary mb-1">Club Nexus · Facilities</div>
          <h1 className="text-2xl font-extrabold text-foreground">Facilities & Site Availability</h1>
          <p className="text-sm text-muted-foreground mt-1">Track facility capacity, surface types, and space utilization across all branches.</p>
        </div>

        <div className="flex items-center gap-2 border-b border-border">
          <button onClick={() => setTab("availability")} className={`px-4 py-2 text-sm font-semibold transition-colors ${tab === "availability" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
            Availability & Utilization
          </button>
          <button onClick={() => setTab("manage")} className={`px-4 py-2 text-sm font-semibold transition-colors ${tab === "manage" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
            Manage Facilities
          </button>
          <button onClick={() => setTab("schedule")} className={`px-4 py-2 text-sm font-semibold transition-colors ${tab === "schedule" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
            Weekly Schedule
          </button>
          <button onClick={() => setTab("bookings")} className={`px-4 py-2 text-sm font-semibold transition-colors ${tab === "bookings" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
            Field Bookings
          </button>
        </div>

        {tab === "availability" && (
          <>
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={branchFilterVal} onValueChange={setBranchFilterVal}>
                <SelectTrigger className="w-48"><SelectValue placeholder="All branches" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {unlinkedPrograms.length > 0 && (
                <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                  <Link2 className="w-3 h-3 mr-1" />{unlinkedPrograms.length} programs unlinked
                </Badge>
              )}
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : filteredFacilities.length === 0 ? (
              <Card className="border-border rounded-xl"><CardContent className="py-12 text-center">
                <MapPin className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No facilities found. Add some in the Manage tab.</p>
              </CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFacilities.map((f) => (
                  <FacilityAvailabilityCard key={f.id} facility={f} events={events} programs={programs} />
                ))}
              </div>
            )}

            {/* Unlinked programs — link them to facilities */}
            {unlinkedPrograms.length > 0 && (
              <Card className="border-amber-200 rounded-xl">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Link2 className="w-4 h-4 text-amber-600" />
                    <p className="text-sm font-bold text-foreground">Link Programs to Facilities</p>
                    <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">{unlinkedPrograms.length} unlinked</Badge>
                  </div>
                  <div className="divide-y divide-border max-h-64 overflow-y-auto">
                    {unlinkedPrograms.slice(0, 20).map((p) => (
                      <div key={p.id} className="flex items-center gap-3 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{p.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {p.location_name || "No branch"} · {p.field_location || "No field location"}
                          </p>
                        </div>
                        <Button size="sm" variant="outline" className="shrink-0 text-xs" onClick={() => setLinkDialog({ open: true, facility: null, program: p })}>
                          <Link2 className="w-3 h-3 mr-1" /> Assign
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {tab === "manage" && <FacilityManager />}
        {tab === "schedule" && <WeeklyScheduleTab />}
        {tab === "bookings" && <BookingsTab />}
      </div>

      <FacilityLinkDialog
        open={linkDialog.open}
        onOpenChange={(v) => setLinkDialog({ open: v, facility: null, program: linkDialog.program })}
        program={linkDialog.program}
        facilities={facilities}
      />
    </div>
  );
}