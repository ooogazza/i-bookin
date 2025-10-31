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

// Helper to load external image as data URL
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
    img.onerror = (err) => {
      console.error("Failed to load image:", url, err);
      reject(err);
    };
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

// Generate PDF with ORIGINAL centered layout (no letterhead)
const generateOriginalPDFContent = (doc: jsPDF, invoice: any, userName: string | undefined, roundedLogo: string) => {
  const blueColor: [number, number, number] = [37, 99, 235];
  
  // Add centered logo
  try {
    doc.addImage(roundedLogo, "PNG", 90, 10, 30, 20);
  } catch (e) {
    console.error("Failed to add logo to PDF", e);
  }

  // Company name centered
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text("Brickwork Manager", 105, 38, { align: "center" });

  // Blue header bar with invoice number - CENTERED
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

// Generate PDF with NEW left-aligned layout (with letterhead)
const generateLetterheadPDFContent = (doc: jsPDF, invoice: any, userName: string | undefined, roundedLogo: string, letterheadDataUrl: string) => {
  const blueColor: [number, number, number] = [37, 99, 235];
  
  // Add letterhead as full-page background
  try {
    console.log("Adding letterhead to PDF as background");
    doc.addImage(letterheadDataUrl, "PNG", 0, 0, 210, 297);
  } catch (e) {
    console.error("Failed to add letterhead to PDF", e);
  }

  // Position content on LEFT side
  const leftMargin = 15;
  const contentWidth = 120; // Width for text wrapping
  const startY = 70; // Lower start to leave space for letterhead at top

  // Blue header bar - compact, only around text
  doc.setFillColor(...blueColor);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  const invoiceText = `INVOICE: ${invoice.invoiceNumber}`;
  const textWidth = doc.getTextWidth(invoiceText);
  doc.rect(leftMargin, startY, textWidth + 10, 10, "F");
  doc.text(invoiceText, leftMargin + 5, startY + 7);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  let yPos = startY + 18;

  if (userName) {
    doc.text(`Booked by: ${userName}`, leftMargin, yPos);
    yPos += 7;
  }

  doc.text(`Date: ${new Date().toLocaleDateString()}`, leftMargin, yPos);
  yPos += 12;

  doc.setTextColor(...blueColor);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL AMOUNT:", leftMargin, yPos);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  yPos += 7;
  doc.text(`£${invoice.total.toFixed(2)}`, leftMargin, yPos);
  yPos += 12;

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
        try {
          console.log("Adding letterhead to new page");
          doc.addImage(letterheadDataUrl, "PNG", 0, 0, 210, 297);
        } catch (e) {
          console.error("Failed to add letterhead to new page", e);
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

  // Add logo at BOTTOM LEFT
  try {
    doc.addImage(roundedLogo, "PNG", leftMargin, 270, 20, 13);
  } catch (e) {
    console.error("Failed to add logo to bottom", e);
  }
};

// Export PDF logic
export const handleExportPDF = async (invoice: any, userName?: string) => {
  try {
    console.log("Exporting PDF for invoice:", invoice);

    const doc = new jsPDF();
    
    // Fetch active letterhead
    const letterhead = await getActiveLetterhead();
    console.log("Letterhead detected:", letterhead ? "YES" : "NO", letterhead);
    
    // Create rounded logo
    const roundedLogo = await createRoundedLogo();

    // Use appropriate layout based on letterhead presence
    if (letterhead) {
      console.log("Loading letterhead image from:", letterhead.file_url);
      // Load letterhead image as data URL
      const letterheadDataUrl = await loadImageAsDataUrl(letterhead.file_url);
      console.log("Letterhead loaded successfully, generating PDF with letterhead layout");
      generateLetterheadPDFContent(doc, invoice, userName, roundedLogo, letterheadDataUrl);
    } else {
      console.log("Using ORIGINAL centered layout (no letterhead)");
      generateOriginalPDFContent(doc, invoice, userName, roundedLogo);
    }

    // Force direct download to device storage
    const pdfBlob = doc.output('blob');
    const downloadUrl = window.URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${invoice.invoiceNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    
    toast.success("PDF exported successfully");
  } catch (err) {
    console.error("PDF export error:", err);
    toast.error("Failed to export PDF");
  }
};

// Send to Admin logic
export const handleSendToAdmin = async (invoice: any, userName: string) => {
  try {
    const doc = new jsPDF();

    const letterhead = await getActiveLetterhead();
    console.log("Letterhead detected for email:", letterhead ? "YES" : "NO");

    const roundedLogo = await createRoundedLogo();

    // Use appropriate layout based on letterhead presence
    if (letterhead) {
      console.log("Loading letterhead for email from:", letterhead.file_url);
      const letterheadDataUrl = await loadImageAsDataUrl(letterhead.file_url);
      console.log("Letterhead loaded for email, generating PDF with letterhead layout");
      generateLetterheadPDFContent(doc, invoice, userName, roundedLogo, letterheadDataUrl);
    } else {
      console.log("Using ORIGINAL centered layout for email (no letterhead)");
      generateOriginalPDFContent(doc, invoice, userName, roundedLogo);
    }

const pdfBase64 = doc.output("dataurlstring").split(",")[1];

// Get current user's email for CC
const { data: userData } = await supabase.auth.getUser();
const bookedByEmail = userData?.user?.email || "";

const { error } = await supabase.functions.invoke("send-invoice-to-admin", {
  body: {
    invoiceNumber: invoice.invoiceNumber,
    pdfBase64,
    invoiceDetails: {
      bookedBy: userName,
      bookedByEmail,
      totalValue: invoice.total,
      createdAt: new Date().toISOString(),
    },
    gangMembers: (invoice.gangMembers || []).map((m: any) => ({
      name: m.name,
      type: m.type,
      amount: m.amount,
      email: m.email || null,
    })),
  },
});

    if (error) throw error;

    return { success: true };
  } catch (err) {
    console.error("Error sending to admin:", err);
    throw err;
  }
};
