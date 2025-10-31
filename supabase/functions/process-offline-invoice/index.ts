import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type GangMember = {
  name: string;
  type?: string;
  amount?: number;
  email?: string | null;
};

interface OfflineInvoiceRequest {
  invoiceNumber: string;
  invoiceDetails: {
    bookedBy: string;
    bookedByEmail?: string;
    totalValue: number;
    createdAt?: string;
    notes?: string | null;
  };
  userId?: string | null;
  imageUrl?: string | null;
  gangMembers: GangMember[];
  // Optional: raw payload for forwarding to email function
  pdfBase64?: string;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as OfflineInvoiceRequest;

    if (!body?.invoiceNumber || !body?.invoiceDetails || !Array.isArray(body.gangMembers)) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // 1) Upsert non-plot invoice into DB
    const { invoiceNumber, invoiceDetails, userId, imageUrl, gangMembers } = body;

    // Insert invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from("non_plot_invoices")
      .insert({
        invoice_number: invoiceNumber,
        user_id: userId ?? null,
        total_amount: invoiceDetails.totalValue,
        notes: invoiceDetails.notes ?? null,
        image_url: imageUrl ?? null,
        status: "sent",
      })
      .select()
      .maybeSingle();

    if (invoiceError || !invoice) {
      console.error("Failed to insert invoice:", invoiceError);
      return new Response(JSON.stringify({ error: "Failed to insert invoice" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Insert gang divisions
    if (gangMembers?.length) {
      const divisions = gangMembers.map((m) => ({
        invoice_id: invoice.id,
        member_name: m.name,
        member_type: m.type ?? null,
        email: m.email ?? null,
        amount: m.amount ?? 0,
      }));

      const { error: divisionsError } = await supabase
        .from("non_plot_gang_divisions")
        .insert(divisions);

      if (divisionsError) {
        console.error("Failed to insert gang divisions:", divisionsError);
        // We won't fail the whole request; just log it.
      }
    }

    // 2) Forward to existing email function so recipients/format stay identical
    try {
      const { error: emailError } = await supabase.functions.invoke("send-invoice-to-admin", {
        body,
      });
      if (emailError) {
        console.error("send-invoice-to-admin failed:", emailError);
      }
    } catch (err) {
      console.error("Error invoking send-invoice-to-admin:", err);
    }

    return new Response(
      JSON.stringify({ success: true, invoice_id: invoice.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err) {
    console.error("process-offline-invoice error:", err);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});