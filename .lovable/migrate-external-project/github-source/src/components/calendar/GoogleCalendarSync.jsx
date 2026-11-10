import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, CheckCircle2, Link2, Unlink, Calendar } from "lucide-react";
import { toast } from "sonner";

const CONNECTOR_ID = "6a5e5fd10345f132609f7f11";

export default function GoogleCalendarSync({ manageableTeams, canCreate }) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [authed, setAuthed] = useState(false);

  // Rule 2: reusable fetch — checks connection status by attempting to list events
  const checkConnection = async () => {
    try {
      await base44.functions.invoke("syncTeamEventsToGoogle", { action: "list" });
      setConnected(true);
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  // Rule 1: check auth first, then check connection
  useEffect(() => {
    base44.auth.isAuthenticated().then(async (isAuth) => {
      setAuthed(isAuth);
      if (isAuth) await checkConnection();
      else setLoading(false);
    });
  }, []);

  // Rule 3: open OAuth popup, poll for close, then re-check
  const handleConnect = async () => {
    try {
      const url = await base44.connectors.connectAppUser(CONNECTOR_ID);
      const popup = window.open(url, "_blank");
      const timer = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          checkConnection();
        }
      }, 500);
    } catch (e) {
      toast.error("Could not start Google Calendar connection.");
    }
  };

  const handleDisconnect = async () => {
    try {
      await base44.connectors.disconnectAppUser(CONNECTOR_ID);
      setConnected(false);
      setSyncResult(null);
      toast.success("Google Calendar disconnected.");
    } catch (e) {
      toast.error("Could not disconnect.");
    }
  };

  const handleSync = async () => {
    if (manageableTeams.length === 0) { toast.error("No teams available to sync."); return; }
    setSyncing(true);
    setSyncResult(null);
    try {
      const teamIds = new Set(manageableTeams.map((t) => t.id));
      const allEvents = await base44.entities.CalendarEvent.list("start_datetime", 300);
      const myEvents = allEvents.filter((e) => (e.team_ids || []).some((id) => teamIds.has(id)));
      if (myEvents.length === 0) { toast.info("No team events to sync."); setSyncing(false); return; }

      const res = await base44.functions.invoke("syncTeamEventsToGoogle", { action: "sync", events: myEvents });
      setSyncResult(res.data);
      if (res.data?.success) {
        toast.success(`Synced ${res.data.created + res.data.updated} event(s) to Google Calendar.`);
      } else {
        toast.error("Sync failed.");
      }
    } catch (e) {
      toast.error("Could not sync to Google Calendar.");
    } finally { setSyncing(false); }
  };

  if (!canCreate) return null;

  if (loading) {
    return <Card className="border-border rounded-xl"><CardContent className="py-4 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /><span className="text-sm text-muted-foreground">Checking Google Calendar…</span></CardContent></Card>;
  }

  if (!authed) {
    return (
      <Card className="border-border rounded-xl">
        <CardContent className="py-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /><p className="text-sm text-muted-foreground">Sign in to connect Google Calendar.</p></div>
          <Button size="sm" variant="outline" onClick={() => base44.auth.redirectToLogin()}>Sign In</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border rounded-xl">
      <CardContent className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <div>
              <p className="text-sm font-bold text-foreground">Google Calendar Sync</p>
              <p className="text-xs text-muted-foreground">Sync your team events to your personal Google Calendar.</p>
            </div>
          </div>
          {connected ? (
            <div className="flex items-center gap-2">
              <Badge className="text-[10px] bg-primary/15 text-primary"><CheckCircle2 className="w-3 h-3 mr-1" />Connected</Badge>
              <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing}>
                {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
                Sync Now
              </Button>
              <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={handleDisconnect}>
                <Unlink className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-white" onClick={handleConnect}>
              <Link2 className="w-3.5 h-3.5 mr-1" /> Connect Google Calendar
            </Button>
          )}
        </div>
        {syncResult && (
          <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground flex flex-wrap gap-3">
            <span>Created: <strong className="text-foreground">{syncResult.created}</strong></span>
            <span>Updated: <strong className="text-foreground">{syncResult.updated}</strong></span>
            {syncResult.failed > 0 && <span className="text-red-500">Failed: <strong>{syncResult.failed}</strong></span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}