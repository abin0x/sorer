import React, { useState } from "react";
import { Link } from '@/lib/router-compat';
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { LifeBuoy, Mail, Settings, Shield, FileBarChart, ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SUPPORT_LINKS = [
  { icon: Mail, label: "Email Logs", desc: "Review sent emails and delivery status", url: "/EmailLogs" },
  { icon: Settings, label: "Platform Settings", desc: "Global platform configuration", url: "/PlatformSettings" },
  { icon: Shield, label: "RBAC / Permissions", desc: "Role-based access control matrix", url: "/RBAC" },
  { icon: FileBarChart, label: "Analytics", desc: "Platform-wide analytics dashboard", url: "/Analytics" },
];

export default function SupportTab({ clubs }) {
  const { toast } = useToast();
  const [jumpClub, setJumpClub] = useState("");

  const impersonate = async () => {
    if (!jumpClub) { toast({ title: "Select a club first", variant: "destructive" }); return; }
    try {
      await base44.auth.updateMe({ club_id: jumpClub });
      const club = clubs.find((c) => c.id === jumpClub);
      toast({ title: "Switched club context", description: `Now viewing data as ${club?.name}` });
    } catch (err) {
      toast({ title: "Failed", description: err?.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><LifeBuoy className="w-5 h-5 text-emerald-600" />Support Access</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-500">Jump into any club's data context or access platform-wide admin tools.</p>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
            <h4 className="font-semibold text-sm text-emerald-800">Club Context Switcher</h4>
            <p className="text-xs text-emerald-700">Set your active club to view that tenant's data across the app. Use "SaaS Admin" to switch back to platform-wide view (set club to none).</p>
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
              <div className="flex-1 space-y-1.5">
                <Label>Switch to club</Label>
                <Select value={jumpClub} onValueChange={setJumpClub}>
                  <SelectTrigger><SelectValue placeholder="Select a club…" /></SelectTrigger>
                  <SelectContent>{clubs.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button onClick={impersonate} disabled={!jumpClub} className="bg-emerald-600 hover:bg-emerald-700">
                <ArrowRight className="w-4 h-4 mr-1.5" />Switch Context
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SUPPORT_LINKS.map((l) => (
              <Link key={l.url} to={l.url}>
                <Card className="hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer h-full">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0"><l.icon className="w-4.5 h-4.5 text-slate-600" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{l.label}</p>
                      <p className="text-xs text-slate-400 truncate">{l.desc}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-300" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}