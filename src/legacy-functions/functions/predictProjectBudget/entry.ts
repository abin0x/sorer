// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';

export default (async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { programId, programTitle, description, season, daysUntilDue, teamSize = 3 } = await req.json();

    if (!programId) {
      return Response.json({ error: 'Program ID is required' }, { status: 400 });
    }

    // Fetch historical data from similar projects
    const allPrograms = await base44.entities.Program.list('-created_date', 100);
    const allExpenses = await base44.entities.Expense.list('-created_date', 500);
    const allStaffPay = await base44.entities.StaffPay.list('-created_date', 500);
    const allTimeEntries = await base44.entities.TimeEntry.list('-created_date', 1000);

    // Get current program
    const currentProgram = allPrograms.find(p => p.id === programId);
    if (!currentProgram) {
      return Response.json({ error: 'Program not found' }, { status: 404 });
    }

    // Find similar historical projects for comparison
    const similarProjects = allPrograms.filter(p => 
      p.status === 'done' && 
      p.season === (season || currentProgram.season) &&
      p.id !== programId
    );

    const projectCosts = similarProjects.map(project => {
      const projectExpenses = allExpenses.filter(e => e.program_id === project.id);
      const projectStaffPay = allStaffPay.filter(s => s.program_id === project.id);
      const projectTimeEntries = allTimeEntries.filter(t => t.program_id === project.id);

      const totalExpenses = projectExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const totalStaffPay = projectStaffPay.reduce((sum, s) => sum + (s.amount || 0), 0);
      const totalHours = projectTimeEntries.reduce((sum, t) => sum + (t.hours || 0), 0);
      const totalCost = totalExpenses + totalStaffPay;

      return {
        title: project.title,
        duration: project.due_date && project.suggested_start_date 
          ? Math.ceil((new Date(project.due_date) - new Date(project.suggested_start_date)) / (1000 * 60 * 60 * 24))
          : 30,
        totalCost,
        totalHours,
        costPerHour: totalHours > 0 ? totalCost / totalHours : 0,
        costPerDay: (totalCost / 30) // Assuming 30 days average
      };
    });

    // Calculate averages from historical data
    const avgCostPerHour = projectCosts.length > 0
      ? projectCosts.reduce((sum, p) => sum + p.costPerHour, 0) / projectCosts.length
      : 150; // Default fallback

    const avgCostPerDay = projectCosts.length > 0
      ? projectCosts.reduce((sum, p) => sum + p.costPerDay, 0) / projectCosts.length
      : 500; // Default fallback

    // Estimate budget
    const estimatedDays = daysUntilDue || 30;
    const baseCost = avgCostPerDay * estimatedDays;
    const teamAdjustment = teamSize * 0.15; // 15% per team member
    const contingency = 0.15; // 15% contingency buffer

    const estimatedCost = baseCost * (1 + teamAdjustment) * (1 + contingency);
    const minBudget = estimatedCost * 0.85;
    const maxBudget = estimatedCost * 1.35;

    // Get current actual spend
    const currentExpenses = allExpenses.filter(e => e.program_id === programId);
    const currentStaffPay = allStaffPay.filter(s => s.program_id === programId);
    const currentTimeEntries = allTimeEntries.filter(t => t.program_id === programId);

    const actualExpenses = currentExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const actualStaffPay = currentStaffPay.reduce((sum, s) => sum + (s.amount || 0), 0);
    const actualCost = actualExpenses + actualStaffPay;
    const actualHours = currentTimeEntries.reduce((sum, t) => sum + (t.hours || 0), 0);

    // Calculate burn rate (cost per day)
    const burnRate = actualCost > 0 ? actualCost / Math.max(1, actualHours / 8) : 0;
    const projectedFinalCost = actualCost + (burnRate * (estimatedDays - (actualHours / 8)));

    // Identify risks
    const overrunRisk = projectedFinalCost > estimatedCost * 1.2 ? 'high' : 
                       projectedFinalCost > estimatedCost * 1.1 ? 'medium' : 'low';

    const currentBudget = currentProgram.budget || estimatedCost;
    const budgetOverrun = actualCost > currentBudget;
    const daysElapsed = currentProgram.suggested_start_date 
      ? Math.ceil((new Date() - new Date(currentProgram.suggested_start_date)) / (1000 * 60 * 60 * 24))
      : 0;

    // Generate AI forecast narrative
    const forecastPrompt = `Based on historical project data, provide a budget forecast for:

Program: ${programTitle}
Estimated Duration: ${estimatedDays} days
Team Size: ${teamSize} members
Current Spend: $${actualCost.toFixed(2)}
Current Budget: $${currentBudget.toFixed(2)}
Days Elapsed: ${daysElapsed}

Forecast Details:
- Estimated Cost: $${estimatedCost.toFixed(2)}
- Min Budget: $${minBudget.toFixed(2)}
- Max Budget: $${maxBudget.toFixed(2)}
- Projected Final Cost: $${projectedFinalCost.toFixed(2)}
- Burn Rate: $${burnRate.toFixed(2)}/day
- Risk Level: ${overrunRisk}

Provide:
1. Brief budget assessment
2. Key risks identified
3. Recommendations to stay on budget
4. Confidence level in forecast (%)

Be concise and actionable.`;

    const forecast = await base44.integrations.Core.InvokeLLM({
      prompt: forecastPrompt,
      add_context_from_internet: false
    });

    return Response.json({
      forecast,
      estimates: {
        estimatedCost: estimatedCost.toFixed(2),
        minBudget: minBudget.toFixed(2),
        maxBudget: maxBudget.toFixed(2),
        contingencyPercentage: (contingency * 100).toFixed(0)
      },
      currentStatus: {
        actualCost: actualCost.toFixed(2),
        actualHours: actualHours.toFixed(1),
        currentBudget: currentBudget.toFixed(2),
        budgetUtilization: (actualCost / currentBudget * 100).toFixed(1),
        daysElapsed,
        estimatedDays
      },
      projection: {
        projectedFinalCost: projectedFinalCost.toFixed(2),
        projectedOverrun: Math.max(0, (projectedFinalCost - currentBudget)).toFixed(2),
        burnRate: burnRate.toFixed(2)
      },
      risk: {
        level: overrunRisk,
        budgetOverrun,
        overrunAmount: Math.max(0, (actualCost - currentBudget)).toFixed(2)
      },
      comparison: {
        similarProjectsAnalyzed: projectCosts.length,
        avgCostPerHour: avgCostPerHour.toFixed(2),
        avgCostPerDay: avgCostPerDay.toFixed(2)
      }
    });
  } catch (error) {
    console.error('Error predicting budget:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});