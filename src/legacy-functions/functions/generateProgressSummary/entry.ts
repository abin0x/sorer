// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';

export default (async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { programId } = await req.json();

    if (!programId) {
      return Response.json({ error: 'Program ID is required' }, { status: 400 });
    }

    // Fetch program and related data
    const program = await base44.entities.Program.filter({ id: programId }, '', 1);
    if (!program || program.length === 0) {
      return Response.json({ error: 'Program not found' }, { status: 404 });
    }

    const programData = program[0];
    const tasks = await base44.entities.Task.filter({ program_id: programId });
    const expenses = await base44.entities.Expense.filter({ program_id: programId });
    const timeEntries = await base44.entities.TimeEntry.filter({ program_id: programId });

    const completedTasks = tasks.filter(t => t.completed).length;
    const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalHours = timeEntries.reduce((sum, t) => sum + (t.hours || 0), 0);

    const prompt = `Generate a concise project status summary for a team management program:

Program: ${programData.title}
Status: ${programData.status}
Progress: ${completionTasks}/${tasks.length} tasks completed (${completionRate}%)
Total Expenses: $${totalExpenses.toFixed(2)}
Total Hours Logged: ${totalHours}
Days Until Due: ${Math.max(0, Math.ceil((new Date(programData.due_date) - new Date()) / (1000 * 60 * 60 * 24)))}

Provide a brief, actionable summary including:
1. Overall status assessment
2. Key achievements
3. Top 2-3 risks or concerns
4. Recommended next steps

Keep it concise and professional.`;

    const summary = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false
    });

    return Response.json({
      summary,
      stats: {
        completionRate,
        completedTasks,
        totalTasks: tasks.length,
        totalExpenses,
        totalHours,
        daysUntilDue: Math.max(0, Math.ceil((new Date(programData.due_date) - new Date()) / (1000 * 60 * 60 * 24)))
      }
    });
  } catch (error) {
    console.error('Error generating summary:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});