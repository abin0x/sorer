import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { MIGRATION_CHECKLIST, SETUP_CHECKLIST, ONBOARDING_CHECKLIST } from "@/lib/journeyChecklists";

function ChecklistCard({ items, values, onToggle }) {
  return (
    <div className="space-y-3 p-4">
      {items.map((item) => (
        <label key={item.key} className="flex items-center gap-3 text-sm">
          <Checkbox checked={!!values?.[item.key]} onCheckedChange={() => onToggle(item.key)} />
          {item.label}
        </label>
      ))}
    </div>
  );
}

export default function JourneyChecklists() {
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const { data: journeys, isLoading } = useQuery({
    queryKey: ["myJourney", user?.email],
    queryFn: () => base44.entities.ClientJourney.filter({ contact_email: user.email }),
    enabled: !!user?.email,
  });
  const journey = journeys?.[0];

  const toggle = async (field, key) => {
    const next = { ...(journey[field] || {}), [key]: !journey[field]?.[key] };
    await base44.entities.ClientJourney.update(journey.id, { [field]: next });
    queryClient.invalidateQueries({ queryKey: ["myJourney", user.email] });
  };

  if (isLoading) return <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!journey) return <div className="p-10 text-center text-slate-500 dark:text-slate-400">No journey record found yet.</div>;

  return (
    <div className="max-w-3xl mx-auto p-4 lg:p-8">
      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">Go-live checklists</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Migration, setup, and onboarding — step by step.</p>
      <Tabs defaultValue="migration">
        <TabsList>
          <TabsTrigger value="migration">Migration</TabsTrigger>
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
        </TabsList>
        <TabsContent value="migration"><ChecklistCard items={MIGRATION_CHECKLIST} values={journey.checklist_migration} onToggle={(k) => toggle("checklist_migration", k)} /></TabsContent>
        <TabsContent value="setup"><ChecklistCard items={SETUP_CHECKLIST} values={journey.checklist_setup} onToggle={(k) => toggle("checklist_setup", k)} /></TabsContent>
        <TabsContent value="onboarding"><ChecklistCard items={ONBOARDING_CHECKLIST} values={journey.checklist_onboarding} onToggle={(k) => toggle("checklist_onboarding", k)} /></TabsContent>
      </Tabs>
    </div>
  );
}