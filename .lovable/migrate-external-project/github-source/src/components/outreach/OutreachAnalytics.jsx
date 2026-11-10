import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

export default function OutreachAnalytics() {
  const [data, setData] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [dashRes, brkRes] = await Promise.all([
        base44.functions.invoke('outreach-analytics', { action: 'dashboard', days }),
        base44.functions.invoke('outreach-analytics', { action: 'breakdown', days }),
      ]);
      setData(dashRes.data);
      setBreakdown(brkRes.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [days]);

  if (loading) return <div className="p-8 text-center text-slate-400">Loading analytics…</div>;
  if (!data) return <div className="p-8 text-center text-slate-400">No data yet.</div>;

  const { kpis, funnel, sendsByDay } = data;
  const maxFunnel = Math.max(...funnel.map(f => f.count), 1);

  return (
    <div className="space-y-4">
      {/* Date range */}
      <div className="flex gap-2">
        {[7, 30, 90].map(d => (
          <Button key={d} size="sm" variant={days === d ? 'default' : 'outline'} onClick={() => setDays(d)}>Last {d}d</Button>
        ))}
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Emails Sent', value: kpis.emailsSent },
          { label: 'Open Rate', value: `${kpis.openRate.toFixed(1)}%` },
          { label: 'Click Rate', value: `${kpis.clickRate.toFixed(1)}%` },
          { label: 'Reply Rate', value: `${kpis.replyRate.toFixed(1)}%` },
          { label: 'Demos Booked', value: kpis.demosBooked },
          { label: 'Bounce Rate', value: `${kpis.bounceRate.toFixed(1)}%` },
          { label: 'Complaint Rate', value: `${kpis.complaintRate.toFixed(2)}%` },
          { label: 'Total Prospects', value: kpis.totalProspects },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">{kpi.label}</p>
              <p className="text-2xl font-bold text-slate-900">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Funnel */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Engagement Funnel</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {funnel.map(stage => (
            <div key={stage.stage}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">{stage.stage}</span>
                <span className="font-bold text-slate-900">{stage.count}</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${(stage.count / maxFunnel) * 100}%` }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Sends by day */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Sends by Day</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
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

      {/* Breakdowns */}
      {breakdown && (
        <div className="grid md:grid-cols-3 gap-4">
          <BreakdownTable title="By Sequence" rows={breakdown.bySequence} nameKey="name" />
          <BreakdownTable title="By Region" rows={breakdown.byRegion} nameKey="region" />
          <BreakdownTable title="By Platform" rows={breakdown.byPlatform} nameKey="platform" />
        </div>
      )}
    </div>
  );
}

function BreakdownTable({ title, rows, nameKey }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr><th className="text-left px-3 py-1.5 font-semibold text-slate-600">Name</th><th className="text-right px-3 py-1.5 font-semibold text-slate-600">Sent</th><th className="text-right px-3 py-1.5 font-semibold text-slate-600">Open%</th><th className="text-right px-3 py-1.5 font-semibold text-slate-600">Click%</th></tr>
          </thead>
          <tbody>
            {(rows || []).map((r, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="px-3 py-1.5 text-slate-700">{r[nameKey]}</td>
                <td className="px-3 py-1.5 text-right text-slate-600">{r.sent}</td>
                <td className="px-3 py-1.5 text-right text-slate-600">{(r.openRate || (r.sent > 0 ? r.opened / r.sent * 100 : 0)).toFixed(1)}%</td>
                <td className="px-3 py-1.5 text-right text-slate-600">{(r.clickRate || (r.sent > 0 ? r.clicked / r.sent * 100 : 0)).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!rows || rows.length === 0) && <p className="p-4 text-center text-slate-400 text-sm">No data.</p>}
      </CardContent>
    </Card>
  );
}