// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';

export default (async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin/director access
    const user = await base44.auth.me();
    if (!user || (user.custom_role !== 'admin' && user.custom_role !== 'director')) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { email } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return Response.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
    }

    // Send invitation email using Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Club Rudder OS <welcome@clubrudder.com>',
        to: [email],
        subject: 'Welcome to Jaguars Team Management Platform',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2D5F4F;">Welcome to Jaguars Team Management!</h1>
            <p>You've been invited to join the Jaguars Team Management Platform.</p>
            <p>To get started, please visit:</p>
            <a href="https://clubrudder.com/register" 
               style="display: inline-block; background-color: #2D5F4F; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0;">
              Sign Up Now
            </a>
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              Sign up with this email address: <strong>${email}</strong>
            </p>
            <p style="color: #666; font-size: 14px;">
              Once you sign up, you'll have access to:
            </p>
            <ul style="color: #666; font-size: 14px;">
              <li>Program management and tracking</li>
              <li>Task assignments and collaboration</li>
              <li>Team messaging and notifications</li>
              <li>Analytics and reporting</li>
            </ul>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;" />
            <p style="color: #999; font-size: 12px;">
              This invitation was sent by ${user.full_name || user.email}
            </p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to send email');
    }

    return Response.json({
      success: true,
      message: 'Invitation sent successfully'
    });

  } catch (error) {
    console.error('Invitation error:', error);
    return Response.json({ 
      error: error.message || 'Failed to send invitation' 
    }, { status: 500 });
  }
});