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
import logo from "@/assets/logo.png";

// Interfaces and constants (unchanged)
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
    // ...unchanged logic...
  };

  const handleViewUserInvoices = (userGroup: UserInvoices) => {
    setSelectedUser(userGroup);
    setUserInvoicesDialogOpen(true);
  };

  const handleViewDetails = async (invoice: GroupedInvoice) => {
    // ...unchanged logic...
  };

  const handleConfirmInvoice = async (invoice: GroupedInvoice) => {
    // ...unchanged logic...
  };

  const handleExportInvoice = (invoice: GroupedInvoice) => {
    // ...unchanged logic...
  };

  const handlePrint = () => {
    window.print();
  };

  const handlePrintInvoice = (invoice: GroupedInvoice) => {
    setSelectedInvoice(invoice);
    setTimeout(() => window.print(), 100);
  };
  return (
  <div className="min-h-screen bg-secondary/30">
    <Header
      showBackButton
      actions={
        <Button onClick={handlePrint} variant="outline" size="sm" title="Print" className="no-print">
          <Printer className="h-4 w-4" />
          <span className="hidden md:inline ml-2">Print</span>
        </Button>
      }
    />

    <main className="container py-8">
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <FileText className="h-8 w-8 text-primary" />
          Booking In
        </h2>
        <p className="text-muted-foreground">Invoice summary of all booked work</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading bookings...</p>
        </div>
      ) : isAdmin ? (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {userInvoices.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="p-4 sm:p-6 text-center py-8">
                <p className="text-muted-foreground">No bookings yet</p>
              </CardContent>
            </Card>
          ) : (
            userInvoices.map((userGroup) => (
              <Card key={userGroup.user_id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl">{userGroup.full_name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{maskEmail(userGroup.email)}</p>
                    </div>
                    {/* Unviewed badge */}
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  {/* Totals and actions */}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle>Invoices</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {/* Table layout */}
          </CardContent>
        </Card>
      )}
    </main>

    {/* Dialogs */}
    <Dialog open={userInvoicesDialogOpen} onOpenChange={setUserInvoicesDialogOpen}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto sm:p-6 p-4">
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
        {/* Invoice list */}
      </DialogContent>
    </Dialog>
  </div>
);
};
export default BookingIn;