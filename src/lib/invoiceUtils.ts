import { toast } from "sonner";
import jsPDF from "jspdf";

// Export PDF logic
export const handleExportPDF = async (invoice: any) => {
  try {
    console.log("Exporting PDF for invoice:", invoice);

    const doc = new jsPDF();
    const marginLeft = 20;
    let cursorY = 20;

    // Header
    doc.setFontSize(20);
    doc.text("I-Bookin Invoice", marginLeft, cursorY);
    cursorY += 15;

    doc.setFontSize(12);
    doc.text(`Invoice Number: ${invoice.invoiceNumber}`, marginLeft, cursorY);
    cursorY += 10;
    doc.text(`Total Amount: £${invoice.total.toFixed(2)}`, marginLeft, cursorY);
    cursorY += 10;

    // Notes
    if (invoice.notes) {
      doc.text("Notes:", marginLeft, cursorY);
      cursorY += 7;
      doc.setFontSize(10);
      const splitNotes = doc.splitTextToSize(invoice.notes, 170);
      doc.text(splitNotes, marginLeft, cursorY);
      cursorY += splitNotes.length * 5 + 5;
    }

    // Gang members
    if (invoice.gangMembers && invoice.gangMembers.length > 0) {
      doc.setFontSize(14);
      doc.text("Gang Division", marginLeft, cursorY);
      cursorY += 10;

      doc.setFontSize(10);
      invoice.gangMembers.forEach((member: any) => {
        const line = `${member.name} (${member.type}): £${member.amount.toFixed(2)}`;
        doc.text(line, marginLeft, cursorY);
        cursorY += 7;
      });
    }

    doc.save(`${invoice.invoiceNumber}.pdf`);
    toast.success("PDF exported successfully");
  } catch (err) {
    console.error(err);
    toast.error("Failed to export PDF");
  }
};

// Send to Admin logic
export const handleSendToAdmin = async (invoice: any) => {
  try {
    console.log("Sending invoice to admin:", invoice);
    // TODO: Replace with actual POST to /api/invoices/:id/send-to-admin
    toast.success("Invoice sent to admin");
  } catch (err) {
    console.error(err);
    toast.error("Failed to send invoice");
  }
};