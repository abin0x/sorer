import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.custom_role !== 'admin' && user.custom_role !== 'director')) {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    // Fetch all projects and related data
    const programs = await base44.entities.Program.list('-created_date', 100);
    const expenses = await base44.entities.Expense.list('-created_date', 500);
    const staffPay = await base44.entities.StaffPay.list('-created_date', 500);
    const timeEntries = await base44.entities.TimeEntry.list('-created_date', 1000);

    // Calculate metrics for each program
    const projectMetrics = programs.map(program => {
      const programExpenses = expenses.filter(e => e.program_id === program.id);
      const programStaffPay = staffPay.filter(s => s.program_id === program.id);
      const programTimeEntries = timeEntries.filter(t => t.program_id === program.id);

      const totalExpenses = programExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const totalStaffPay = programStaffPay.reduce((sum, s) => sum + (s.amount || 0), 0);
      const totalHours = programTimeEntries.reduce((sum, t) => sum + (t.hours || 0), 0);
      const totalCost = totalExpenses + totalStaffPay;

      // Assume budget is revenue
      const revenue = program.budget || totalCost * 1.5;
      const profit = revenue - totalCost;
      const profitMargin = totalCost > 0 ? ((profit / revenue) * 100).toFixed(2) : 0;
      const costPerHour = totalHours > 0 ? (totalCost / totalHours).toFixed(2) : 0;

      return {
        id: program.id,
        title: program.title,
        status: program.status,
        revenue,
        totalCost,
        profit,
        profitMargin,
        totalHours,
        costPerHour,
        season: program.season,
        branches: program.branches,
        assignee: program.assignee,
        completed: program.status === 'done'
      };
    });

    // Generate AI insights
    const topProjects = projectMetrics
      .filter(p => p.completed)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5);

    const topByMargin = projectMetrics
      .filter(p => p.completed)
      .sort((a, b) => parseFloat(b.profitMargin) - parseFloat(a.profitMargin))
      .slice(0, 5);

    const analysisPrompt = `Analyze the following completed project profitability data and identify key performance indicators and insights:

Top Projects by Profit:
${topProjects.map(p => `- ${p.title}: $${p.profit.toFixed(2)} profit (${p.profitMargin}% margin)`).join('\n')}

Top Projects by Margin:
${topByMargin.map(p => `- ${p.title}: ${p.profitMargin}% margin ($${p.profit.toFixed(2)} profit)`).join('\n')}

Provide:
1. Key Performance Indicators (3-5 KPIs)
2. Trends and patterns
3. Top 3 recommendations for future projects
4. Risk factors to monitor

Be concise and actionable.`;

    const aiInsights = await base44.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      add_context_from_internet: false
    });

    // Calculate aggregate stats
    const completedProjects = projectMetrics.filter(p => p.completed);
    const totalRevenue = completedProjects.reduce((sum, p) => sum + p.revenue, 0);
    const totalProfit = completedProjects.reduce((sum, p) => sum + p.profit, 0);
    const avgMargin = completedProjects.length > 0
      ? (completedProjects.reduce((sum, p) => sum + parseFloat(p.profitMargin), 0) / completedProjects.length).toFixed(2)
      : 0;

    return Response.json({
      summary: {
        totalProjects: programs.length,
        completedProjects: completedProjects.length,
        totalRevenue: totalRevenue.toFixed(2),
        totalProfit: totalProfit.toFixed(2),
        avgMargin,
        recommendedForRepeat: topByMargin.slice(0, 3).map(p => p.title)
      },
      projectMetrics,
      topProjects,
      topByMargin,
      aiInsights
    });
  } catch (error) {
    console.error('Error analyzing profitability:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});