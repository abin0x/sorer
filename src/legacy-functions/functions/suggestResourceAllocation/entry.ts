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

    // Fetch data
    const programs = await base44.entities.Program.list('-created_date', 100);
    const tasks = await base44.entities.Task.list('-created_date', 200);
    const users = await base44.entities.User.list();
    const timeEntries = await base44.entities.TimeEntry.list('-created_date', 1000);

    const program = programs.find(p => p.id === programId);
    if (!program) {
      return Response.json({ error: 'Program not found' }, { status: 404 });
    }

    const programTasks = tasks.filter(t => t.program_id === programId && !t.completed);
    const unassignedTasks = programTasks.filter(t => !t.assignee);

    // Calculate team member utilization
    const teamUtilization = users.map(u => {
      const userTasks = tasks.filter(t => t.assignee === u.email);
      const userTimeEntries = timeEntries.filter(t => t.user_email === u.email);
      const hoursLogged = userTimeEntries.reduce((sum, t) => sum + (t.hours || 0), 0);
      
      return {
        name: u.full_name,
        email: u.email,
        currentTasks: userTasks.length,
        completedTasks: userTasks.filter(t => t.completed).length,
        hoursLogged,
        utilizationRate: (userTasks.length / Math.max(10, userTasks.length + 3) * 100).toFixed(0),
        status: userTasks.length > 10 ? 'overloaded' : userTasks.length > 5 ? 'busy' : userTasks.length > 0 ? 'available' : 'underutilized'
      };
    });

    // Suggest optimal assignments for unassigned tasks
    const suggestions = unassignedTasks.map(task => {
      // Find best match based on availability and workload
      const availableMembers = teamUtilization
        .filter(m => m.status !== 'overloaded')
        .sort((a, b) => parseInt(a.utilizationRate) - parseInt(b.utilizationRate));

      const recommended = availableMembers[0];

      return {
        taskId: task.id,
        taskTitle: task.title,
        taskPriority: task.priority || 'medium',
        currentAssignee: task.assignee || 'Unassigned',
        suggestedAssignee: recommended?.name || 'No available resources',
        suggestedEmail: recommended?.email,
        recommendation: recommended 
          ? `${recommended.name} has ${recommended.utilizationRate}% utilization - Good fit for this task`
          : 'All team members are at capacity - consider resource augmentation',
        confidence: recommended ? 'high' : 'low'
      };
    });

    // Generate workload balance visualization data
    const workloadData = teamUtilization
      .filter(m => m.currentTasks > 0 || m.hoursLogged > 0)
      .map(m => ({
        name: m.name,
        tasks: m.currentTasks,
        completed: m.completedTasks,
        hours: parseFloat(m.hoursLogged.toFixed(1)),
        utilization: parseInt(m.utilizationRate),
        status: m.status
      }));

    // Generate AI recommendations
    const resourcePrompt = `Provide resource allocation recommendations based on current team utilization:

Unassigned Tasks: ${unassignedTasks.length}
Team Members: ${users.length}

Team Utilization:
${teamUtilization.map(m => `- ${m.name}: ${m.currentTasks} tasks (${m.utilizationRate}% utilization, ${m.status})`).join('\n')}

Provide:
1. Current Resource Balance Assessment
2. Recommended Allocation Strategy
3. Potential Hiring/Resource Needs
4. Efficiency Improvements`;

    const recommendations = await base44.integrations.Core.InvokeLLM({
      prompt: resourcePrompt,
      add_context_from_internet: false
    });

    return Response.json({
      programId,
      programTitle: program.title,
      unassignedTasks: unassignedTasks.length,
      suggestions: suggestions.sort((a, b) => a.confidence === 'high' ? -1 : 1),
      teamUtilization: teamUtilization.sort((a, b) => parseInt(b.utilizationRate) - parseInt(a.utilizationRate)),
      workloadData,
      overloadedMembers: teamUtilization.filter(m => m.status === 'overloaded'),
      underutilizedMembers: teamUtilization.filter(m => m.status === 'underutilized'),
      recommendations
    });
  } catch (error) {
    console.error('Error suggesting allocation:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});