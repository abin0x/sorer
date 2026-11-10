import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reportType, dateRange, selectedPrograms, selectedTeam, userRole } = await req.json();

    // Fetch data
    const programs = await base44.entities.Program.list('-created_date', 100);
    const tasks = await base44.entities.Task.list('-created_date', 200);
    const expenses = await base44.entities.Expense.list('-created_date', 500);
    const staffPay = await base44.entities.StaffPay.list('-created_date', 500);
    const timeEntries = await base44.entities.TimeEntry.list('-created_date', 1000);
    const users = await base44.entities.User.list();

    // Filter data based on selections
    const filteredPrograms = selectedPrograms?.length 
      ? programs.filter(p => selectedPrograms.includes(p.id))
      : programs;

    // Generate KPI suggestions based on role
    const kpiSuggestions = {
      admin: [
        'Total Revenue', 'Total Cost', 'Profit Margin', 'ROI', 'Team Utilization',
        'Project Completion Rate', 'Budget Variance', 'Cost Per Project', 'Average Project Duration',
        'Staff Productivity', 'Resource Efficiency', 'Cash Flow'
      ],
      director: [
        'Team Workload', 'Project Timeline Adherence', 'Quality Metrics', 'Cost Variance',
        'Resource Allocation', 'Task Completion Rate', 'Team Efficiency', 'Bottlenecks'
      ],
      staff: [
        'My Tasks', 'Hours Logged', 'Productivity', 'Project Progress', 'Team Performance'
      ]
    };

    const roleKpis = kpiSuggestions[userRole] || kpiSuggestions.staff;

    // Calculate metrics
    const metrics = {
      totalProjects: filteredPrograms.length,
      completedProjects: filteredPrograms.filter(p => p.status === 'done').length,
      activeProjects: filteredPrograms.filter(p => p.status === 'in_progress').length,
      totalRevenue: filteredPrograms.reduce((sum, p) => sum + (p.budget || 0), 0),
      totalExpenses: expenses.filter(e => filteredPrograms.some(p => p.id === e.program_id))
        .reduce((sum, e) => sum + (e.amount || 0), 0),
      totalStaffCost: staffPay.filter(s => filteredPrograms.some(p => p.id === s.program_id))
        .reduce((sum, s) => sum + (s.amount || 0), 0),
      totalHours: timeEntries.filter(t => filteredPrograms.some(p => p.id === t.program_id))
        .reduce((sum, t) => sum + (t.hours || 0), 0),
      averageProjectDuration: filteredPrograms.length > 0
        ? (filteredPrograms.reduce((sum, p) => {
            if (p.due_date && p.suggested_start_date) {
              return sum + Math.ceil((new Date(p.due_date) - new Date(p.suggested_start_date)) / (1000 * 60 * 60 * 24));
            }
            return sum;
          }, 0) / filteredPrograms.length).toFixed(0)
        : 0
    };

    const totalCost = metrics.totalExpenses + metrics.totalStaffCost;
    const profit = metrics.totalRevenue - totalCost;
    const profitMargin = metrics.totalRevenue > 0 ? ((profit / metrics.totalRevenue) * 100).toFixed(2) : 0;
    const costPerHour = metrics.totalHours > 0 ? (totalCost / metrics.totalHours).toFixed(2) : 0;

    // Team productivity metrics
    const teamMetrics = users.map(u => {
      const userTimeEntries = timeEntries.filter(t => t.user_email === u.email);
      const userTasks = tasks.filter(t => t.assignee === u.email);
      const completedTasks = userTasks.filter(t => t.completed).length;
      
      return {
        name: u.full_name,
        email: u.email,
        hoursLogged: userTimeEntries.reduce((sum, t) => sum + (t.hours || 0), 0),
        tasksAssigned: userTasks.length,
        tasksCompleted: completedTasks,
        completionRate: userTasks.length > 0 ? ((completedTasks / userTasks.length) * 100).toFixed(1) : 0,
        productivity: (userTimeEntries.reduce((sum, t) => sum + (t.hours || 0), 0) / Math.max(1, userTasks.length)).toFixed(2)
      };
    });

    // Project performance breakdown
    const projectPerformance = filteredPrograms.map(p => {
      const projectExpenses = expenses.filter(e => e.program_id === p.id);
      const projectStaffPay = staffPay.filter(s => s.program_id === p.id);
      const projectTasks = tasks.filter(t => t.program_id === p.id);
      
      const cost = projectExpenses.reduce((sum, e) => sum + (e.amount || 0), 0) +
                   projectStaffPay.reduce((sum, s) => sum + (s.amount || 0), 0);
      const revenue = p.budget || cost * 1.5;
      const projectProfit = revenue - cost;
      
      return {
        title: p.title,
        status: p.status,
        revenue,
        cost,
        profit: projectProfit,
        margin: revenue > 0 ? ((projectProfit / revenue) * 100).toFixed(2) : 0,
        taskCompletion: projectTasks.length > 0 
          ? ((projectTasks.filter(t => t.completed).length / projectTasks.length) * 100).toFixed(1)
          : 0
      };
    });

    // Generate AI insights
    const insightPrompt = `Generate a concise executive summary with key insights for this report:

Report Type: ${reportType}
Period: ${dateRange}
Projects Analyzed: ${metrics.totalProjects}

Key Metrics:
- Total Revenue: $${metrics.totalRevenue.toFixed(2)}
- Total Cost: $${totalCost.toFixed(2)}
- Profit: $${profit.toFixed(2)} (${profitMargin}% margin)
- Active Projects: ${metrics.activeProjects}
- Completed Projects: ${metrics.completedProjects}
- Team Hours: ${metrics.totalHours}
- Cost Per Hour: $${costPerHour}

Top Performers:
${teamMetrics.filter(m => m.hoursLogged > 0).sort((a, b) => parseFloat(b.completionRate) - parseFloat(a.completionRate)).slice(0, 3)
  .map(m => `- ${m.name}: ${m.completionRate}% completion rate`).join('\n')}

Provide:
1. Executive Summary (2-3 sentences)
2. Key Highlights (3-4 bullet points)
3. Areas for Improvement (2-3 recommendations)`;

    const insights = await base44.integrations.Core.InvokeLLM({
      prompt: insightPrompt,
      add_context_from_internet: false
    });

    return Response.json({
      reportMetadata: {
        reportType,
        dateRange,
        generatedDate: new Date().toISOString(),
        userRole,
        kpiSuggestions: roleKpis
      },
      metrics,
      financialMetrics: {
        revenue: metrics.totalRevenue.toFixed(2),
        cost: totalCost.toFixed(2),
        profit: profit.toFixed(2),
        profitMargin,
        costPerHour,
        roi: metrics.totalRevenue > 0 ? (((profit / totalCost) * 100).toFixed(2)) : 0
      },
      teamProductivity: teamMetrics.sort((a, b) => parseFloat(b.completionRate) - parseFloat(a.completionRate)),
      projectPerformance: projectPerformance.sort((a, b) => parseFloat(b.margin) - parseFloat(a.margin)),
      insights
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});