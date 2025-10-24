import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
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
  created_at: string;
  lift_values: {
    lift_type: string;
    house_types: {
      name: string;
      sites: {
        name: string;
      };
    };
  };
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
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          lift_values (
            lift_type,
            house_types (
              name,
              sites (
                name
              )
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error: any) {
      toast.error("Failed to load bookings");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
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
                      <TableHead>Site</TableHead>
                      <TableHead>House Type</TableHead>
                      <TableHead>Lift</TableHead>
                      <TableHead className="text-right">Percentage</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium">
                          {booking.lift_values.house_types.sites.name}
                        </TableCell>
                        <TableCell>{booking.lift_values.house_types.name}</TableCell>
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
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={4} className="text-right font-bold">
                        Total
                      </TableCell>
                      <TableCell className="text-right font-bold text-lg">
                        £{totalValue.toFixed(2)}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default BookingIn;
