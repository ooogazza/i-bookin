import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
  siteName: string;
  invitedBy: string;
  customDomain?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      throw new Error("User is not an admin");
    }

    const { email, siteName, invitedBy, customDomain }: InvitationRequest = await req.json();

    const appUrl = customDomain || "https://i-bookin.com";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>You're Invited to I-Bookin</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 40px 0; text-align: center;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <!-- Header with Logo -->
                  <tr>
                    <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%); border-radius: 8px 8px 0 0;">
                      <img src="${appUrl}/logo.svg" alt="I-Bookin Logo" style="width: 80px; height: 80px; margin-bottom: 20px;" />
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">I-Bookin</h1>
                      <p style="margin: 10px 0 0; color: #E0E7FF; font-size: 16px;">Brickwork Manager</p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 20px; color: #1F2937; font-size: 24px; font-weight: 600;">You've Been Invited!</h2>
                      <p style="margin: 0 0 20px; color: #4B5563; font-size: 16px; line-height: 1.6;">
                        <strong>${invitedBy}</strong> has invited you to join <strong>${siteName}</strong> on I-Bookin.
                      </p>
                      <p style="margin: 0 0 30px; color: #6B7280; font-size: 15px; line-height: 1.6;">
                        I-Bookin is a professional construction payment management system for tracking lifts, managing bookings, and streamlining payments for building projects.
                      </p>
                      
                      <!-- CTA Button -->
                      <table role="presentation" style="margin: 0 auto;">
                        <tr>
                          <td style="border-radius: 6px; background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);">
                            <a href="${appUrl}/auth" target="_blank" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 6px;">
                              Get Started
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 30px 0 0; color: #6B7280; font-size: 14px; line-height: 1.6;">
                        <strong>Important:</strong> Please ensure you sign up using this email address (<strong>${email}</strong>) to access your assigned site.
                      </p>
                      <p style="margin: 10px 0 0; color: #6B7280; font-size: 14px; line-height: 1.6;">
                        If you didn't expect this invitation, you can safely ignore this email.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px 40px; background-color: #F9FAFB; border-radius: 0 0 8px 8px; text-align: center;">
                      <p style="margin: 0; color: #9CA3AF; font-size: 14px;">
                        © ${new Date().getFullYear()} I-Bookin. All rights reserved.
                      </p>
                      <p style="margin: 10px 0 0; color: #9CA3AF; font-size: 12px;">
                        <a href="${appUrl}" style="color: #2563EB; text-decoration: none;">Visit I-Bookin</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    // Send email using Resend API
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "I-Bookin <noreply@i-bookin.uk>",
        to: [email],
        subject: `You've been invited to ${siteName} on I-Bookin`,
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.text();
      console.error("Resend API error:", errorData);
      throw new Error(`Failed to send email: ${errorData}`);
    }

    const emailData = await resendResponse.json();
    console.log("Invitation email sent successfully:", emailData);

    return new Response(JSON.stringify({ success: true, data: emailData }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending invitation email:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
