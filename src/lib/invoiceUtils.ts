import { toast } from "sonner";
import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

// Export PDF logic
export const handleExportPDF = async (invoice: any) => {
  try {
    console.log("Exporting PDF for invoice:", invoice);

    const doc = new jsPDF();
    const blueColor: [number, number, number] = [37, 99, 235];

    // Create rounded logo
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

        const roundedLogo = canvas.toDataURL("image/png");
        try {
          doc.addImage(roundedLogo, "PNG", 90, 10, 30, 20);
        } catch (e) {
          console.error("Failed to add logo to PDF", e);
        }
        generatePDF();
      }
    };

    const generatePDF = () => {
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.text("Brickwork Manager", 105, 38, { align: "center" });

      doc.setFillColor(...blueColor);
      doc.rect(10, 45, 190, 12, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`INVOICE: ${invoice.invoiceNumber}`, 105, 53, { align: "center" });

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      let yPos = 68;
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 15, yPos);
      yPos += 12;

      doc.setTextColor(...blueColor);
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL AMOUNT:", 15, yPos);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      yPos += 7;
      doc.text(`£${invoice.total.toFixed(2)}`, 15, yPos);
      yPos += 12;

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

      doc.save(`${invoice.invoiceNumber}.pdf`);
      toast.success("PDF exported successfully");
    };
  } catch (err) {
    console.error(err);
    toast.error("Failed to export PDF");
  }
};

// Send to Admin logic (already handled in component)
export const handleSendToAdmin = async (invoice: any) => {
  // This is now handled in the NonPlotInvoiceDialog component
  // The invoice is saved to database and marked as 'sent' status
  return Promise.resolve();
};