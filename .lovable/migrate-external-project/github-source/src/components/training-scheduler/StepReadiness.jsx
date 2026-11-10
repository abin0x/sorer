import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { createPageUrl } from "@/utils";
import SeedConfigPanel from "@/components/training-scheduler/SeedConfigPanel";

export default function StepReadiness({ teams, fields, coaches, platforms, clubId, config, setConfig, onNext }) {
  const issues = [];

  // Teams missing critical fields
  const teamsNoFormat = teams.filter((t) => !t.playing_format);
  const teamsNoPlatform = teams.filter((t) => !t.platform_id);
  const teamsNoCoach = teams.filter((t) => !t.coach_id && !(t.coach_ids?.length));
  if (teamsNoFormat.length) issues.push({ count: teamsNoFormat.length, label: "teams without a playing format", fix: createPageUrl("Registration") + "?tab=teams" });
  if (teamsNoPlatform.length) issues.push({ count: teamsNoPlatform.length, label: "teams without a platform", fix: createPageUrl("Registration") + "?tab=teams" });
  if (teamsNoCoach.length) issues.push({ count: teamsNoCoach.length, label: "teams without a coach", fix: createPageUrl("Registration") + "?tab=teams" });

  // Fields missing critical fields
  const fieldsNoFormat = fields.filter((f) => !f.format_supported?.length && !f.format);
  const fieldsClosed = fields.filter((f) => f.status === "closed" || f.status === "maintenance");
  if (fieldsNoFormat.length) issues.push({ count: fieldsNoFormat.length, label: "fields without a supported format", fix: createPageUrl("Facilities") });
  if (fieldsClosed.length) issues.push({ count: fieldsClosed.length, label: "fields closed or in maintenance", fix: createPageUrl("Facilities") });

  // Coaches missing location
  const coachesNoLocation = coaches.filter((c) => !c.location_id);
  if (coachesNoLocation.length) issues.push({ count: coachesNoLocation.length, label: "coaches without a home location", fix: createPageUrl("ClubStaff") });

  const ready = issues.length === 0 && teams.length > 0 && fields.length > 0;

  return (
    <div className="space-y-4">
      <SeedConfigPanel teams={teams} coaches={coaches} clubId={clubId} config={config} setConfig={setConfig} />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {ready ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-amber-600" />}
            Readiness Check
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="Teams" value={teams.length} ok={teams.length > 0} />
            <Stat label="Fields" value={fields.length} ok={fields.length > 0} />
            <Stat label="Coaches" value={coaches.length} ok={coaches.length > 0} />
            <Stat label="Platforms" value={platforms.length} ok={platforms.length > 0} />
          </div>

          {issues.length === 0 ? (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <p className="text-sm font-medium text-emerald-800">All inputs are ready. You can proceed to priority ranking.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Missing or incomplete inputs:</p>
              {issues.map((issue, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                  <Badge className="bg-amber-100 text-amber-700">{issue.count}</Badge>
                  <span className="text-sm text-foreground flex-1">{issue.label}</span>
                  <Link to={issue.fix}>
                    <Button size="sm" variant="outline">Fix <ArrowRight className="w-3 h-3" /></Button>
                  </Link>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button onClick={onNext} disabled={!ready}>Continue to Priority <ArrowRight className="w-4 h-4" /></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, ok }) {
  return (
    <div className={`p-3 rounded-lg border ${ok ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
      <p className="text-2xl font-extrabold text-foreground">{value}</p>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  );
}