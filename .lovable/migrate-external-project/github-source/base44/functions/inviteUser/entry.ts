import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin/director access
    const user = await base44.auth.me();
    if (!user || (user.custom_role !== 'admin' && user.custom_role !== 'director')) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { email, redirectUrl } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    // Use Base44 service role to invite the user
    const inviteResponse = await base44.asServiceRole.auth.inviteUser({
      email,
      redirectUrl: 'https://clubrudder.com/register'
    });

    // Send a custom welcome email using Resend
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Club Rudder OS <welcome@clubrudder.com>',
            to: [email],
            subject: 'Welcome to Jaguars Team Management',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #2D5F4F;">Welcome to Jaguars Team Management!</h1>
                <p>You've been invited to join the Jaguars team management platform.</p>
                <p>Click the button below to set up your account and get started:</p>
                <a href="${inviteResponse.inviteUrl}" 
                   style="display: inline-block; background-color: #2D5F4F; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0;">
                  Accept Invitation
                </a>
                <p style="color: #666; font-size: 14px;">
                  If the button doesn't work, copy and paste this link into your browser:<br/>
                  ${inviteResponse.inviteUrl}
                </p>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;" />
                <p style="color: #999; font-size: 12px;">
                  This invitation was sent by ${user.full_name || user.email}
                </p>
              </div>
            `,
          }),
        });
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail the invitation if email fails
      }
    }

    return Response.json({
      success: true,
      message: 'User invitation sent successfully',
      inviteUrl: inviteResponse.inviteUrl
    });

  } catch (error) {
    console.error('Invitation error:', error);
    return Response.json({ 
      error: error.message || 'Failed to invite user' 
    }, { status: 500 });
  }
});