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
import { FileText, Printer } from "lucide-react";

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
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<GroupedInvoice | null>(null);
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
            is_confirmed: booking.confirmed_by_admin
          };
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
    } catch (error: any) {
      toast.error("Failed to load bookings");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
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

      toast.success("Invoice confirmed successfully");
      setDetailsDialogOpen(false);
    } catch (error: any) {
      toast.error("Failed to confirm invoice");
      console.error("Error:", error);
    }
  };

  const handleExportInvoice = (invoice: GroupedInvoice) => {
    const itemsList = invoice.items.map(item => 
      `Plot ${item.plots.plot_number} - ${LIFT_LABELS[item.lift_values.lift_type as keyof typeof LIFT_LABELS]}: ${item.percentage}% = £${item.booked_value.toFixed(2)}`
    ).join('\n');
    
    const gangDivisions = invoice.items[0]?.gang_divisions || [];
    
    const invoiceContent = `
INVOICE: ${invoice.invoice_number}
Date: ${new Date(invoice.created_at).toLocaleDateString()}

Booked By: ${invoice.booked_by.full_name}
Email: ${invoice.booked_by.email}

ITEMS:
${itemsList}

${invoice.notes ? `NOTES:\n${invoice.notes}\n\n` : ''}Total Value: £${invoice.total_value.toFixed(2)}

GANG DIVISION:
${gangDivisions.map(m => `${m.member_name} (${m.member_type}): £${m.amount.toFixed(2)}`).join('\n')}

Total Allocated: £${gangDivisions.reduce((sum, m) => sum + m.amount, 0).toFixed(2)}
    `.trim();

    const blob = new Blob([invoiceContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoice.invoice_number}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Invoice exported");
  };

  const totalValue = groupedInvoices.reduce((sum, invoice) => sum + invoice.total_value, 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <Header 
        showBackButton
        actions={
          <Button onClick={handlePrint} variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        }
      />
      
      <main className="container py-8">
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
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Work Completed</CardTitle>
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
                      <TableHead>Booked By</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Total Value</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedInvoices.map((invoice) => (
                      <TableRow 
                        key={invoice.invoice_number}
                        className={`cursor-pointer hover:bg-muted/50 ${isAdmin && invoice.is_confirmed ? 'bg-green-500/10' : ''}`}
                        onClick={() => handleViewDetails(invoice)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {isAdmin && !invoice.is_viewed && !invoice.is_confirmed && (
                              <div className="h-2 w-2 rounded-full bg-primary" />
                            )}
                            {invoice.invoice_number}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{invoice.booked_by.full_name}</p>
                            <p className="text-sm text-muted-foreground">{invoice.booked_by.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {invoice.items.map((item, idx) => (
                              <div key={idx} className="text-sm">
                                <span className="font-medium">Plot {item.plots.plot_number}</span>
                                {' - '}
                                <span>{LIFT_LABELS[item.lift_values.lift_type as keyof typeof LIFT_LABELS]}</span>
                                {' '}
                                <span className="text-muted-foreground">({item.percentage}%)</span>
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
                              handleExportInvoice(invoice);
                            }}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={3} className="text-right font-bold">
                        Total
                      </TableCell>
                      <TableCell className="text-right font-bold text-lg">
                        £{totalValue.toFixed(2)}
                      </TableCell>
                      <TableCell colSpan={2}></TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Invoice Details Dialog */}
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Invoice Details</DialogTitle>
            </DialogHeader>
            {selectedInvoice && (
              <div className="space-y-4">
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
                    <p className="text-sm text-muted-foreground">{selectedInvoice.booked_by.email}</p>
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

                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleExportInvoice(selectedInvoice)} 
                    className="flex-1"
                    variant="default"
                  >
                    <Printer className="mr-2 h-4 w-4" />
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
