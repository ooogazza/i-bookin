import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { FileText, Printer, Trash2 } from "lucide-react";
import { maskEmail } from "@/lib/emailUtils";
import jsPDF from "jspdf";

interface BookingData {
  id: string;
  percentage: number;
  booked_value: number;
  invoice_number: string;
  status: string;
  created_at: string;
  notes: string | null;
  profiles: {
    full_name: string;
    email: string;
  };
  plots: {
    plot_number: number;
    house_types: {
      name: string;
      sites: {
        name: string;
      };
    };
  };
  lift_values: {
    lift_type: string;
  };
  gang_divisions: {
    member_name: string;
    member_type: string;
    amount: number;
  }[];
}

interface GroupedInvoice {
  invoice_number: string;
  created_at: string;
  booked_by: {
    full_name: string;
    email: string;
  };
  items: BookingData[];
  total_value: number;
  notes: string | null;
  is_viewed?: boolean;
  is_confirmed?: boolean;
}

interface UserInvoices {
  user_id: string;
  full_name: string;
  email: string;
  invoices: GroupedInvoice[];
  total_value: number;
}

const LIFT_LABELS = {
  lift_1: "Lift 1",
  lift_2: "Lift 2",
  lift_3: "Lift 3",
  lift_4: "Lift 4",
  lift_5: "Lift 5",
  lift_6: "Lift 6",
  cut_ups: "Cut Ups",
  snag: "Snag",
};

