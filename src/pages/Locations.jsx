import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Building2 } from "lucide-react";
import LocationCard from "@/components/locations/LocationCard";
import LocationDialog from "@/components/locations/LocationDialog";

const STAFF_ROLES = ["master_admin", "admin", "club_director", "club_admin", "branch_director", "branch_admin", "bookkeeper", "project_manager", "team_manager"];

export default function Locations() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ["locations"],
    queryFn: () => base44.entities.Location.list("name", 100),
  });
  const { data: players = [] } = useQuery({
    queryKey: ["locations-players"],
    queryFn: () => base44.entities.Player.list("-created_date", 500),
  });
  const { data: teams = [] } = useQuery({
    queryKey: ["locations-teams"],
    queryFn: () => base44.entities.Team.list("-created_date", 500),
  });
  const { data: users = [] } = useQuery({
    queryKey: ["locations-users"],
    queryFn: () => base44.entities.User.list("-created_date", 500),
  });

  const countsByLocation = React.useMemo(() => {
    const map = {};
    for (const loc of locations) {
      map[loc.id] = { girls: 0, boys: 0, teams: 0, coaches: 0, staff: 0 };
    }
    for (const p of players) {
      if (!p.location_id || !map[p.location_id]) continue;
      if (p.gender === "Girls") map[p.location_id].girls++;
      else if (p.gender === "Boys") map[p.location_id].boys++;
    }
    for (const t of teams) {
      if (!t.location_id || !map[t.location_id]) continue;
      map[t.location_id].teams++;
    }
    for (const u of users) {
      const branchId = u.branch_id || u.location_id;
      if (!branchId || !map[branchId]) continue;
      if (u.custom_role === "coach") map[branchId].coaches++;
      else if (STAFF_ROLES.includes(u.custom_role)) map[branchId].staff++;
    }
    return map;
  }, [locations, players, teams, users]);

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (loc) => { setEditing(loc); setDialogOpen(true); };
  const handleSaved = () => queryClient.invalidateQueries({ queryKey: ["locations"] });
  const handleDelete = async (loc) => {
    if (!window.confirm(`Delete branch "${loc.name}"? This cannot be undone.`)) return;
    await base44.entities.Location.delete(loc.id);
    queryClient.invalidateQueries({ queryKey: ["locations"] });
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs font-bold tracking-wider uppercase text-primary mb-1.5">Club Nexus</div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />
            Club Branches
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
            Every branch shares the same registration, teams and reporting foundation, with its own leadership and facilities.
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary/90" onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" /> New Branch
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : locations.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No branches yet. Add your first club branch.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map((loc) => (
            <LocationCard
              key={loc.id}
              location={loc}
              counts={countsByLocation[loc.id]}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <LocationDialog open={dialogOpen} onOpenChange={setDialogOpen} location={editing} onSaved={handleSaved} />
    </div>
  );
}