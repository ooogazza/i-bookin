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
import { FileText, Printer, Eye } from "lucide-react";

interface BookingData {
  id: string;
  percentage: number;
  booked_value: number;
  invoice_number: string;
  status: string;
  created_at: string;
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
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<BookingData | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from("bookings")
        .select(`
          *,
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
    } catch (error: any) {
      toast.error("Failed to load bookings");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (booking: BookingData) => {
    setSelectedBooking(booking);
    setDetailsDialogOpen(true);
  };

  const handleExportInvoice = (booking: BookingData) => {
    const invoiceContent = `
INVOICE: ${booking.invoice_number}
Date: ${new Date(booking.created_at).toLocaleDateString()}

Booked By: ${booking.profiles.full_name}
Email: ${booking.profiles.email}

Site: ${booking.plots.house_types.sites.name}
Plot: ${booking.plots.plot_number}
House Type: ${booking.plots.house_types.name}
Lift: ${LIFT_LABELS[booking.lift_values.lift_type as keyof typeof LIFT_LABELS]}

Percentage: ${booking.percentage}%
Total Value: £${booking.booked_value.toFixed(2)}

GANG DIVISION:
${booking.gang_divisions.map(m => `${m.member_name} (${m.member_type}): £${m.amount.toFixed(2)}`).join('\n')}

Total Allocated: £${booking.gang_divisions.reduce((sum, m) => sum + m.amount, 0).toFixed(2)}
    `.trim();

    const blob = new Blob([invoiceContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${booking.invoice_number}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Invoice exported");
  };

  const totalValue = bookings.reduce((sum, booking) => sum + booking.booked_value, 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <Header />
      
      <main className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <FileText className="h-8 w-8 text-primary" />
              Booking In
            </h2>
            <p className="text-muted-foreground">
              Invoice summary of all booked work
            </p>
          </div>
          <Button onClick={handlePrint} variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
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
              {bookings.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No bookings yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Booked By</TableHead>
                      <TableHead>Site</TableHead>
                      <TableHead>Plot</TableHead>
                      <TableHead>House Type</TableHead>
                      <TableHead>Lift</TableHead>
                      <TableHead className="text-right">Percentage</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium">{booking.invoice_number}</TableCell>
                        <TableCell>{booking.profiles.full_name}</TableCell>
                        <TableCell>{booking.plots.house_types.sites.name}</TableCell>
                        <TableCell>Plot {booking.plots.plot_number}</TableCell>
                        <TableCell>{booking.plots.house_types.name}</TableCell>
                        <TableCell>
                          {LIFT_LABELS[booking.lift_values.lift_type as keyof typeof LIFT_LABELS]}
                        </TableCell>
                        <TableCell className="text-right">{booking.percentage}%</TableCell>
                        <TableCell className="text-right font-medium">
                          £{booking.booked_value.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {new Date(booking.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(booking)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExportInvoice(booking)}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={7} className="text-right font-bold">
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Invoice Details</DialogTitle>
            </DialogHeader>
            {selectedBooking && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Invoice Number</p>
                    <p className="font-semibold">{selectedBooking.invoice_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-semibold">{new Date(selectedBooking.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Booked By</p>
                    <p className="font-semibold">{selectedBooking.profiles.full_name}</p>
                    <p className="text-sm text-muted-foreground">{selectedBooking.profiles.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Site & Plot</p>
                    <p className="font-semibold">{selectedBooking.plots.house_types.sites.name}</p>
                    <p className="text-sm">Plot {selectedBooking.plots.plot_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">House Type</p>
                    <p className="font-semibold">{selectedBooking.plots.house_types.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Lift</p>
                    <p className="font-semibold">
                      {LIFT_LABELS[selectedBooking.lift_values.lift_type as keyof typeof LIFT_LABELS]}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Percentage</p>
                    <p className="font-semibold">{selectedBooking.percentage}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Value</p>
                    <p className="font-semibold text-primary">£{selectedBooking.booked_value.toFixed(2)}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Gang Division</h4>
                  <div className="space-y-2">
                    {selectedBooking.gang_divisions.map((member, index) => (
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
                      <span>£{selectedBooking.gang_divisions.reduce((sum, m) => sum + m.amount, 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={() => handleExportInvoice(selectedBooking)} 
                  className="w-full"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Export Invoice
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default BookingIn;
