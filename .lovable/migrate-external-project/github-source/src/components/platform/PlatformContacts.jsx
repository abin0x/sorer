import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Users, Search } from "lucide-react";
import ContactActions from "@/components/shared/ContactActions";
import { createPageUrl } from "@/utils";

export default function PlatformContacts({ players, guardians, teams }) {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const guardianMap = useMemo(() => new Map(guardians.map(g => [g.id, g])), [guardians]);

  const filtered = useMemo(() => {
    if (!search) return players;
    const q = search.toLowerCase();
    return players.filter(p =>
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
      p.team_name?.toLowerCase().includes(q) ||
      p.position?.toLowerCase().includes(q)
    );
  }, [players, search]);

  const getGuardians = (player) => {
    const ids = player.guardian_ids?.length > 0 ? player.guardian_ids : (player.guardian_id ? [player.guardian_id] : []);
    return ids.map(id => guardianMap.get(id)).filter(Boolean);
  };

  return (
    <Card className="border-border/60">
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Player Contacts</CardTitle>
          <div className="relative max-w-sm flex-1 min-w-48">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search players, teams, positions..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No players found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground uppercase">
                  <th className="text-left py-2 px-2">Player</th>
                  <th className="text-left py-2 px-2">Team</th>
                  <th className="text-center py-2 px-2">Pos</th>
                  <th className="text-left py-2 px-2">Guardian(s)</th>
                  <th className="text-left py-2 px-2">Contact</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const pguardians = getGuardians(p);
                  return (
                    <tr key={p.id} className="border-b border-border/40 hover:bg-muted/30">
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">{p.first_name?.[0]}{p.last_name?.[0]}</div>
                          <div>
                            <p className="font-medium">{p.first_name} {p.last_name}</p>
                            {p.jersey_number && <p className="text-[10px] text-muted-foreground">#{p.jersey_number}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-muted-foreground">{p.team_name || "—"}</td>
                      <td className="py-2 px-2 text-center text-muted-foreground">{p.position || "—"}</td>
                      <td className="py-2 px-2">
                        <div className="space-y-0.5">
                          {pguardians.length === 0 ? <span className="text-xs text-muted-foreground">No guardian</span> : pguardians.map(g => (
                            <p key={g.id} className="text-xs font-medium">{g.first_name} {g.last_name} <span className="text-[10px] text-muted-foreground capitalize">({g.relationship})</span></p>
                          ))}
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        <div className="space-y-1">
                          {pguardians.map(g => (
                            <div key={g.id} className="flex items-center gap-1.5">
                              <span className="text-xs font-medium whitespace-nowrap">{g.first_name} {g.last_name}</span>
                              <ContactActions email={g.email} phone={g.phone} onMessage={() => navigate(`${createPageUrl("CommunicationPortal")}?recipient_email=${encodeURIComponent(g.email || "")}&recipient_name=${encodeURIComponent(`${g.first_name || ""} ${g.last_name || ""}`.trim())}`)} />
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}