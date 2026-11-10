import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { MapPin, CheckCircle2, XCircle, Key, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Per-tenant Google Maps API key panel. Each club admin manages their own key
// from the Connections page — stored in ClubCredential, used by the tournament
// scheduler for Distance Matrix travel-time computation.
export default function GoogleMapsPanel({ connected }) {
  const { toast } = useToast();
  const [gmapsKey, setGmapsKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [isConnected, setIsConnected] = useState(connected);

  const save = async () => {
    setSaving(true);
    try {
      await base44.functions.invoke("save-club-integrations", {
        google_maps_api_key: gmapsKey,
      });
      toast({
        title: "Google Maps API key saved",
        description: "Tournament travel times will use your club's key.",
      });
      setGmapsKey("");
      setIsConnected(true);
    } catch (e) {
      toast({
        title: "Save failed",
        description: e?.response?.data?.error || e?.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
            <MapPin className="w-6 h-6 text-rose-600" />
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-lg">Google Maps</h3>
                <p className="text-sm text-slate-500">
                  Powers travel-time-aware tournament scheduling between your
                  facilities.
                </p>
              </div>
              {isConnected ? (
                <Badge className="bg-emerald-100 text-emerald-700 shrink-0">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Key Set
                </Badge>
              ) : (
                <Badge variant="outline" className="shrink-0">
                  <XCircle className="w-3 h-3 mr-1" />
                  Not Set
                </Badge>
              )}
            </div>

            {isConnected && (
              <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                <p>
                  ✓ Your club's Google Maps API key is active. Travel times use
                  the Distance Matrix API.
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Enter a new key below to replace it.
                </p>
              </div>
            )}

            <div className="space-y-3 border border-slate-200 rounded-lg p-4 bg-slate-50/50">
              <div className="flex items-start gap-2">
                <Key className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-500">
                  Get an API key from the{" "}
                  <a
                    href="https://console.cloud.google.com/google/maps-apis/credentials"
                    target="_blank"
                    rel="noreferrer"
                    className="text-rose-600 underline"
                  >
                    Google Cloud Console
                  </a>
                  . Enable the <b>Distance Matrix API</b> for your project.
                  Without a key, the scheduler falls back to LLM-estimated
                  travel times.
                </p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="gmaps-key" className="text-xs">
                  Google Maps API Key
                </Label>
                <Input
                  id="gmaps-key"
                  type="password"
                  placeholder="AIza..."
                  value={gmapsKey}
                  onChange={(e) => setGmapsKey(e.target.value)}
                />
              </div>
              <Button
                onClick={save}
                disabled={saving || !gmapsKey}
                size="sm"
                variant="outline"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                )}
                Save API Key
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}