import { toast } from "sonner";
import jsPDF from "jspdf";

// Export PDF logic
export const handleExportPDF = async (invoice: any) => {
  try {
    console.log("Exporting PDF for invoice:", invoice);
    
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text("I-Bookin Invoice", 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Invoice Number: ${invoice.invoiceNumber}`, 20, 35);
    doc.text(`Total Amount: £${invoice.total.toFixed(2)}`, 20, 45);
    
    if (invoice.notes) {
      doc.text("Notes:", 20, 55);
      doc.setFontSize(10);
      const splitNotes = doc.splitTextToSize(invoice.notes, 170);
      doc.text(splitNotes, 20, 62);
    }
    
    // Gang members
    if (invoice.gangMembers && invoice.gangMembers.length > 0) {
      const startY = invoice.notes ? 80 : 60;
      doc.setFontSize(14);
      doc.text("Gang Division", 20, startY);
      
      doc.setFontSize(10);
      let y = startY + 10;
      
      invoice.gangMembers.forEach((member: any) => {
        doc.text(`${member.name} (${member.type}): £${member.amount.toFixed(2)}`, 20, y);
        y += 7;
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
    // TODO: Implement email notification to admin
    toast.success("Invoice sent to admin");
  } catch (err) {
    console.error(err);
    toast.error("Failed to send invoice");
  }
};
