import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface GangMember {
  name: string;
  type: string;
  amount: number;
  email?: string;
}

interface SendInvoiceRequest {
  invoiceNumber: string;
  pdfBase64: string;
  invoiceDetails: {
    bookedBy: string;
    bookedByEmail: string;
    totalValue: number;
    createdAt: string;
  };
  gangMembers: GangMember[];
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { invoiceNumber, pdfBase64, invoiceDetails, gangMembers }: SendInvoiceRequest = await req.json();

    console.log(`Processing invoice email: ${invoiceNumber}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all admin users
    const { data: adminUsers, error: adminError } = await supabase
      .from("user_roles")
      .select(`
        user_id,
        profiles!inner (
          email,
          full_name
        )
      `)
      .eq("role", "admin");

    if (adminError) {
      console.error("Error fetching admin users:", adminError);
      throw adminError;
    }

    if (!adminUsers || adminUsers.length === 0) {
      console.log("No admin users found");
      return new Response(
        JSON.stringify({ error: "No admin users found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Found ${adminUsers.length} admin user(s)`);

    // Extract admin emails
    const adminEmails = adminUsers
      .map((user: any) => user.profiles?.email)
      .filter(Boolean);

    if (adminEmails.length === 0) {
      return new Response(
        JSON.stringify({ error: "No admin emails found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Collect gang member emails
    const gangMemberEmails = (gangMembers || [])
      .map(m => m.email)
      .filter(Boolean) as string[];

    // Collect all recipient emails (admin + gang members + booked by user)
    const allRecipients = [...adminEmails];
    if (gangMemberEmails.length > 0) {
      allRecipients.push(...gangMemberEmails);
    }
    if (invoiceDetails.bookedByEmail) {
      allRecipients.push(invoiceDetails.bookedByEmail);
    }

    // Remove duplicates
    const uniqueRecipients = [...new Set(allRecipients)];

    console.log(`Sending email to ${uniqueRecipients.length} recipient(s): ${uniqueRecipients.join(', ')}`);

    const appUrl = "https://i-bookin.com";

    // Build gang members HTML
    let gangMembersHtml = "";
    if (gangMembers && gangMembers.length > 0) {
      gangMembersHtml = `
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="margin-top: 0; color: #1f2937;">Gang Division</h2>
          ${gangMembers.map(m => `
            <p style="margin: 8px 0;"><strong>${m.name}</strong> (${m.type}): £${m.amount.toFixed(2)}</p>
          `).join('')}
          <p style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #d1d5db;"><strong>Total Allocated:</strong> £${gangMembers.reduce((sum, m) => sum + m.amount, 0).toFixed(2)}</p>
        </div>
      `;
    }

    // Send email using Resend API
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "I-Bookin <noreply@i-bookin.uk>",
        to: uniqueRecipients,
        subject: `New Invoice Submitted: ${invoiceNumber}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>New Invoice: ${invoiceNumber}</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 40px 0; text-align: center;">
                    <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                      <!-- Header with Logo -->
                      <tr>
                        <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%); border-radius: 8px 8px 0 0;">
                          <img src="${appUrl}/apple-touch-icon.png" alt="I-Bookin Logo" style="width: 80px; height: 80px; margin-bottom: 10px;" />
                          <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">New Invoice Submitted</h1>
                        </td>
                      </tr>
                      
                      <!-- Content -->
                      <tr>
                        <td style="padding: 40px;">
                          <p style="margin: 0 0 25px; color: #4B5563; font-size: 16px; line-height: 1.6;">
                            A new invoice has been submitted and requires your attention.
                          </p>
                          
                          <div style="background-color: #EFF6FF; padding: 25px; border-radius: 8px; border-left: 4px solid #2563EB; margin: 20px 0;">
                            <h2 style="margin: 0 0 15px; color: #1F2937; font-size: 18px; font-weight: 600;">Invoice Details</h2>
                            <table style="width: 100%; border-collapse: collapse;">
                              <tr>
                                <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Invoice Number:</td>
                                <td style="padding: 8px 0; color: #1F2937; font-weight: 600; text-align: right;">${invoiceNumber}</td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Booked By:</td>
                                <td style="padding: 8px 0; color: #1F2937; font-weight: 600; text-align: right;">${invoiceDetails.bookedBy}</td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Total Value:</td>
                                <td style="padding: 8px 0; color: #10B981; font-weight: 700; font-size: 18px; text-align: right;">£${invoiceDetails.totalValue.toFixed(2)}</td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Date:</td>
                                <td style="padding: 8px 0; color: #1F2937; font-weight: 600; text-align: right;">${new Date(invoiceDetails.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
                              </tr>
                            </table>
                          </div>
                          
                          ${gangMembersHtml}
                          
                          <div style="margin: 30px 0; padding: 20px; background-color: #F9FAFB; border-radius: 8px; text-align: center;">
                            <p style="margin: 0 0 10px; color: #4B5563; font-size: 15px;">
                              📎 The invoice PDF is attached to this email for your review.
                            </p>
                          </div>
                          
                          <table role="presentation" style="margin: 30px auto 0;">
                            <tr>
                              <td style="border-radius: 6px; background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);">
                                <a href="${appUrl}/booking-in" target="_blank" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 6px;">
                                  View in Dashboard
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <!-- Footer -->
                      <tr>
                        <td style="padding: 30px 40px; background-color: #F9FAFB; border-radius: 0 0 8px 8px; text-align: center;">
                          <p style="margin: 0; color: #9CA3AF; font-size: 13px;">
                            This is an automated message from the I-Bookin system.
                          </p>
                          <p style="margin: 15px 0 0; color: #9CA3AF; font-size: 14px;">
                            © ${new Date().getFullYear()} I-Bookin. All rights reserved.
                          </p>
                          <p style="margin: 10px 0 0;">
                            <a href="${appUrl}" style="color: #2563EB; text-decoration: none; font-size: 13px;">Visit I-Bookin</a>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
          </html>
        `,
        attachments: [
          {
            filename: `${invoiceNumber}.pdf`,
            content: pdfBase64,
          },
        ],
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.text();
      console.error("Resend API error:", errorData);
      throw new Error(`Failed to send email: ${errorData}`);
    }

    const emailData = await resendResponse.json();
    console.log("Email sent successfully:", emailData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent: uniqueRecipients.length,
        messageId: emailData.id 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-invoice-to-admin function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);