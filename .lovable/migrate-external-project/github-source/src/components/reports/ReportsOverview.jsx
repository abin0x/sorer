import React from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import {
  Users, UserPlus, UsersRound, DollarSign, Wallet, AlertCircle, CalendarCheck, Receipt, Circle,
} from "lucide-react";
import KpiTile from "@/components/reports/KpiTile";
import ChartCard from "@/components/reports/ChartCard";

const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

const ICON_MAP = {
  Users, UserPlus, UsersRound, DollarSign, Wallet, AlertCircle, CalendarCheck, Receipt,
};

function getIcon(name) {
  return ICON_MAP[name] || Circle;
}

function currencyFmt(v) {
  if (v == null) return "";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}

/**
 * Overview tab — role-based KPI tiles and charts.
 * props: { kpis, charts, onKpiClick }
 */
export default function ReportsOverview({ kpis, charts, onKpiClick }) {
  return (
    <div className="space-y-6">
      {/* KPI tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((kpi) => (
          <KpiTile
            key={kpi.key}
            label={kpi.label}
            value={kpi.value}
            format={kpi.format}
            change={kpi.change}
            subtitle={kpi.subtitle}
            icon={getIcon(kpi.icon)}
            onClick={() => onKpiClick(kpi.category)}
          />
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title={charts.registrationsOverTime.title} isLoading={charts.registrationsOverTime.isLoading} isEmpty={charts.registrationsOverTime.isEmpty}>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={charts.registrationsOverTime.data} margin={{ top: 5, right: 16, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={charts.revenueByMonth.title} isLoading={charts.revenueByMonth.isLoading} isEmpty={charts.revenueByMonth.isEmpty}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={charts.revenueByMonth.data} margin={{ top: 5, right: 16, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={currencyFmt} />
              <Tooltip formatter={currencyFmt} />
              <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title={charts.revenueByBranch.title} isLoading={charts.revenueByBranch.isLoading} isEmpty={charts.revenueByBranch.isEmpty}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={charts.revenueByBranch.data} layout="vertical" margin={{ top: 5, right: 16, bottom: 5, left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={currencyFmt} />
              <YAxis type="category" dataKey="branch" tick={{ fontSize: 11 }} width={80} />
              <Tooltip formatter={currencyFmt} />
              <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                {charts.revenueByBranch.data.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={charts.aging.title} isLoading={charts.aging.isLoading} isEmpty={charts.aging.isEmpty}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={charts.aging.data} margin={{ top: 5, right: 16, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={currencyFmt} />
              <Tooltip formatter={currencyFmt} />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                {charts.aging.data.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? "hsl(152 30% 52%)" : i === 1 ? "hsl(28 70% 58%)" : "hsl(0 70% 55%)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title={charts.rosterFill.title} isLoading={charts.rosterFill.isLoading} isEmpty={charts.rosterFill.isEmpty}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={charts.rosterFill.data} margin={{ top: 5, right: 16, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="ageGroup" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="filled" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="target" fill="hsl(var(--muted-foreground) / 0.3)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={charts.tryoutFunnel.title} isLoading={charts.tryoutFunnel.isLoading} isEmpty={charts.tryoutFunnel.isEmpty}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={charts.tryoutFunnel.data} layout="vertical" margin={{ top: 5, right: 16, bottom: 5, left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="stage" tick={{ fontSize: 11 }} width={90} />
              <Tooltip />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {charts.tryoutFunnel.data.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}