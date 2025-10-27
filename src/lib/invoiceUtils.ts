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

// Helper to create rounded logo
const createRoundedLogo = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = logo;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const width = 200;
      const height = 133;
      const radius = 15;

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

// Helper to generate PDF content with letterhead
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

  // Position content on LEFT side with space at TOP and RIGHT for letterhead
  const leftMargin = 15;
  const contentWidth = 120; // Narrower to leave right space
  const startY = 50; // Start lower to leave top space

  // Add logo on top left
  try {
    doc.addImage(roundedLogo, "PNG", leftMargin, 10, 25, 17);
  } catch (e) {
    console.error("Failed to add logo to PDF", e);
  }

  // Add company name below logo
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Brickwork Manager", leftMargin, 32);

  // Blue header bar with invoice number - LEFT aligned
  doc.setFillColor(...blueColor);
  doc.rect(leftMargin, startY, contentWidth, 12, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`INVOICE: ${invoice.invoiceNumber}`, leftMargin + 5, startY + 8);

  // Reset text color for body
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  let yPos = startY + 20;

  // User name
  if (userName) {
    doc.text(`Booked by: ${userName}`, leftMargin, yPos);
    yPos += 7;
  }

  // Date
  doc.text(`Date: ${new Date().toLocaleDateString()}`, leftMargin, yPos);
  yPos += 12;

  // Total amount
  doc.setTextColor(...blueColor);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL AMOUNT:", leftMargin, yPos);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  yPos += 7;
  doc.text(`£${invoice.total.toFixed(2)}`, leftMargin, yPos);
  yPos += 12;

  // Notes section
  if (invoice.notes) {
    doc.setTextColor(...blueColor);
    doc.setFont("helvetica", "bold");
    doc.text("NOTES:", leftMargin, yPos);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    yPos += 7;
    const noteLines = doc.splitTextToSize(invoice.notes, contentWidth - 10);
    doc.text(noteLines, leftMargin, yPos);
    yPos += noteLines.length * 6 + 6;
  }

  // Gang division section
  if (invoice.gangMembers && invoice.gangMembers.length > 0) {
    doc.setTextColor(...blueColor);
    doc.setFont("helvetica", "bold");
    doc.text("GANG DIVISION:", leftMargin, yPos);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    yPos += 7;

    invoice.gangMembers.forEach((member: any) => {
      if (yPos > 270) {
        doc.addPage();
        // Add letterhead to new page if exists
        if (letterhead && letterhead.file_type === "image/png") {
          try {
            doc.addImage(letterhead.file_url, "PNG", 0, 0, 210, 297);
          } catch (e) {
            console.error("Failed to add letterhead to new page", e);
          }
        }
        yPos = 20;
      }
      const memberLine = doc.splitTextToSize(
        `${member.name} (${member.type}): £${member.amount.toFixed(2)}`, 
        contentWidth - 10
      );
      doc.text(memberLine, leftMargin, yPos);
      yPos += memberLine.length * 6;
    });

    yPos += 4;
    doc.setFont("helvetica", "bold");
    const total = invoice.gangMembers.reduce((sum: number, m: any) => sum + m.amount, 0);
    doc.text(`Total Allocated: £${total.toFixed(2)}`, leftMargin, yPos);
  }
};

// Export PDF logic
export const handleExportPDF = async (invoice: any, userName?: string) => {
  try {
    console.log("Exporting PDF for invoice:", invoice);

    const doc = new jsPDF();
    
    // Fetch active letterhead
    const letterhead = await getActiveLetterhead();
    console.log("Letterhead fetched:", letterhead);
    
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
    console.log("Letterhead fetched for email:", letterhead);

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
