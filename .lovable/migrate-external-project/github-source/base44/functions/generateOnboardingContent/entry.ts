import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = user.custom_role || 'staff';
    const fullName = user.full_name || 'User';

    const prompt = `Generate a personalized onboarding guide for a new ${role} user named "${fullName}" in a club management application called "ClubRudder".

Provide a JSON response with:
1. A warm personalized greeting
2. Role-specific key features (3-4 main features most relevant to their role)
3. Quick start tasks (3 actionable steps they should take first)
4. AI-driven optimization tips (2-3 tips for getting the most out of the app)
5. Interactive tutorials they should follow (e.g., "Project Tracking 101", "Dashboard Navigation")

Format the response as:
{
  "greeting": "string",
  "roleDescription": "string",
  "keyFeatures": [
    { "name": "string", "description": "string", "icon": "string" }
  ],
  "quickStartTasks": [
    { "title": "string", "description": "string", "actionUrl": "string" }
  ],
  "optimizationTips": [
    { "tip": "string", "reasoning": "string" }
  ],
  "tutorials": [
    { "name": "string", "description": "string", "duration": "string" }
  ]
}`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          greeting: { type: 'string' },
          roleDescription: { type: 'string' },
          keyFeatures: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                icon: { type: 'string' }
              }
            }
          },
          quickStartTasks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                actionUrl: { type: 'string' }
              }
            }
          },
          optimizationTips: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                tip: { type: 'string' },
                reasoning: { type: 'string' }
              }
            }
          },
          tutorials: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                duration: { type: 'string' }
              }
            }
          }
        }
      }
    });

    // Mark user as onboarded
    await base44.auth.updateMe({ onboarding_completed: true });

    return Response.json(response);
  } catch (error) {
    console.error('Error generating onboarding content:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});