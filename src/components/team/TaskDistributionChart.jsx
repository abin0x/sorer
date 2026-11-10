import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";

const COLORS = {
  completed: '#16a34a',
  inProgress: '#2563eb',
  todo: '#64748b',
  inReview: '#f59e0b',
  overdue: '#dc2626'
};

export default function TaskDistributionChart({ teamMembers, tasks, getMemberStats }) {
  const chartData = teamMembers.map(member => {
    const stats = getMemberStats(member.email);
    return {
      name: member.full_name?.split(' ')[0] || member.email.split('@')[0],
      completed: stats.completed,
      inProgress: stats.inProgress,
      todo: stats.todo,
      inReview: stats.inReview,
    };
  }).filter(data => data.completed + data.inProgress + data.todo + data.inReview > 0);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-slate-500">
        <p>No task data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis 
          dataKey="name" 
          stroke="#64748b"
          style={{ fontSize: '12px' }}
        />
        <YAxis 
          stroke="#64748b"
          style={{ fontSize: '12px' }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#fff', 
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
          }}
        />
        <Legend 
          wrapperStyle={{ fontSize: '12px' }}
          iconType="circle"
        />
        <Bar dataKey="completed" stackId="a" fill={COLORS.completed} name="Completed" radius={[0, 0, 0, 0]} />
        <Bar dataKey="inReview" stackId="a" fill={COLORS.inReview} name="In Review" radius={[0, 0, 0, 0]} />
        <Bar dataKey="inProgress" stackId="a" fill={COLORS.inProgress} name="In Progress" radius={[0, 0, 0, 0]} />
        <Bar dataKey="todo" stackId="a" fill={COLORS.todo} name="To Do" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}