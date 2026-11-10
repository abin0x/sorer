import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all data
    const programs = await base44.entities.Program.list('-created_date', 100);
    const tasks = await base44.entities.Task.list('-created_date', 200);
    const expenses = await base44.entities.Expense.list('-created_date', 500);
    const staffPay = await base44.entities.StaffPay.list('-created_date', 500);
    const timeEntries = await base44.entities.TimeEntry.list('-created_date', 1000);

    const risks = [];

    // Analyze each project
    programs.forEach(program => {
      if (program.status === 'done') return; // Skip completed projects

      const programExpenses = expenses.filter(e => e.program_id === program.id);
      const programStaffPay = staffPay.filter(s => s.program_id === program.id);
      const programTasks = tasks.filter(t => t.program_id === program.id);
      const programTimeEntries = timeEntries.filter(t => t.program_id === program.id);

      const actualCost = programExpenses.reduce((sum, e) => sum + (e.amount || 0), 0) +
                        programStaffPay.reduce((sum, s) => sum + (s.amount || 0), 0);
      const budget = program.budget || actualCost * 1.2;
      const daysUntilDue = program.due_date 
        ? Math.ceil((new Date(program.due_date) - new Date()) / (1000 * 60 * 60 * 24))
        : 30;
      const daysElapsed = program.suggested_start_date
        ? Math.ceil((new Date() - new Date(program.suggested_start_date)) / (1000 * 60 * 60 * 24))
        : 0;

      // Risk 1: Budget Overrun
      const budgetUtilization = (actualCost / budget * 100).toFixed(0);
      if (budgetUtilization > 80) {
        const burnRate = programTimeEntries.length > 0
          ? actualCost / (programTimeEntries.reduce((sum, t) => sum + t.hours, 0) / 8)
          : 0;
        const projectedCost = actualCost + (burnRate * Math.max(0, daysUntilDue));
        
        if (projectedCost > budget * 1.1) {
          risks.push({
            programId: program.id,
            programTitle: program.title,
            type: 'budget_overrun',
            severity: projectedCost > budget * 1.3 ? 'critical' : 'high',
            title: 'Budget Overrun Risk',
            description: `Project is at ${budgetUtilization}% of budget. Projected final cost: $${projectedCost.toFixed(0)}`,
            impact: 'Financial',
            recommendation: 'Review expenses, pause non-critical tasks, or request budget increase'
          });
        }
      }

      // Risk 2: Timeline Slippage
      const completedTasks = programTasks.filter(t => t.completed).length;
      const taskCompletion = programTasks.length > 0 ? (completedTasks / programTasks.length * 100) : 0;
      const expectedCompletion = (daysElapsed / (daysElapsed + daysUntilDue) * 100);

      if (taskCompletion < expectedCompletion - 15 && daysUntilDue < 14) {
        risks.push({
          programId: program.id,
          programTitle: program.title,
          type: 'timeline_slippage',
          severity: daysUntilDue < 7 ? 'critical' : 'high',
          title: 'Timeline Slippage Risk',
          description: `Only ${taskCompletion.toFixed(0)}% complete, but ${expectedCompletion.toFixed(0)}% of time elapsed. ${daysUntilDue} days remaining.`,
          impact: 'Schedule',
          recommendation: 'Accelerate task completion, add resources, or adjust scope'
        });
      }

      // Risk 3: Resource Shortage
      const incompleteTasksWithoutAssignee = programTasks.filter(t => !t.completed && !t.assignee).length;
      if (incompleteTasksWithoutAssignee > 0) {
        risks.push({
          programId: program.id,
          programTitle: program.title,
          type: 'resource_shortage',
          severity: incompleteTasksWithoutAssignee > 3 ? 'high' : 'medium',
          title: 'Unassigned Tasks',
          description: `${incompleteTasksWithoutAssignee} tasks are not assigned to team members`,
          impact: 'Execution',
          recommendation: 'Assign remaining tasks to available team members'
        });
      }

      // Risk 4: Dependency Bottlenecks
      const tasksWithDependencies = programTasks.filter(t => t.dependencies && t.dependencies.length > 0);
      const blockedTasks = tasksWithDependencies.filter(t => {
        const dependencies = programTasks.filter(dep => t.dependencies.includes(dep.id));
        return dependencies.some(dep => !dep.completed);
      });

      if (blockedTasks.length > 2) {
        risks.push({
          programId: program.id,
          programTitle: program.title,
          type: 'dependency_bottleneck',
          severity: 'medium',
          title: 'Dependency Bottleneck',
          description: `${blockedTasks.length} tasks are blocked by incomplete dependencies`,
          impact: 'Schedule',
          recommendation: 'Prioritize completion of blocking tasks or revise task dependencies'
        });
      }

      // Risk 5: Team Overload
      const teamMemberWorkload = {};
      programTasks.forEach(task => {
        if (task.assignee) {
          teamMemberWorkload[task.assignee] = (teamMemberWorkload[task.assignee] || 0) + 1;
        }
      });

      const overloadedMembers = Object.entries(teamMemberWorkload)
        .filter(([_, count]) => count > 8)
        .length;

      if (overloadedMembers > 0) {
        risks.push({
          programId: program.id,
          programTitle: program.title,
          type: 'team_overload',
          severity: 'medium',
          title: 'Team Member Overload',
          description: `${overloadedMembers} team member(s) have more than 8 assigned tasks`,
          impact: 'Quality',
          recommendation: 'Redistribute tasks or add additional resources'
        });
      }
    });

    // Generate AI risk summary
    const riskSummaryPrompt = `Summarize the following project risks and provide strategic recommendations:

Total Risks Identified: ${risks.length}
Critical Issues: ${risks.filter(r => r.severity === 'critical').length}
High Priority: ${risks.filter(r => r.severity === 'high').length}

Risk Categories:
- Budget Overruns: ${risks.filter(r => r.type === 'budget_overrun').length}
- Timeline Issues: ${risks.filter(r => r.type === 'timeline_slippage').length}
- Resource Issues: ${risks.filter(r => r.type === 'resource_shortage' || r.type === 'team_overload').length}
- Dependencies: ${risks.filter(r => r.type === 'dependency_bottleneck').length}

Provide:
1. Overall Risk Assessment
2. Top 3 Priority Actions
3. Estimated Impact if Not Addressed`;

    const riskSummary = await base44.integrations.Core.InvokeLLM({
      prompt: riskSummaryPrompt,
      add_context_from_internet: false
    });

    return Response.json({
      risks: risks.sort((a, b) => {
        const severity = { critical: 3, high: 2, medium: 1 };
        return (severity[b.severity] || 0) - (severity[a.severity] || 0);
      }),
      summary: {
        totalRisks: risks.length,
        critical: risks.filter(r => r.severity === 'critical').length,
        high: risks.filter(r => r.severity === 'high').length,
        medium: risks.filter(r => r.severity === 'medium').length
      },
      riskAssessment: riskSummary
    });
  } catch (error) {
    console.error('Error identifying risks:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});