const BookingIn = () => {
  const { user, isAdmin } = useAuth();
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [groupedInvoices, setGroupedInvoices] = useState<GroupedInvoice[]>([]);
  const [userInvoices, setUserInvoices] = useState<UserInvoices[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserInvoices | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<GroupedInvoice | null>(null);
  const [userInvoicesDialogOpen, setUserInvoicesDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [unviewedCount, setUnviewedCount] = useState(0);

  useEffect(() => {
    fetchBookings();
  }, [user, isAdmin]);

  const fetchBookings = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from("bookings")
        .select(`
          *,
          notes,
          confirmed_by_admin,
          profiles!bookings_booked_by_fkey (
            full_name,
            email
          ),
          plots (
            plot_number,
            house_types (
              name,
              sites (
                name
              )
            )
          ),
          lift_values (
            lift_type
          ),
          gang_divisions (
            member_name,
            member_type,
            amount
          )
        `)
        .eq("status", "confirmed")
        .order("created_at", { ascending: false });

      // Filter by user if not admin
      if (!isAdmin) {
        query = query.eq("booked_by", user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setBookings(data as any || []);
      
      // Group bookings by invoice number
      const grouped = (data as any || []).reduce((acc: { [key: string]: GroupedInvoice }, booking: any) => {
        if (!acc[booking.invoice_number]) {
          acc[booking.invoice_number] = {
            invoice_number: booking.invoice_number,
            created_at: booking.created_at,
            booked_by: booking.profiles,
            items: [],
            total_value: 0,
            notes: booking.notes,
            is_confirmed: booking.confirmed_by_admin || false
          };
        }
        // Update is_confirmed if any booking in the invoice is confirmed
        if (booking.confirmed_by_admin) {
          acc[booking.invoice_number].is_confirmed = true;
        }
        acc[booking.invoice_number].items.push(booking);
        acc[booking.invoice_number].total_value += booking.booked_value;
        return acc;
      }, {});
      
      const invoices = Object.values(grouped) as GroupedInvoice[];
      
      // Fetch viewed status for admin
      if (isAdmin) {
        const { data: viewData, error: viewError } = await supabase
          .from("invoice_views")
          .select("invoice_number")
          .eq("viewed_by", user.id);
        
        if (!viewError) {
          const viewedInvoices = new Set(viewData?.map(v => v.invoice_number) || []);
          invoices.forEach((invoice: GroupedInvoice) => {
            invoice.is_viewed = viewedInvoices.has(invoice.invoice_number);
          });
          setUnviewedCount(invoices.filter((inv: GroupedInvoice) => !inv.is_viewed).length);
        }
      }
      
      setGroupedInvoices(invoices);

      // Group invoices by user for admin view
      if (isAdmin) {
        const userGroups = invoices.reduce((acc: { [key: string]: UserInvoices }, invoice: GroupedInvoice) => {
          const userEmail = invoice.booked_by.email;
          if (!acc[userEmail]) {
            acc[userEmail] = {
              user_id: userEmail,
              full_name: invoice.booked_by.full_name,
              email: invoice.booked_by.email,
              invoices: [],
              total_value: 0
            };
          }
          acc[userEmail].invoices.push(invoice);
          acc[userEmail].total_value += invoice.total_value;
          return acc;
        }, {});
        
        setUserInvoices(Object.values(userGroups));
      }
    } catch (error: any) {
      toast.error("Failed to load bookings");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewUserInvoices = (userGroup: UserInvoices) => {
    setSelectedUser(userGroup);
    setUserInvoicesDialogOpen(true);
  };

  const handleViewDetails = async (invoice: GroupedInvoice) => {
    setSelectedInvoice(invoice);
    setDetailsDialogOpen(true);
    
    // Mark as viewed for admins
    if (isAdmin && !invoice.is_viewed) {
      try {
        await supabase
          .from("invoice_views")
          .insert({
            invoice_number: invoice.invoice_number,
            viewed_by: user!.id
          });
        
        // Update local state
        setGroupedInvoices((prev: GroupedInvoice[]) => 
          prev.map((inv: GroupedInvoice) => 
            inv.invoice_number === invoice.invoice_number 
              ? { ...inv, is_viewed: true } as GroupedInvoice
              : inv
          )
        );
        
        // Update userInvoices state
        setUserInvoices((prev: UserInvoices[]) => 
          prev.map((user: UserInvoices) => ({
            ...user,
            invoices: user.invoices.map((inv: GroupedInvoice) => 
              inv.invoice_number === invoice.invoice_number 
                ? { ...inv, is_viewed: true } as GroupedInvoice
                : inv
            )
          }))
        );
        
        setUnviewedCount(prev => Math.max(0, prev - 1));
      } catch (error: any) {
        console.error("Error marking invoice as viewed:", error);
      }
    }
  };

  const handleConfirmInvoice = async (invoice: GroupedInvoice) => {
    if (!isAdmin) return;

    try {
      // Update all bookings in this invoice
      const { error } = await supabase
        .from("bookings")
        .update({ confirmed_by_admin: true })
        .eq("invoice_number", invoice.invoice_number);

      if (error) throw error;

      // Update local state
      setGroupedInvoices((prev: GroupedInvoice[]) => 
        prev.map((inv: GroupedInvoice) => 
          inv.invoice_number === invoice.invoice_number 
            ? { ...inv, is_confirmed: true } as GroupedInvoice
            : inv
        )
      );

      // Update userInvoices state
      setUserInvoices((prev: UserInvoices[]) => 
        prev.map((user: UserInvoices) => ({
          ...user,
          invoices: user.invoices.map((inv: GroupedInvoice) => 
            inv.invoice_number === invoice.invoice_number 
              ? { ...inv, is_confirmed: true } as GroupedInvoice
              : inv
          )
        }))
      );

      // Update selectedInvoice state to show green immediately
      setSelectedInvoice((prev: GroupedInvoice | null) => 
        prev ? { ...prev, is_confirmed: true } as GroupedInvoice : prev
      );

      toast.success("Invoice confirmed successfully");
      
      // Refetch to ensure state is synchronized
      await fetchBookings();
    } catch (error: any) {
      toast.error("Failed to confirm invoice");
      console.error("Error:", error);
    }
  };

  const handleExportInvoice = (invoice: GroupedInvoice) => {
    const doc = new jsPDF();
    
    // Blue color for styling
    const blueColor: [number, number, number] = [37, 99, 235]; // #2563EB
    
    // Header with blue box
    doc.setFillColor(...blueColor);
    doc.rect(0, 0, 210, 40, 'F');
    
    // White text for header
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("I-Book", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text("Brickwork Manager", 105, 30, { align: "center" });
    
    // Invoice number with blue background
    doc.setFillColor(...blueColor);
    doc.rect(10, 50, 190, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`INVOICE: ${invoice.invoice_number}`, 105, 58, { align: "center" });
    
    // Reset to black text for content
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    let yPos = 75;
    
    // Date
    doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString()}`, 15, yPos);
    yPos += 10;
    
    // Booked by section with blue title
    doc.setTextColor(...blueColor);
    doc.setFont("helvetica", "bold");
    doc.text("BOOKED BY:", 15, yPos);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    yPos += 7;
    doc.text(`Name: ${invoice.booked_by.full_name}`, 15, yPos);
    yPos += 6;
    doc.text(`Email: ${invoice.booked_by.email}`, 15, yPos);
    yPos += 12;
    
    // Items section with blue title
    doc.setTextColor(...blueColor);
    doc.setFont("helvetica", "bold");
    doc.text("ITEMS:", 15, yPos);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    yPos += 7;
    
    invoice.items.forEach(item => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      const text = `Plot ${item.plots.plot_number} - ${LIFT_LABELS[item.lift_values.lift_type as keyof typeof LIFT_LABELS]}: ${item.percentage}% = £${item.booked_value.toFixed(2)}`;
      doc.text(text, 15, yPos);
      yPos += 6;
    });
    
    yPos += 6;
    
    // Notes section if exists
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
    
    // Total value with blue box
    doc.setFillColor(...blueColor);
    doc.rect(10, yPos, 190, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text(`Total Value: £${invoice.total_value.toFixed(2)}`, 105, yPos + 7, { align: "center" });
    yPos += 18;
    
    // Gang division section
    const gangDivisions = invoice.items[0]?.gang_divisions || [];
    if (gangDivisions.length > 0) {
      doc.setTextColor(...blueColor);
      doc.setFont("helvetica", "bold");
      doc.text("GANG DIVISION:", 15, yPos);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      yPos += 7;
      
      gangDivisions.forEach(member => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(`${member.member_name} (${member.member_type}): £${member.amount.toFixed(2)}`, 15, yPos);
        yPos += 6;
      });
      
      yPos += 4;
      doc.setFont("helvetica", "bold");
      doc.text(`Total Allocated: £${gangDivisions.reduce((sum, m) => sum + m.amount, 0).toFixed(2)}`, 15, yPos);
    }
    
    doc.save(`${invoice.invoice_number}.pdf`);
    toast.success("Invoice exported as PDF");
  };

  const totalValue = groupedInvoices.reduce((sum, invoice) => sum + invoice.total_value, 0);

  const handlePrint = () => {
    window.print();
  };

  const handlePrintInvoice = (invoice: GroupedInvoice) => {
    // Set the selected invoice for printing
    setSelectedInvoice(invoice);
    
    // Small delay to ensure content is rendered before printing
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-invoice-section, .print-invoice-section * {
              visibility: visible !important;
            }
            .print-invoice-section {
              position: fixed;
              left: 0;
              top: 0;
              width: 100%;
              background: white;
              padding: 1cm;
            }
            .print-area, .print-area * {
              visibility: visible;
            }
            .print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .no-print {
              display: none !important;
            }
            @page {
              margin: 1cm;
            }
          }
          .print-invoice-section {
            display: none;
          }
          @media print {
            .print-invoice-section {
              display: block !important;
            }
          }
        `}
      </style>
      <Header 
        showBackButton
        actions={
          <Button onClick={handlePrint} variant="outline" size="sm" title="Print" className="no-print">
            <Printer className="h-4 w-4" />
            <span className="hidden md:inline ml-2">Print</span>
          </Button>
        }
      />
      
      {/* Hidden Print Section */}
      {selectedInvoice && (
        <div className="print-invoice-section">
          <div style={{ backgroundColor: '#2563EB', padding: '20px', textAlign: 'center', marginBottom: '20px' }}>
            <h1 style={{ color: 'white', fontSize: '32px', fontWeight: 'bold', margin: '0 0 10px 0' }}>I-Book</h1>
            <p style={{ color: 'white', fontSize: '16px', margin: 0 }}>Brickwork Manager</p>
          </div>
          
          <div style={{ backgroundColor: '#2563EB', padding: '10px', textAlign: 'center', marginBottom: '30px' }}>
            <h2 style={{ color: 'white', fontSize: '18px', fontWeight: 'bold', margin: 0 }}>
              INVOICE: {selectedInvoice.invoice_number}
            </h2>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '14px', marginBottom: '5px' }}>
              <strong>Date:</strong> {new Date(selectedInvoice.created_at).toLocaleDateString()}
            </p>
          </div>

          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ color: '#2563EB', fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>BOOKED BY:</h3>
            <p style={{ fontSize: '14px', margin: '5px 0' }}>
              <strong>Name:</strong> {selectedInvoice.booked_by.full_name}
            </p>
            <p style={{ fontSize: '14px', margin: '5px 0' }}>
              <strong>Email:</strong> {selectedInvoice.booked_by.email}
            </p>
          </div>

          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ color: '#2563EB', fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>ITEMS:</h3>
            {selectedInvoice.items.map((item, index) => (
              <p key={index} style={{ fontSize: '14px', marginBottom: '8px' }}>
                Plot {item.plots.plot_number} - {LIFT_LABELS[item.lift_values.lift_type as keyof typeof LIFT_LABELS]}: {item.percentage}% = £{item.booked_value.toFixed(2)}
              </p>
            ))}
          </div>

          {selectedInvoice.notes && (
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ color: '#2563EB', fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>NOTES:</h3>
              <p style={{ fontSize: '14px', whiteSpace: 'pre-wrap' }}>{selectedInvoice.notes}</p>
            </div>
          )}

          <div style={{ backgroundColor: '#2563EB', padding: '10px', textAlign: 'center', marginBottom: '30px' }}>
            <p style={{ color: 'white', fontSize: '18px', fontWeight: 'bold', margin: 0 }}>
              Total Value: £{selectedInvoice.total_value.toFixed(2)}
            </p>
          </div>

          {selectedInvoice.items[0]?.gang_divisions && selectedInvoice.items[0].gang_divisions.length > 0 && (
            <div>
              <h3 style={{ color: '#2563EB', fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>GANG DIVISION:</h3>
              {selectedInvoice.items[0].gang_divisions.map((member, index) => (
                <p key={index} style={{ fontSize: '14px', marginBottom: '8px' }}>
                  {member.member_name} ({member.member_type}): £{member.amount.toFixed(2)}
                </p>
              ))}
              <p style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '15px' }}>
                Total Allocated: £{selectedInvoice.items[0].gang_divisions.reduce((sum, m) => sum + m.amount, 0).toFixed(2)}
              </p>
            </div>
          )}
        </div>
      )}

      <main className="container py-8 print-area">
        <div className="mb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <FileText className="h-8 w-8 text-primary" />
              Booking In
            </h2>
            <p className="text-muted-foreground">
              Invoice summary of all booked work
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading bookings...</p>
          </div>
        ) : isAdmin ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userInvoices.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">No bookings yet</p>
                </CardContent>
              </Card>
            ) : (
              userInvoices.map((userGroup) => {
                const unviewedInvoices = userGroup.invoices.filter(inv => !inv.is_viewed && !inv.is_confirmed).length;
                const confirmedInvoices = userGroup.invoices.filter(inv => inv.is_confirmed).length;
                
                return (
                  <Card 
                    key={userGroup.user_id} 
                    className="hover:shadow-lg transition-shadow"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl">{userGroup.full_name}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">{maskEmail(userGroup.email)}</p>
                        </div>
                        {unviewedInvoices > 0 && (
                          <div className="flex items-center gap-1 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-semibold">
                            {unviewedInvoices}
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center pb-3 border-b">
                          <span className="text-sm text-muted-foreground">Total Invoices</span>
                          <span className="font-semibold">{userGroup.invoices.length}</span>
                        </div>
                        <div className="flex justify-between items-center pb-3 border-b">
                          <span className="text-sm text-muted-foreground">Confirmed</span>
                          <span className="font-semibold text-green-600">{confirmedInvoices}</span>
                        </div>
                        <div className="flex justify-between items-center pb-3 border-b">
                          <span className="text-sm text-muted-foreground">Total Value</span>
                          <span className="text-xl font-bold text-primary">£{userGroup.total_value.toFixed(2)}</span>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="flex-1"
                            onClick={() => handleViewUserInvoices(userGroup)}
                          >
                            View Invoices
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!confirm(`Delete all invoices for ${userGroup.full_name}?`)) return;
                              try {
                                const invoiceNumbers = userGroup.invoices.map(inv => inv.invoice_number);
                                await supabase
                                  .from("bookings")
                                  .delete()
                                  .in("invoice_number", invoiceNumbers);
                                toast.success("User invoices deleted");
                                fetchBookings();
                              } catch (error: any) {
                                toast.error("Failed to delete invoices");
                                console.error("Error:", error);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              {groupedInvoices.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No bookings yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                   <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Gang Members</TableHead>
                      <TableHead className="text-right">Total Value</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedInvoices.map((invoice) => (
                      <TableRow 
                        key={invoice.invoice_number}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleViewDetails(invoice)}
                      >
                        <TableCell className="font-medium">
                          {invoice.invoice_number}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {invoice.items[0]?.gang_divisions.map((member, idx) => (
                              <div key={idx} className="text-sm">
                                <span className="font-medium">{member.member_name}</span>
                                {' - '}
                                <span className="text-muted-foreground capitalize">£{member.amount.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          £{invoice.total_value.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {new Date(invoice.created_at).toLocaleDateString()}
                        </TableCell>
                          <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrintInvoice(invoice);
                            }}
                            title="Print"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={2} className="text-right font-bold">
                        Total
                      </TableCell>
                      <TableCell className="text-right font-bold text-lg">
                        £{groupedInvoices.reduce((sum, inv) => sum + inv.total_value, 0).toFixed(2)}
                      </TableCell>
                      <TableCell colSpan={2}></TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* User Invoices Dialog */}
        <Dialog open={userInvoicesDialogOpen} onOpenChange={setUserInvoicesDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedUser && (
                  <div>
                    <div className="text-2xl">{selectedUser.full_name}</div>
                    <div className="text-sm font-normal text-muted-foreground mt-1">
                      {maskEmail(selectedUser.email)}
                    </div>
                  </div>
                )}
              </DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Invoices</p>
                    <p className="text-2xl font-bold">{selectedUser.invoices.length}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Value</p>
                    <p className="text-2xl font-bold text-primary">£{selectedUser.total_value.toFixed(2)}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Invoices</h4>
                  <Table>
                    <TableHeader>
                     <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Gang Members</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedUser.invoices.map((invoice) => (
                        <TableRow 
                          key={invoice.invoice_number}
                          className={`cursor-pointer ${invoice.is_confirmed ? 'bg-green-100 dark:bg-green-900/20 hover:bg-green-200 dark:hover:bg-green-900/30' : 'hover:bg-muted/50'}`}
                          onClick={() => handleViewDetails(invoice)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {!invoice.is_viewed && !invoice.is_confirmed && (
                                <div className="h-2 w-2 rounded-full bg-primary" />
                              )}
                              {invoice.invoice_number}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {invoice.items[0]?.gang_divisions.map((member, idx) => (
                                <div key={idx} className="text-sm">
                                  <span className="font-medium">{member.member_name}</span>
                                  {' - '}
                                  <span className="text-muted-foreground capitalize">£{member.amount.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold text-primary">
                            £{invoice.total_value.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {new Date(invoice.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePrintInvoice(invoice);
                                }}
                                title="Print"
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExportInvoice(invoice);
                                }}
                                title="Export PDF"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Invoice Details Dialog */}
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader className="no-print">
              <DialogTitle>Invoice Details</DialogTitle>
            </DialogHeader>
            {selectedInvoice && (
              <div className="space-y-4 print-invoice">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Invoice Number</p>
                    <p className="font-semibold">{selectedInvoice.invoice_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-semibold">{new Date(selectedInvoice.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Booked By</p>
                    <p className="font-semibold">{selectedInvoice.booked_by.full_name}</p>
                    <p className="text-sm text-muted-foreground">{maskEmail(selectedInvoice.booked_by.email)}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Invoice Items</h4>
                  <div className="space-y-2">
                    {selectedInvoice.items.map((item, index) => (
                      <div key={index} className="p-3 bg-muted rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium">
                              Plot {item.plots.plot_number} - {item.plots.house_types.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {item.plots.house_types.sites.name}
                            </p>
                          </div>
                          <p className="font-bold text-primary">£{item.booked_value.toFixed(2)}</p>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">
                            {LIFT_LABELS[item.lift_values.lift_type as keyof typeof LIFT_LABELS]}
                          </span>
                          {' - '}
                          <span className="text-muted-foreground">{item.percentage}%</span>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 border-t font-bold text-lg">
                      <span>Invoice Total:</span>
                      <span className="text-primary">£{selectedInvoice.total_value.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {selectedInvoice.notes && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2">Notes</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedInvoice.notes}</p>
                  </div>
                )}

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Gang Division</h4>
                  <div className="space-y-2">
                    {selectedInvoice.items[0]?.gang_divisions.map((member, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                        <div>
                          <p className="font-medium">{member.member_name}</p>
                          <p className="text-sm text-muted-foreground capitalize">{member.member_type}</p>
                        </div>
                        <p className="font-semibold">£{member.amount.toFixed(2)}</p>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 border-t font-bold">
                      <span>Total Allocated</span>
                      <span>£{selectedInvoice.items[0]?.gang_divisions.reduce((sum, m) => sum + m.amount, 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 print:hidden">
                  <Button 
                    onClick={(e) => {
                      e.preventDefault();
                      window.print();
                    }} 
                    className="flex-1"
                    variant="outline"
                    type="button"
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                  </Button>
                  <Button 
                    onClick={(e) => {
                      e.preventDefault();
                      handleExportInvoice(selectedInvoice);
                    }} 
                    className="flex-1"
                    variant="default"
                    type="button"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Export PDF
                  </Button>
                  {isAdmin && !selectedInvoice.is_confirmed && (
                    <Button 
                      onClick={() => handleConfirmInvoice(selectedInvoice)} 
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      Confirm
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default BookingIn;
