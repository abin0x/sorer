import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { programTitle, programDescription, complexity = 'medium' } = await req.json();

    if (!programTitle) {
      return Response.json({ error: 'Program title is required' }, { status: 400 });
    }

    const prompt = `You are a project management expert. Analyze the following program and generate a detailed breakdown of tasks:

Program: ${programTitle}
Description: ${programDescription || 'N/A'}
Complexity: ${complexity}

Generate realistic, actionable tasks for this program. For each task, provide:
- A clear title
- A description
- Estimated category (e.g., Planning, Marketing, Registration, Execution, Review)
- Estimated days from program start (0-7 for planning, 7-30 for execution, 30+ for review)
- Suggested priority (low, medium, high)

Return ONLY a valid JSON array with this structure:
[
  {
    "title": "Task name",
    "description": "Task description",
    "category": "Category",
    "days_offset": 5,
    "priority": "medium"
  }
]

Generate 8-12 realistic tasks.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            days_offset: { type: 'number' },
            priority: { type: 'string' }
          }
        }
      }
    });

    return Response.json({ tasks: response });
  } catch (error) {
    console.error('Error generating tasks:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});