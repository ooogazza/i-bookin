import { toast } from "sonner";
import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

// Helper to fetch active letterhead
const getActiveLetterhead = async () => {
  try {
    const { data, error } = await supabase
      .from("letterhead_settings")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("Error fetching letterhead:", err);
    return null;
  }
};

// Helper to load image as data URL
const loadImageAsDataUrl = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } else {
        reject(new Error("Failed to get canvas context"));
      }
    };
    img.onerror = reject;
    img.src = url;
  });
};

// Helper to create rounded logo
const createRoundedLogo = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = logo;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const width = 300;
      const height = 200;
      const radius = 20;

      canvas.width = width;
      canvas.height = height;

      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(radius, 0);
        ctx.lineTo(width - radius, 0);
        ctx.quadraticCurveTo(width, 0, width, radius);
        ctx.lineTo(width, height - radius);
        ctx.quadraticCurveTo(width, height, width - radius, height);
        ctx.lineTo(radius, height);
        ctx.quadraticCurveTo(0, height, 0, height - radius);
        ctx.lineTo(0, radius);
        ctx.quadraticCurveTo(0, 0, radius, 0);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL("image/png"));
      } else {
        reject(new Error("Failed to create rounded logo"));
      }
    };
    img.onerror = reject;
  });
};

// Helper to generate PDF content
const generatePDFContent = (doc: jsPDF, invoice: any, userName: string | undefined, roundedLogo: string, letterhead: any) => {
  const blueColor: [number, number, number] = [37, 99, 235];
  
  // If letterhead exists and is PNG, add as background
  if (letterhead && letterhead.file_type === "image/png") {
    try {
      // Add letterhead as full-page background
      doc.addImage(letterhead.file_url, "PNG", 0, 0, 210, 297);
    } catch (e) {
      console.error("Failed to add letterhead to PDF", e);
    }
  }

  // Add logo on top of letterhead
  try {
    doc.addImage(roundedLogo, "PNG", 90, 10, 30, 20);
  } catch (e) {
    console.error("Failed to add logo to PDF", e);
  }

  // Add invoice content with white/semi-transparent backgrounds for readability
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text("Brickwork Manager", 105, 38, { align: "center" });

  // Blue header bar with invoice number
  doc.setFillColor(...blueColor);
  doc.rect(10, 45, 190, 12, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`INVOICE: ${invoice.invoiceNumber}`, 105, 53, { align: "center" });

  // Reset text color for body
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  let yPos = 68;

  // User name
  if (userName) {
    doc.text(`Booked by: ${userName}`, 15, yPos);
    yPos += 7;
  }

  // Date
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 15, yPos);
  yPos += 12;

  // Total amount
  doc.setTextColor(...blueColor);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL AMOUNT:", 15, yPos);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  yPos += 7;
  doc.text(`£${invoice.total.toFixed(2)}`, 15, yPos);
  yPos += 12;

  // Notes section
  if (invoice.notes) {
    doc.setTextColor(...blueColor);
    doc.setFont("helvetica", "bold");
    doc.text("NOTES:", 15, yPos);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    yPos += 7;
    const noteLines = doc.splitTextToSize(invoice.notes, 180);
    doc.text(noteLines, 15, yPos);
    yPos += noteLines.length * 6 + 6;
  }

  // Gang division section
  if (invoice.gangMembers && invoice.gangMembers.length > 0) {
    doc.setTextColor(...blueColor);
    doc.setFont("helvetica", "bold");
    doc.text("GANG DIVISION:", 15, yPos);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    yPos += 7;

    invoice.gangMembers.forEach((member: any) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(`${member.name} (${member.type}): £${member.amount.toFixed(2)}`, 15, yPos);
      yPos += 6;
    });

    yPos += 4;
    doc.setFont("helvetica", "bold");
    const total = invoice.gangMembers.reduce((sum: number, m: any) => sum + m.amount, 0);
    doc.text(`Total Allocated: £${total.toFixed(2)}`, 15, yPos);
  }
};

// Export PDF logic
export const handleExportPDF = async (invoice: any, userName?: string) => {
  try {
    console.log("Exporting PDF for invoice:", invoice);

    const doc = new jsPDF();
    
    // Fetch active letterhead
    const letterhead = await getActiveLetterhead();
    
    // Create rounded logo
    const roundedLogo = await createRoundedLogo();

    // Generate PDF with letterhead
    generatePDFContent(doc, invoice, userName, roundedLogo, letterhead);

    doc.save(`${invoice.invoiceNumber}.pdf`);
    toast.success("PDF exported successfully");
  } catch (err) {
    console.error(err);
    toast.error("Failed to export PDF");
  }
};

// Send to Admin logic - generates PDF and emails it to admins
export const handleSendToAdmin = async (invoice: any, userName: string) => {
  try {
    const doc = new jsPDF();

    // Fetch active letterhead
    const letterhead = await getActiveLetterhead();

    // Create rounded logo
    const roundedLogo = await createRoundedLogo();

    // Generate PDF with letterhead
    generatePDFContent(doc, invoice, userName, roundedLogo, letterhead);

    // Convert PDF to base64
    const pdfBase64 = doc.output("dataurlstring").split(",")[1];

    // Send to edge function
    const { error } = await supabase.functions.invoke("send-invoice-to-admin", {
      body: {
        invoiceNumber: invoice.invoiceNumber,
        pdfBase64,
        invoiceDetails: {
          bookedBy: userName,
          totalValue: invoice.total,
          createdAt: new Date().toISOString(),
        },
      },
    });

    if (error) throw error;

    return { success: true };
  } catch (err) {
    console.error("Error sending to admin:", err);
    throw err;
  }
};
