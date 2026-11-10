
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Users, 
  AlertCircle,
  Calendar,
  Download
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { format, subDays, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, isPast, isToday } from "date-fns";
import { toast } from "sonner";
import KeyMetricsWidget from "../components/dashboard/KeyMetricsWidget";
import { PDFExportButton, exportToPDF } from "../components/reports/PDFExporter";

const COLORS = ['#059669', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Dashboard() {
  const [dateRange, setDateRange] = useState("30");
  const [branchFilter, setBranchFilter] = useState("all");

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: programs = [] } = useQuery({
    queryKey: ["programs"],
    queryFn: () => base44.entities.Program.list("-created_date"),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => base44.entities.Task.list(),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list(),
  });

  const { data: staffPay = [] } = useQuery({
    queryKey: ["staffpay"],
    queryFn: () => base44.entities.StaffPay.list(),
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  // Filter by date range
  const getDateCutoff = () => {
    switch(dateRange) {
      case "7": return subDays(new Date(), 7);
      case "30": return subDays(new Date(), 30);
      case "90": return subDays(new Date(), 90);
      case "180": return subDays(new Date(), 180);
      case "365": return subDays(new Date(), 365);
      default: return subDays(new Date(), 30);
    }
  };

  const cutoffDate = getDateCutoff();

  // Filter programs and expenses by date and branch
  const filteredPrograms = programs.filter(p => {
    const matchesBranch = branchFilter === "all" || p.branch === branchFilter;
    const matchesDate = new Date(p.created_date) >= cutoffDate;
    return matchesBranch && matchesDate;
  });

  const filteredExpenses = expenses.filter(e => {
    const program = programs.find(p => p.id === e.program_id);
    const matchesBranch = branchFilter === "all" || program?.branch === branchFilter;
    const matchesDate = new Date(e.created_date) >= cutoffDate;
    return matchesBranch && matchesDate;
  });

  const filteredStaffPay = staffPay.filter(sp => {
    const program = programs.find(p => p.id === sp.program_id);
    const matchesBranch = branchFilter === "all" || program?.branch === branchFilter;
    const matchesDate = new Date(sp.created_date) >= cutoffDate;
    return matchesBranch && matchesDate;
  });

  // Program completion rates over time
  const getCompletionRatesByMonth = () => {
    const months = eachMonthOfInterval({
      start: subMonths(new Date(), 6),
      end: new Date()
    });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthPrograms = filteredPrograms.filter(p => {
        const createdDate = new Date(p.created_date);
        return createdDate >= monthStart && createdDate <= monthEnd;
      });

      const completed = monthPrograms.filter(p => p.status === 'done').length;
      const total = monthPrograms.length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        month: format(month, 'MMM'),
        rate,
        completed,
        total
      };
    });
  };

  // Budget vs actual spending
  const getBudgetData = () => {
    const totalBudget = filteredPrograms.reduce((sum, p) => sum + (p.budget || 0), 0);
    const approvedExpenses = filteredExpenses
      .filter(e => e.status === 'approved')
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalStaffPay = filteredStaffPay.reduce((sum, sp) => sum + (sp.amount || 0), 0);
    const totalSpent = approvedExpenses + totalStaffPay;

    return [
      { name: 'Budget', value: totalBudget, fill: '#059669' },
      { name: 'Spent', value: totalSpent, fill: '#ef4444' },
      { name: 'Remaining', value: Math.max(0, totalBudget - totalSpent), fill: '#3b82f6' }
    ];
  };

  // Task distribution by assignee
  const getTaskDistribution = () => {
    const distribution = {};
    
    tasks.forEach(task => {
      if (task.assignee) {
        if (!distribution[task.assignee]) {
          distribution[task.assignee] = { total: 0, completed: 0 };
        }
        distribution[task.assignee].total++;
        if (task.completed) {
          distribution[task.assignee].completed++;
        }
      }
    });

    return Object.entries(distribution)
      .map(([email, data]) => {
        const member = teamMembers.find(m => m.email === email);
        return {
          name: member?.full_name || email.split('@')[0],
          total: data.total,
          completed: data.completed,
          pending: data.total - data.completed
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  };

  // Overdue trends
  const getOverdueTrends = () => {
    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(today, 6 - i);
      
      const overduePrograms = filteredPrograms.filter(p => {
        if (!p.due_date || p.status === 'done') return false;
        const dueDate = new Date(p.due_date);
        return isPast(dueDate) && !isToday(dueDate) && new Date(p.due_date) <= date;
      }).length;

      const overdueTasks = tasks.filter(t => {
        if (!t.due_date || t.completed) return false;
        const dueDate = new Date(t.due_date);
        return isPast(dueDate) && !isToday(dueDate) && new Date(t.due_date) <= date;
      }).length;

      return {
        date: format(date, 'MMM dd'),
        programs: overduePrograms,
        tasks: overdueTasks
      };
    });

    return last7Days;
  };

  // Status distribution
  const getStatusDistribution = () => {
    const statusCounts = {
      todo: filteredPrograms.filter(p => p.status === 'todo').length,
      in_progress: filteredPrograms.filter(p => p.status === 'in_progress').length,
      in_review: filteredPrograms.filter(p => p.status === 'in_review').length,
      done: filteredPrograms.filter(p => p.status === 'done').length,
    };

    return [
      { name: 'To Do', value: statusCounts.todo, fill: '#94a3b8' },
      { name: 'In Progress', value: statusCounts.in_progress, fill: '#3b82f6' },
      { name: 'In Review', value: statusCounts.in_review, fill: '#f59e0b' },
      { name: 'Done', value: statusCounts.done, fill: '#059669' }
    ].filter(item => item.value > 0);
  };

  const branches = [...new Set(programs.map(p => p.branch).filter(Boolean))];
  const completionData = getCompletionRatesByMonth();
  const budgetData = getBudgetData();
  const taskDistribution = getTaskDistribution();
  const overdueTrends = getOverdueTrends();
  const statusDistribution = getStatusDistribution();

  const handleExport = () => {
    try {
      const csvData = [
        ['Reporting Dashboard Export'],
        ['Date Range:', dateRange === "7" ? '7 days' : dateRange === "30" ? '30 days' : dateRange === "90" ? '90 days' : dateRange === "180" ? '6 months' : '1 year'],
        ['Branch:', branchFilter === "all" ? 'All Branches' : branchFilter],
        [''],
        ['Summary Metrics'],
        ['Total Programs', filteredPrograms.length],
        ['Completed Programs', filteredPrograms.filter(p => p.status === 'done').length],
        ['Total Budget', `$${budgetData[0].value.toLocaleString()}`],
        ['Total Spent', `$${budgetData[1].value.toLocaleString()}`],
        [''],
        ['Program Status Distribution'],
        ...statusDistribution.map(item => [item.name, item.value]),
        [''],
        ['Task Distribution by Assignee'],
        ['Assignee', 'Total Tasks', 'Completed', 'Pending'],
        ...taskDistribution.map(item => [item.name, item.total, item.completed, item.pending]),
      ];

      const csv = csvData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dashboard-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      
      toast.success("Report exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export report");
    }
  };

  const handleExportPDF = () => {
    const htmlData = `
      <style>
        body { font-family: sans-serif; }
        h1, h2 { color: #333; }
        .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
        .metric { background-color: #f0f4f8; border-radius: 8px; padding: 15px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #007bff; }
        .metric-label { font-size: 0.9em; color: #555; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
      </style>
      <h1>${branchFilter === "all" ? 'All Branches' : branchFilter} - Dashboard Report (${dateRange === "7" ? 'Last 7 days' : dateRange === "30" ? 'Last 30 days' : dateRange === "90" ? 'Last 90 days' : dateRange === "180" ? 'Last 6 months' : 'Last year'})</h1>
      <div class="summary">
        <div class="metric">
          <div class="metric-value">${filteredPrograms.length}</div>
          <div class="metric-label">Total Programs</div>
        </div>
        <div class="metric">
          <div class="metric-value">${filteredPrograms.filter(p => p.status === 'done').length}</div>
          <div class="metric-label">Completed</div>
        </div>
        <div class="metric">
          <div class="metric-value">$${budgetData[1]?.value.toLocaleString() || 0}</div>
          <div class="metric-label">Total Spent</div>
        </div>
        <div class="metric">
          <div class="metric-value">${overdueTrends[overdueTrends.length - 1]?.programs + overdueTrends[overdueTrends.length - 1]?.tasks || 0}</div>
          <div class="metric-label">Overdue Items</div>
        </div>
      </div>
      
      <h2>Program Status Distribution</h2>
      <table>
        <tr><th>Status</th><th>Count</th></tr>
        ${statusDistribution.map(item => `<tr><td>${item.name}</td><td>${item.value}</td></tr>`).join('')}
      </table>
      
      <h2>Task Distribution by Team Member</h2>
      <table>
        <tr><th>Assignee</th><th>Total</th><th>Completed</th><th>Pending</th></tr>
        ${taskDistribution.map(item => `
          <tr>
            <td>${item.name}</td>
            <td>${item.total}</td>
            <td>${item.completed}</td>
            <td>${item.pending}</td>
          </tr>
        `).join('')}
      </table>
    `;

    exportToPDF(htmlData, `dashboard-report-${format(new Date(), 'yyyy-MM-dd')}`, 'Dashboard Report');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Reporting Dashboard</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Analytics and insights across all programs</p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40 dark:bg-slate-900 dark:border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="180">Last 6 months</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>

            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-40 dark:bg-slate-900 dark:border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map(branch => (
                  <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={handleExport} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>

            <PDFExportButton onExport={handleExportPDF} label="PDF" />
          </div>
        </div>

        {/* Key Metrics Widget */}
        <KeyMetricsWidget 
          programs={filteredPrograms}
          tasks={tasks} // Pass all tasks, widget might filter by date/branch internally
          expenses={filteredExpenses}
          staffPay={filteredStaffPay}
        />

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white">Program Completion Rate Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={completionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="rate" stroke="#059669" name="Completion %" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white">Program Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white">Budget Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={budgetData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#059669">
                    {budgetData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white">Overdue Trends (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={overdueTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="programs" stroke="#ef4444" name="Programs" strokeWidth={2} />
                  <Line type="monotone" dataKey="tasks" stroke="#f59e0b" name="Tasks" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Task Distribution Chart */}
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-white">Task Distribution by Team Member</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={taskDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" stackId="a" fill="#059669" name="Completed" />
                <Bar dataKey="pending" stackId="a" fill="#f59e0b" name="Pending" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
