import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import TenantStatsRow from "@/components/saas/tenants/TenantStatsRow";
import TenantToolbar from "@/components/saas/tenants/TenantToolbar";
import TenantRow from "@/components/saas/tenants/TenantRow";
import TenantEditor from "@/components/saas/tenants/TenantEditor";

export default function TenantsTab({ clubs, plans, loading, onReload }) {
  const { toast } = useToast();
  const [locations, setLocations] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("-created_date");
  const [selectedId, setSelectedId] = useState(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [qbBusy, setQbBusy] = useState(null);

  useEffect(() => {
    base44.entities.Location.list("-created_date", 1000).then(setLocations).catch(() => setLocations([]));
  }, [clubs.length]);

  const branchCountFor = (clubId) => locations.filter((l) => l.club_id === clubId).length;

  const filtered = useMemo(() => {
    let list = [...clubs];
    if (status === "all") list = list.filter((c) => c.status !== "archived");
    else list = list.filter((c) => c.status === status);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) => c.name?.toLowerCase().includes(q) || c.slug?.toLowerCase().includes(q));
    }
    if (sort === "name") list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    else if (sort === "created_date") list.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    else list.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    return list;
  }, [clubs, search, status, sort]);

  const selectedClub = creatingNew ? null : clubs.find((c) => c.id === selectedId) || filtered[0] || null;
  const showEditor = creatingNew || !!selectedClub;

  const selectRow = (id) => { setCreatingNew(false); setSelectedId(id); };
  const startNew = () => { setCreatingNew(true); setSelectedId(null); };

  const handleSave = async (form, isNew) => {
    setSaving(true);
    try {
      const plan = plans.find((p) => p.tier === form.plan_tier);

      // Derive brand color tokens server-side (tints, shades, on-color, ring)
      let derivedBrandColors = form.derived_brand_colors || {};
      if (form.primary_color) {
        try {
          const res = await base44.functions.invoke('derive-brand-colors', {
            primary_color: form.primary_color,
            secondary_color: form.secondary_color,
          });
          if (res?.data?.primary) {
            derivedBrandColors = {
              primary: res.data.primary,
              secondary: res.data.secondary,
            };
          }
        } catch (err) {
          console.warn('Brand color derivation failed:', err);
        }
      }

      const payload = {
        ...form,
        derived_brand_colors: derivedBrandColors,
        max_players: plan?.max_players ?? form.max_players ?? 50,
        max_branches: plan?.max_branches ?? form.max_branches ?? 1,
        max_teams: plan?.max_teams ?? form.max_teams ?? 5,
        is_active: form.status !== "archived" && form.status !== "suspended",
      };
      delete payload.id;
      if (isNew) {
        const created = await base44.entities.Club.create(payload);
        toast({ title: "Tenant created", description: form.name });
        // Migration requests are submitted by the club admin, not tenant provisioning.
        setCreatingNew(false);
        setSelectedId(created.id);
      } else {
        await base44.entities.Club.update(selectedClub.id, payload);
        toast({ title: `${form.name} updated` });
      }
      onReload();
    } catch (err) {
      toast({ title: "Save failed", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (club) => {
    try {
      await base44.entities.Club.update(club.id, { status: "archived", is_active: false });
      toast({ title: `${club.name} archived` });
      onReload();
    } catch (err) {
      toast({ title: "Archive failed", description: err?.message, variant: "destructive" });
    }
  };

  const handleUnarchive = async (club) => {
    try {
      await base44.entities.Club.update(club.id, { status: "active", is_active: true });
      toast({ title: `${club.name} unarchived` });
      onReload();
    } catch (err) {
      toast({ title: "Unarchive failed", description: err?.message, variant: "destructive" });
    }
  };

  const handleDelete = async (club) => {
    try {
      const res = await base44.functions.invoke("delete-club", { clubId: club.id });
      if (res.data?.errors?.length) {
        toast({ title: `${club.name} deleted with warnings`, description: `${res.data.errors.length} cleanup step(s) had issues. Users and roles were cleaned up.`, variant: "destructive" });
      } else {
        toast({ title: `${club.name} deleted`, description: "All users, roles, and data cleaned up." });
      }
      setSelectedId(null);
      onReload();
    } catch (err) {
      toast({ title: "Delete failed", description: err?.response?.data?.error || err?.message, variant: "destructive" });
    }
  };

  const connectQB = async (clubId) => {
    setQbBusy(clubId);
    try {
      const res = await base44.functions.invoke("quickbooks-oauth-initiate", {});
      const authUrl = res.data?.authUrl;
      if (!authUrl) throw new Error("No auth URL returned");
      const popup = window.open(authUrl, "_blank", "width=600,height=700");
      const timer = setInterval(() => { if (!popup || popup.closed) { clearInterval(timer); onReload(); } }, 800);
    } catch (err) {
      toast({ title: "QB connect failed", description: err?.message, variant: "destructive" });
    } finally { setQbBusy(null); }
  };

  return (
    <div className="space-y-6">
      <TenantStatsRow clubs={clubs} branchCount={locations.length} />

      <Card>
        <CardContent className="p-4 space-y-4">
          <TenantToolbar search={search} onSearch={setSearch} status={status} onStatus={setStatus} sort={sort} onSort={setSort} onNew={startNew} />

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
          ) : (
            <div className="grid lg:grid-cols-[minmax(0,320px)_1fr] gap-4">
              <div className="space-y-1.5 max-h-[640px] overflow-y-auto pr-1">
                {filtered.length === 0 ? (
                  <div className="text-center py-10 text-sm text-slate-400">
                    <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    {search ? `No tenants match "${search}".` : "No tenants yet. Create the first club →"}
                  </div>
                ) : (
                  filtered.map((c) => (
                    <TenantRow key={c.id} club={c} branchCount={branchCountFor(c.id)} active={!creatingNew && c.id === selectedClub?.id} onClick={() => selectRow(c.id)} />
                  ))
                )}
              </div>

              <div className="border-l border-slate-100 pl-4 lg:pl-6">
                {showEditor ? (
                  <TenantEditor
                    club={selectedClub}
                    clubs={clubs}
                    plans={plans}
                    saving={saving}
                    onSave={handleSave}
                    onArchive={handleArchive}
                    onUnarchive={handleUnarchive}
                    onDelete={handleDelete}
                    onConnectQB={connectQB}
                    qbBusy={qbBusy === selectedClub?.id}
                  />
                ) : (
                  <div className="text-center py-16 text-sm text-slate-400">Select a tenant to view details.</div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}