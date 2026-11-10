import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Rocket, Loader2, CheckCircle2, AlertCircle, Calendar } from "lucide-react";
import { minToLabel } from "@/lib/trainingSchedulerConfig";

export default function StepPublish({ activeScenario, onPrev, onComplete }) {
  const [notify, setNotify] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const config = activeScenario?.config || {};
  const weeks = config.weeks || 12;
  const sessionCount = activeScenario?.sessions?.length || 0;
  const totalBookings = sessionCount * weeks;

  const handlePublish = async () => {
    setPublishing(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("publish-training-schedule", {
        scenario_id: activeScenario.id,
        notify,
      });
      setResult(res.data);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message);
    } finally {
      setPublishing(false);
    }
  };

  if (result) {
    return (
      <Card className="border-emerald-200">
        <CardContent className="p-6 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
          <h3 className="text-lg font-bold">Schedule Published!</h3>
          <p className="text-sm text-muted-foreground">
            {result.bookings_created} bookings created across {result.weeks} weeks.
            All sessions are now live on the field board.
          </p>
          <Button onClick={onComplete}>Done</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary" /> Publish Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
            <p className="text-sm font-semibold text-amber-800 mb-1">Ready to publish?</p>
            <p className="text-sm text-amber-700">
              This will create <strong>{totalBookings}</strong> confirmed bookings ({sessionCount} sessions × {weeks} weeks) on the field board.
              This action cannot be undone — existing bookings with the same identity key will be skipped.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-primary" />
                <p className="text-xs font-bold uppercase text-muted-foreground">Season Start</p>
              </div>
              <p className="text-sm font-medium">{config.season_start || "Not set"}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-primary" />
                <p className="text-xs font-bold uppercase text-muted-foreground">Weeks</p>
              </div>
              <p className="text-sm font-medium">{weeks} weeks</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
            <Checkbox checked={notify} onCheckedChange={setNotify} id="notify" />
            <Label htmlFor="notify" className="text-sm font-medium cursor-pointer flex-1">
              Send notifications to coaches and club admins
            </Label>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <Button onClick={handlePublish} disabled={publishing} className="w-full gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
            {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
            {publishing ? "Publishing..." : `Publish ${totalBookings} Bookings`}
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}><ArrowLeft className="w-4 h-4" /> Back</Button>
      </div>
    </div>
  );
}