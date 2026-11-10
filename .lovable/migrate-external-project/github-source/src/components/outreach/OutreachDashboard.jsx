import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Mail, Eye, MousePointerClick, Reply, Calendar, AlertTriangle, Flame, Users } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

export default function OutreachDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('outreach-analytics', { action: 'dashboard' });
      setData(res.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="p-8 text-center text-slate-400">Loading dashboard…</div>;
  if (!data) return <div className="p-8 text-center text-slate-400">No data yet. Add prospects and start sending.</div>;

  const { kpis, funnel, sendsByDay, hotLeads, recentReplies, needsAttention } = data;
  const maxFunnel = Math.max(...funnel.map(f => f.count), 1);

  const kpiCards = [
    { label: 'Total Prospects', value: kpis.totalProspects, delta: kpis.prospectsDelta > 0 ? `+${kpis.prospectsDelta}` : '', icon: Users },
    { label: 'Emails Sent (30d)', value: kpis.emailsSent, icon: Mail },
    { label: 'Open Rate', value: `${kpis.openRate.toFixed(1)}%`, icon: Eye },
    { label: 'Click Rate', value: `${kpis.clickRate.toFixed(1)}%`, icon: MousePointerClick },
    { label: 'Reply Rate', value: `${kpis.replyRate.toFixed(1)}%`, icon: Reply },
    { label: 'Demos Booked', value: kpis.demosBooked, icon: Calendar },
    { label: 'Bounce Rate', value: `${kpis.bounceRate.toFixed(1)}%`, icon: TrendingDown, warn: kpis.bounceRate >= 2 },
    { label: 'Complaint Rate', value: `${kpis.complaintRate.toFixed(2)}%`, icon: AlertTriangle, warn: kpis.complaintRate >= 0.1 },
  ];

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpiCards.map(kpi => (
          <Card key={kpi.label} className={kpi.warn ? 'border-red-300' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-slate-500 font-medium">{kpi.label}</p>
                <kpi.icon className={`w-4 h-4 ${kpi.warn ? 'text-red-500' : 'text-slate-400'}`} />
              </div>
              <p className="text-2xl font-bold text-slate-900">{kpi.value}</p>
              {kpi.delta && <p className="text-xs text-emerald-600 font-medium mt-1">{kpi.delta} vs last 30d</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Engagement Funnel</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {funnel.map(stage => (
              <div key={stage.stage}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">{stage.stage}</span>
                  <span className="font-bold text-slate-900">{stage.count}</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full transition-all" style={{ width: `${(stage.count / maxFunnel) * 100}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Sends by Day (30d)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={sendsByDay}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <Line type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Lists row */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><Flame className="w-4 h-4 text-orange-500" /> Hot Leads</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {hotLeads?.length === 0 && <p className="text-sm text-slate-400">No hot leads yet.</p>}
            {hotLeads?.map(p => (
              <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{p.first_name} {p.last_name}</p>
                  <p className="text-xs text-slate-500 truncate">{p.club_name}</p>
                </div>
                <Button size="sm" variant="outline" className="shrink-0 ml-2">Book</Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Reply className="w-4 h-4 text-blue-500" /> Recent Replies</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {recentReplies?.length === 0 && <p className="text-sm text-slate-400">No replies yet.</p>}
            {recentReplies?.map(p => (
              <div key={p.id} className="p-2 rounded-lg bg-slate-50">
                <p className="text-sm font-medium text-slate-900">{p.first_name} {p.last_name}</p>
                <p className="text-xs text-slate-500">{p.club_name} · {p.email}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-500" /> Needs Attention</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {needsAttention?.length === 0 && <p className="text-sm text-slate-400">All clear.</p>}
            {needsAttention?.map(p => (
              <div key={p.id} className="p-2 rounded-lg bg-red-50">
                <p className="text-sm font-medium text-slate-900">{p.first_name} {p.last_name}</p>
                <p className="text-xs text-red-600">{p.status} · {p.club_name}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}