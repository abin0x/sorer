import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from "recharts";
import { 
  TrendingUp, Calendar, Users, CheckCircle, Clock, 
  AlertCircle, Target, Activity, BarChart3 
} from "lucide-react";
import { differenceInDays, format } from "date-fns";

const COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me()
  });

  const { data: programs = [] } = useQuery({
    queryKey: ["programs"],
    queryFn: () => base44.entities.Program.list()
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => base44.entities.Task.list()
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list()
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list()
  });

  const { data: staffPay = [] } = useQuery({
    queryKey: ["staffPay"],
    queryFn: () => base44.entities.StaffPay.list()
  });

  // Filter programs by branch
  const filteredPrograms = branchFilter === "all" 
    ? programs 
    : programs.filter(p => Array.isArray(p.branches) ? p.branches.includes(branchFilter) : p.branch === branchFilter);

  // Calculate metrics
  const totalPrograms = filteredPrograms.length;
  const completedPrograms = filteredPrograms.filter(p => p.status === 'done').length;
  const inProgressPrograms = filteredPrograms.filter(p => p.status === 'in_progress').length;
  const overduePrograms = filteredPrograms.filter(p => {
    if (p.status === 'done') return false;
    if (!p.due_date) return false;
    return new Date(p.due_date) < new Date();
  }).length;

  const completionRate = totalPrograms > 0 ? Math.round((completedPrograms / totalPrograms) * 100) : 0;

  // Average time to completion
  const completedProgramsWithDates = filteredPrograms.filter(p => 
    p.status === 'done' && p.started_date && p.completed_date
  );
  const avgCompletionTime = completedProgramsWithDates.length > 0
    ? Math.round(
        completedProgramsWithDates.reduce((sum, p) => 
          sum + differenceInDays(new Date(p.completed_date), new Date(p.started_date)), 0
        ) / completedProgramsWithDates.length
      )
    : 0;

  // Status breakdown
  const statusData = [
    { name: 'To Do', value: filteredPrograms.filter(p => p.status === 'todo').length },
    { name: 'In Progress', value: inProgressPrograms },
    { name: 'In Review', value: filteredPrograms.filter(p => p.status === 'in_review').length },
    { name: 'Done', value: completedPrograms }
  ].filter(d => d.value > 0);

  // Priority breakdown
  const priorityData = [
    { name: 'Low', value: filteredPrograms.filter(p => p.priority === 'low').length },
    { name: 'Medium', value: filteredPrograms.filter(p => p.priority === 'medium').length },
    { name: 'High', value: filteredPrograms.filter(p => p.priority === 'high').length }
  ].filter(d => d.value > 0);

  // Workload by assignee
  const workloadByAssignee = teamMembers.map(member => {
    const memberPrograms = filteredPrograms.filter(p => p.assignee === member.email);
    return {
      name: member.full_name || member.email?.split('@')[0] || 'Unknown',
      total: memberPrograms.length,
      completed: memberPrograms.filter(p => p.status === 'done').length,
      inProgress: memberPrograms.filter(p => p.status === 'in_progress').length
    };
  }).filter(d => d.total > 0).sort((a, b) => b.total - a.total).slice(0, 10);

  // Programs by branch
  const branches = [...new Set(programs.flatMap(p => 
    Array.isArray(p.branches) ? p.branches : (p.branch ? [p.branch] : [])
  ))];
  
  const branchData = branches.map(branch => ({
    name: branch,
    programs: filteredPrograms.filter(p => 
      Array.isArray(p.branches) ? p.branches.includes(branch) : p.branch === branch
    ).length
  })).sort((a, b) => b.programs - a.programs);

  // Financial overview
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalStaffPay = staffPay.reduce((sum, s) => sum + (s.amount || 0), 0);
  const pendingExpenses = expenses.filter(e => e.status === 'pending').length;
  const approvedExpenses = expenses.filter(e => e.status === 'approved').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 dark:from-slate-950 dark:to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Analytics Dashboard
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">Comprehensive insights into program performance</p>
          </div>
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by Branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map(branch => (
                <SelectItem key={branch} value={branch}>{branch}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-xl">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Programs</p>
                  <p className="text-4xl font-bold mt-2">{totalPrograms}</p>
                </div>
                <BarChart3 className="w-12 h-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-xl">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Completion Rate</p>
                  <p className="text-4xl font-bold mt-2">{completionRate}%</p>
                </div>
                <CheckCircle className="w-12 h-12 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0 shadow-xl">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-sm font-medium">Avg. Completion</p>
                  <p className="text-4xl font-bold mt-2">{avgCompletionTime}d</p>
                </div>
                <Clock className="w-12 h-12 text-amber-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0 shadow-xl">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm font-medium">Overdue</p>
                  <p className="text-4xl font-bold mt-2">{overduePrograms}</p>
                </div>
                <AlertCircle className="w-12 h-12 text-red-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                Program Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-600" />
                Priority Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={priorityData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              Workload Distribution by Team Member
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={workloadByAssignee}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" fill="#10b981" name="Completed" stackId="a" />
                <Bar dataKey="inProgress" fill="#3b82f6" name="In Progress" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Branch Distribution */}
        {branchFilter === "all" && (
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-600" />
                Programs by Branch
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={branchData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} />
                  <Tooltip />
                  <Bar dataKey="programs" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Financial Overview */}
        <Card className="shadow-xl bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              Financial Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center p-6 bg-white dark:bg-slate-900 rounded-xl shadow-md">
                <p className="text-sm text-slate-600 dark:text-slate-400">Total Expenses</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                  ${totalExpenses.toLocaleString()}
                </p>
              </div>
              <div className="text-center p-6 bg-white dark:bg-slate-900 rounded-xl shadow-md">
                <p className="text-sm text-slate-600 dark:text-slate-400">Total Staff Pay</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                  ${totalStaffPay.toLocaleString()}
                </p>
              </div>
              <div className="text-center p-6 bg-white dark:bg-slate-900 rounded-xl shadow-md">
                <p className="text-sm text-slate-600 dark:text-slate-400">Pending Expenses</p>
                <p className="text-3xl font-bold text-amber-600 mt-2">{pendingExpenses}</p>
              </div>
              <div className="text-center p-6 bg-white dark:bg-slate-900 rounded-xl shadow-md">
                <p className="text-sm text-slate-600 dark:text-slate-400">Approved Expenses</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{approvedExpenses}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}