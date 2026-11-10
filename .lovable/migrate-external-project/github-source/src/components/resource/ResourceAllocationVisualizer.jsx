import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Users, AlertTriangle, TrendingUp } from "lucide-react";

export default function ResourceAllocationVisualizer({ data }) {
  if (!data) return null;

  const { teamUtilization, suggestions, overloadedMembers, underutilizedMembers, workloadData, recommendations } = data;

  const getStatusColor = (status) => {
    switch (status) {
      case 'overloaded':
        return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200 border-red-300 dark:border-red-800';
      case 'busy':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200 border-orange-300 dark:border-orange-800';
      case 'available':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200 border-yellow-300 dark:border-yellow-800';
      default:
        return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200 border-green-300 dark:border-green-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'overloaded':
        return <AlertTriangle className="w-4 h-4" />;
      case 'busy':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700 dark:text-red-300">Overloaded</p>
                <p className="text-3xl font-bold text-red-900 dark:text-red-100">{overloadedMembers.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 dark:text-blue-300">Team Members</p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{teamUtilization.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 dark:text-green-300">Underutilized</p>
                <p className="text-3xl font-bold text-green-900 dark:text-green-100">{underutilizedMembers.length}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workload Chart */}
      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader>
          <CardTitle>Team Workload Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={workloadData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} />
              <Legend />
              <Bar dataKey="tasks" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              <Bar dataKey="completed" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Team Status */}
      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader>
          <CardTitle>Team Member Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {teamUtilization.map((member) => (
              <div
                key={member.email}
                className={`p-4 rounded-lg border-2 ${getStatusColor(member.status)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(member.status)}
                    <div>
                      <p className="font-bold">{member.name}</p>
                      <p className="text-xs opacity-75">{member.email}</p>
                    </div>
                  </div>
                  <Badge className={member.status === 'overloaded' ? 'bg-red-500' : member.status === 'busy' ? 'bg-orange-500' : member.status === 'available' ? 'bg-yellow-500' : 'bg-green-500'}>
                    {member.utilizationRate}%
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <p className="opacity-75">Tasks</p>
                    <p className="font-semibold">{member.currentTasks}</p>
                  </div>
                  <div>
                    <p className="opacity-75">Completed</p>
                    <p className="font-semibold">{member.completedTasks}</p>
                  </div>
                  <div>
                    <p className="opacity-75">Hours</p>
                    <p className="font-semibold">{member.hoursLogged.toFixed(0)}h</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <Card className="dark:bg-slate-800 dark:border-slate-700">
          <CardHeader>
            <CardTitle>Assignment Suggestions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {suggestions.slice(0, 5).map((suggestion, idx) => (
                <Alert key={idx} className="border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
                  <AlertDescription className="text-blue-900 dark:text-blue-100">
                    <p className="font-bold mb-1">{suggestion.taskTitle}</p>
                    <p className="text-sm mb-2">{suggestion.recommendation}</p>
                    {suggestion.suggestedAssignee && (
                      <Badge className="bg-blue-500 text-white">{suggestion.suggestedAssignee}</Badge>
                    )}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Recommendations */}
      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader>
          <CardTitle>AI Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
            <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
              {recommendations}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}