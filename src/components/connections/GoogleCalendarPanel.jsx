import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Link2,
  Unlink,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const GCAL_CONNECTOR_ID = "6a5e5fd10345f132609f7f11";

// Per-tenant Google Calendar panel (APP_USER mode). Each club admin connects
// their own Google Calendar from the Connections page. Tournament games and
// training sessions sync to the connected admin's primary calendar.
export default function GoogleCalendarPanel({ status, onRefresh }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const connected = status?.connected;

  const connect = async () => {
    setBusy(true);
    try {
      const url = await base44.connectors.connectAppUser(GCAL_CONNECTOR_ID);
      const popup = window.open(url, "_blank");
      const timer = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          onRefresh();
        }
      }, 500);
    } catch (e) {
      toast({
        title: "Google Calendar connect failed",
        description: e?.message,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (
      !window.confirm(
        "Disconnect Google Calendar? Tournament and training events will no longer sync to your calendar."
      )
    )
      return;
    setBusy(true);
    try {
      await base44.connectors.disconnectAppUser(GCAL_CONNECTOR_ID);
      toast({ title: "Google Calendar disconnected" });
      onRefresh();
    } catch (e) {
      toast({
        title: "Disconnect failed",
        description: e?.message,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-lg">Google Calendar</h3>
                <p className="text-sm text-slate-500">
                  Sync tournament games and training sessions to your own Google
                  Calendar.
                </p>
              </div>
              {connected ? (
                <Badge className="bg-emerald-100 text-emerald-700 shrink-0">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="shrink-0">
                  <XCircle className="w-3 h-3 mr-1" />
                  Not Connected
                </Badge>
              )}
            </div>

            {connected && (
              <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 space-y-0.5">
                {status?.email && (
                  <p>
                    Connected as <b>{status.email}</b>
                  </p>
                )}
                <p className="text-xs text-slate-400">
                  Events sync to your primary calendar automatically.
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {!connected && (
                <Button
                  onClick={connect}
                  disabled={busy}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {busy ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <Link2 className="w-4 h-4 mr-1.5" />
                  )}
                  Connect Google Calendar
                </Button>
              )}
              {connected && (
                <Button
                  onClick={disconnect}
                  disabled={busy}
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Unlink className="w-4 h-4 mr-1.5" />
                  Disconnect
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}