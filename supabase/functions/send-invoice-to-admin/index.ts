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

// Logo image as base64
const LOGO_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

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

    // Build gang members HTML
    let gangMembersHtml = "";
    if (gangMembers && gangMembers.length > 0) {
      gangMembersHtml = `
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="margin-top: 0; color: #1f2937;">Gang Division</h2>
          ${gangMembers.map(m => `
            <p><strong>${m.name}</strong> (${m.type}): £${m.amount.toFixed(2)}</p>
          `).join('')}
          <p style="margin-top: 10px;"><strong>Total Allocated:</strong> £${gangMembers.reduce((sum, m) => sum + m.amount, 0).toFixed(2)}</p>
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
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="cid:logo" alt="I-Bookin" style="max-width: 200px; height: auto;" />
            </div>
            
            <h1 style="color: #2563EB;">New Invoice Submitted</h1>
            <p>A new invoice has been submitted and requires your attention.</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0; color: #1f2937;">Invoice Details</h2>
              <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
              <p><strong>Booked By:</strong> ${invoiceDetails.bookedBy}</p>
              <p><strong>Total Value:</strong> £${invoiceDetails.totalValue.toFixed(2)}</p>
              <p><strong>Date:</strong> ${new Date(invoiceDetails.createdAt).toLocaleDateString()}</p>
            </div>
            
            ${gangMembersHtml}
            
            <p>The invoice PDF is attached to this email for your review.</p>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              This is an automated message from I-Bookin system.
            </p>
          </div>
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