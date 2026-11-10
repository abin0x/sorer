import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Shield, Sliders, ArrowRight, ArrowLeft } from "lucide-react";
import { HARD_RULE_LABELS, SOFT_PREF_LABELS } from "@/lib/trainingSchedulerConfig";

export default function StepRules({ config, setConfig, onPrev, onNext }) {
  const hardRules = config.hard_rules || {};
  const softPrefs = config.soft_prefs || {};

  const toggleHard = (key) => {
    setConfig({ ...config, hard_rules: { ...hardRules, [key]: !hardRules[key] } });
  };
  const setSoft = (key, value) => {
    setConfig({ ...config, soft_prefs: { ...softPrefs, [key]: value } });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-600" /> Hard Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground mb-3">These constraints can never be violated. A session that breaks a hard rule will not be placed.</p>
          {Object.entries(HARD_RULE_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-card hover:bg-muted/20">
              <Checkbox checked={hardRules[key] !== false} onCheckedChange={() => toggleHard(key)} />
              <Label className="text-sm font-medium cursor-pointer flex-1" onClick={() => toggleHard(key)}>{label}</Label>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-primary" /> Soft Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground mb-2">Drag each slider to set how strongly the algorithm should favor this preference. 0 = ignore, 100 = maximum weight.</p>
          {Object.entries(SOFT_PREF_LABELS).map(([key, label]) => (
            <div key={key} className="space-y-1">
              <div className="flex justify-between">
                <Label className="text-sm font-medium">{label}</Label>
                <span className="text-xs font-bold text-primary">{Math.round((softPrefs[key] || 0) * 100)}%</span>
              </div>
              <Slider
                value={[Math.round((softPrefs[key] || 0) * 100)]}
                onValueChange={(v) => setSoft(key, v[0] / 100)}
                max={100}
                step={5}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}><ArrowLeft className="w-4 h-4" /> Back</Button>
        <Button onClick={onNext}>Continue to Generate <ArrowRight className="w-4 h-4" /></Button>
      </div>
    </div>
  );
}