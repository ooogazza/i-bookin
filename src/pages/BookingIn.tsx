import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { FileText, Printer, Trash2, Send, Settings } from "lucide-react";
import { maskEmail } from "@/lib/emailUtils";
import jsPDF from "jspdf";
import logo from "@/assets/logo.png";
import { handleExportPDF as exportInvoicePDF, handleSendToAdmin as sendInvoiceToAdmin } from "@/lib/invoiceUtils";
import { LiftTypeLabel } from "@/components/LiftTypeLabel";
import { getLiftFullLabel } from "@/lib/liftTypeLabels";

interface BookingData {
  id: string;
  percentage: number;
  booked_value: number;
  invoice_number: string;
  status: string;
  created_at: string;
  notes: string | null;
  is_non_plot?: boolean;
  profiles: {
    full_name: string;
    email: string;
  };
  plots?: {
    plot_number: number;
    house_types: {
      name: string;
      sites: {
        name: string;
      };
    };
  };
  lift_values?: {
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
  cut_ups: "Cut Ups/Gable",
  snag_patch_int: "Snag/Patch Int",
  snag_patch_ext: "Snag/Patch Ext",
  dod: "D.O.D",
  no_ri: "No RI",
};

const BookingIn = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [groupedInvoices, setGroupedInvoices] = useState<GroupedInvoice[]>([]);
  const [userInvoices, setUserInvoices] = useState<UserInvoices[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserInvoices | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<GroupedInvoice | null>(null);
  const [userInvoicesDialogOpen, setUserInvoicesDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [unviewedCount, setUnviewedCount] = useState(0);
  const [sendingToAdmin, setSendingToAdmin] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, [user, isAdmin]);

  const fetchBookings = async () => {
    if (!user) return;

    try {
      // Fetch regular plot-based bookings
      let plotQuery = supabase
        .from("bookings")
        .select(
          `
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
        `,
        )
        .eq("status", "confirmed")
        .order("created_at", { ascending: false });

      // Filter by user if not admin
      if (!isAdmin) {
        plotQuery = plotQuery.eq("booked_by", user.id);
      }

      const { data: plotBookings, error: plotError } = await plotQuery;
      if (plotError) throw plotError;

      // Fetch non-plot invoices
      let nonPlotQuery = supabase
        .from("non_plot_invoices")
        .select(
          `
          *,
          non_plot_gang_divisions (
            member_name,
            member_type,
            amount
          )
        `,
        )
        .eq("status", "sent")
        .order("created_at", { ascending: false });

      // Filter by user if not admin
      if (!isAdmin) {
        nonPlotQuery = nonPlotQuery.eq("user_id", user.id);
      }

      const { data: nonPlotInvoices, error: nonPlotError } = await nonPlotQuery;
      if (nonPlotError) throw nonPlotError;

      // Fetch profiles for non-plot invoices
      const userIds = [...new Set((nonPlotInvoices || []).map((inv: any) => inv.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      const profilesMap = (profiles || []).reduce((acc: any, profile: any) => {
        acc[profile.id] = profile;
        return acc;
      }, {});

      // Transform non-plot invoices to match booking structure
      const transformedNonPlot = (nonPlotInvoices || []).map((invoice: any) => ({
        id: invoice.id,
        percentage: 100,
        booked_value: invoice.total_amount,
        invoice_number: invoice.invoice_number,
        status: "confirmed",
        created_at: invoice.created_at,
        notes: invoice.notes,
        confirmed_by_admin: true,
        is_non_plot: true,
        profiles: profilesMap[invoice.user_id] || { full_name: "Unknown", email: "" },
        gang_divisions: invoice.non_plot_gang_divisions || [],
      }));

      // Combine both types
      const allBookings = [...(plotBookings || []), ...transformedNonPlot];
      setBookings(allBookings as any);

      // Group bookings by invoice number
      const grouped = allBookings.reduce((acc: { [key: string]: GroupedInvoice }, booking: any) => {
        if (!acc[booking.invoice_number]) {
          acc[booking.invoice_number] = {
            invoice_number: booking.invoice_number,
            created_at: booking.created_at,
            booked_by: booking.profiles,
            items: [],
            total_value: 0,
            notes: booking.notes,
            is_confirmed: booking.confirmed_by_admin || false,
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
          const viewedInvoices = new Set(viewData?.map((v) => v.invoice_number) || []);
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
              total_value: 0,
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
        await supabase.from("invoice_views").insert({
          invoice_number: invoice.invoice_number,
          viewed_by: user!.id,
        });

        // Update local state
        setGroupedInvoices((prev: GroupedInvoice[]) =>
          prev.map((inv: GroupedInvoice) =>
            inv.invoice_number === invoice.invoice_number ? ({ ...inv, is_viewed: true } as GroupedInvoice) : inv,
          ),
        );

        // Update userInvoices state
        setUserInvoices((prev: UserInvoices[]) =>
          prev.map((user: UserInvoices) => ({
            ...user,
            invoices: user.invoices.map((inv: GroupedInvoice) =>
              inv.invoice_number === invoice.invoice_number ? ({ ...inv, is_viewed: true } as GroupedInvoice) : inv,
            ),
          })),
        );

        setUnviewedCount((prev) => Math.max(0, prev - 1));
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

      // Close the details dialog immediately so the background is visible
      setDetailsDialogOpen(false);

      // Update main grouped list
      setGroupedInvoices((prev: GroupedInvoice[]) =>
        prev.map((inv: GroupedInvoice) =>
          inv.invoice_number === invoice.invoice_number ? ({ ...inv, is_confirmed: true } as GroupedInvoice) : inv,
        ),
      );

      // Update admin grouped-by-user list
      setUserInvoices((prev: UserInvoices[]) =>
        prev.map((user: UserInvoices) => ({
          ...user,
          invoices: user.invoices.map((inv: GroupedInvoice) =>
            inv.invoice_number === invoice.invoice_number ? ({ ...inv, is_confirmed: true } as GroupedInvoice) : inv,
          ),
        })),
      );

      // Update the open user dialog snapshot so highlight shows instantly
      setSelectedUser((prev: UserInvoices | null) =>
        prev
          ? {
              ...prev,
              invoices: prev.invoices.map((inv: GroupedInvoice) =>
                inv.invoice_number === invoice.invoice_number ? ({ ...inv, is_confirmed: true } as GroupedInvoice) : inv,
              ),
            }
          : prev,
      );

      // Update selectedInvoice state (not strictly needed since dialog closes)
      setSelectedInvoice((prev: GroupedInvoice | null) =>
        prev ? ({ ...prev, is_confirmed: true } as GroupedInvoice) : prev,
      );

      toast.success("Invoice confirmed successfully");

      // Refresh in background to sync any other changes
      fetchBookings();
    } catch (error: any) {
      toast.error("Failed to confirm invoice");
      console.error("Error:", error);
    }
  };

  const handleExportInvoice = async (invoice: GroupedInvoice) => {
    try {
      const payload = {
        invoiceNumber: invoice.invoice_number,
        total: invoice.total_value,
        notes: invoice.notes || "",
        gangMembers: (invoice.items[0]?.gang_divisions || []).map((m) => ({
          name: m.member_name,
          type: m.member_type,
          amount: m.amount,
        })),
      };

      await exportInvoicePDF(payload, invoice.booked_by.full_name);
    } catch (error: any) {
      console.error("Export invoice error:", error);
      toast.error("Failed to export PDF");
    }
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

  const handleSendToAdmin = async (invoice: GroupedInvoice) => {
    setSendingToAdmin(true);
    try {
      const payload = {
        invoiceNumber: invoice.invoice_number,
        total: invoice.total_value,
        notes: invoice.notes || "",
        gangMembers: (invoice.items[0]?.gang_divisions || []).map((m) => ({
          name: m.member_name,
          type: m.member_type,
          amount: m.amount,
        })),
      };

      await sendInvoiceToAdmin(payload, invoice.booked_by.full_name);
      toast.success("Invoice sent to admin successfully");
    } catch (error: any) {
      console.error("Error sending invoice:", error);
      toast.error("Failed to send invoice to admin");
    } finally {
      setSendingToAdmin(false);
    }
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
              padding: 0.5cm;
            }
            .no-print {
              display: none !important;
            }
            @page {
              margin: 0.5cm;
              size: A4;
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
          isAdmin ? (
            <Button 
              onClick={() => navigate("/admin/settings")} 
              variant="outline" 
              size="sm" 
              title="Settings"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden md:inline ml-2">Settings</span>
            </Button>
          ) : undefined
        }
      />

      {/* Hidden Print Section */}
      {selectedInvoice && (
        <div className="print-invoice-section">
          <div style={{ backgroundColor: "#2563EB", padding: "15px", textAlign: "center", marginBottom: "15px" }}>
            <img
              src={logo}
              alt="I-Bookin"
              style={{
                height: "50px",
                width: "auto",
                margin: "0 auto",
                display: "block",
                borderRadius: "8px",
              }}
            />
            <p style={{ color: "white", fontSize: "14px", margin: "5px 0 0 0" }}>Brickwork Manager</p>
          </div>

          <div style={{ backgroundColor: "#2563EB", padding: "8px", textAlign: "center", marginBottom: "20px" }}>
            <h2 style={{ color: "white", fontSize: "16px", fontWeight: "bold", margin: 0 }}>
              INVOICE: {selectedInvoice.invoice_number}
            </h2>
          </div>

          <div style={{ marginBottom: "15px" }}>
            <p style={{ fontSize: "13px", marginBottom: "0" }}>
              <strong>Date:</strong> {new Date(selectedInvoice.created_at).toLocaleDateString()}
            </p>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <h3 style={{ color: "#2563EB", fontSize: "15px", fontWeight: "bold", marginBottom: "8px" }}>BOOKED BY:</h3>
            <p style={{ fontSize: "13px", margin: "3px 0" }}>
              <strong>Name:</strong> {selectedInvoice.booked_by.full_name}
            </p>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <h3 style={{ color: "#2563EB", fontSize: "15px", fontWeight: "bold", marginBottom: "8px" }}>ITEMS:</h3>
            {selectedInvoice.items.map((item, index) => (
              <p key={index} style={{ fontSize: "13px", marginBottom: "5px" }}>
                {item.is_non_plot
                  ? `Non-Plot Work: £${item.booked_value.toFixed(2)}`
                  : item.plots && item.lift_values
                    ? `Plot ${item.plots.plot_number} - ${getLiftFullLabel(item.lift_values.lift_type)}: ${item.percentage}% = £${item.booked_value.toFixed(2)}`
                    : ""}
              </p>
            ))}
          </div>

          {selectedInvoice.notes && (
            <div style={{ marginBottom: "20px" }}>
              <h3 style={{ color: "#2563EB", fontSize: "15px", fontWeight: "bold", marginBottom: "8px" }}>NOTES:</h3>
              <p style={{ fontSize: "13px", whiteSpace: "pre-wrap", margin: 0 }}>{selectedInvoice.notes}</p>
            </div>
          )}

          <div style={{ backgroundColor: "#2563EB", padding: "8px", textAlign: "center", marginBottom: "20px" }}>
            <p style={{ color: "white", fontSize: "16px", fontWeight: "bold", margin: 0 }}>
              Total Value: £{selectedInvoice.total_value.toFixed(2)}
            </p>
          </div>

          {selectedInvoice.items[0]?.gang_divisions && selectedInvoice.items[0].gang_divisions.length > 0 && (
            <div>
              <h3 style={{ color: "#2563EB", fontSize: "15px", fontWeight: "bold", marginBottom: "8px" }}>
                GANG DIVISION:
              </h3>
              {selectedInvoice.items[0].gang_divisions.map((member, index) => (
                <p key={index} style={{ fontSize: "13px", marginBottom: "5px" }}>
                  {member.member_name} ({member.member_type}): £{member.amount.toFixed(2)}
                </p>
              ))}
              <p style={{ fontSize: "13px", fontWeight: "bold", marginTop: "10px", marginBottom: 0 }}>
                Total Allocated: £
                {selectedInvoice.items[0].gang_divisions.reduce((sum, m) => sum + m.amount, 0).toFixed(2)}
              </p>
            </div>
          )}
        </div>
      )}

      <main className="container py-8">
        <div className="mb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <FileText className="h-8 w-8 text-primary" />
              Booking In
            </h2>
            <p className="text-muted-foreground">Invoice summary of all booked work</p>
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
                const unviewedInvoices = userGroup.invoices.filter((inv) => !inv.is_viewed && !inv.is_confirmed).length;
                const confirmedInvoices = userGroup.invoices.filter((inv) => inv.is_confirmed).length;
                const unconfirmedInvoices = userGroup.invoices.filter((inv) => !inv.is_confirmed).length;

                return (
                  <Card key={userGroup.user_id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl">{userGroup.full_name}</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          {unviewedInvoices > 0 && (
                            <div className="flex items-center gap-1 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-semibold">
                              {unviewedInvoices}
                            </div>
                          )}
                          {unconfirmedInvoices > 0 && (
                            <div className="flex items-center gap-1 bg-green-600 text-white px-2 py-1 rounded-full text-xs font-semibold">
                              {unconfirmedInvoices}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center pb-3 border-b">
                          <span className="text-sm text-muted-foreground md:hidden">Tot. INV</span>
                          <span className="text-sm text-muted-foreground hidden md:block">Total Invoices</span>
                          <span className="font-semibold">{userGroup.invoices.length}</span>
                        </div>
                        <div className="flex justify-between items-center pb-3 border-b">
                          <span className="text-sm text-muted-foreground md:hidden">Conf.</span>
                          <span className="text-sm text-muted-foreground hidden md:block">Confirmed</span>
                          <span className="font-semibold text-green-600">{confirmedInvoices}</span>
                        </div>
                        <div className="flex justify-between items-center pb-3 border-b">
                          <span className="text-sm text-muted-foreground md:hidden">Tot. Val</span>
                          <span className="text-sm text-muted-foreground hidden md:block">Total Value</span>
                          <span className="text-xl font-bold text-primary">£{userGroup.total_value.toFixed(2)}</span>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleViewUserInvoices(userGroup)}
                          >
                            <span className="md:hidden">View</span>
                            <span className="hidden md:inline">View Invoices</span>
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!confirm(`Delete all invoices for ${userGroup.full_name}?`)) return;
                              try {
                                const invoiceNumbers = userGroup.invoices.map((inv) => inv.invoice_number);
                                
                                // Delete from bookings table
                                await supabase.from("bookings").delete().in("invoice_number", invoiceNumbers);
                                
                                // Delete from non_plot_invoices table
                                await supabase.from("non_plot_invoices").delete().in("invoice_number", invoiceNumbers);
                                
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
                <>
                  {/* Desktop View */}
                  <div className="hidden md:block">
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
                            <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {invoice.items[0]?.gang_divisions.map((member, idx) => (
                                  <div key={idx} className="text-sm">
                                    <span className="font-medium">{member.member_name}</span>
                                    {" - "}
                                    <span className="text-muted-foreground capitalize">£{member.amount.toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-bold text-primary">
                              £{invoice.total_value.toFixed(2)}
                            </TableCell>
                            <TableCell>{new Date(invoice.created_at).toLocaleDateString()}</TableCell>
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
                  </div>

                  {/* Mobile View */}
                  <div className="md:hidden space-y-3">
                    {groupedInvoices.map((invoice) => (
                      <Card
                        key={invoice.invoice_number}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleViewDetails(invoice)}
                      >
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-xs text-muted-foreground">INV</p>
                                <p className="font-semibold text-sm">...{invoice.invoice_number.slice(-4)}</p>
                                <p className="text-sm font-bold text-primary ml-auto">£{invoice.total_value.toFixed(2)}</p>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {new Date(invoice.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                              </p>
                              {invoice.items[0]?.gang_divisions && invoice.items[0].gang_divisions.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs text-muted-foreground mb-1">Gang</p>
                                  <div className="space-y-1">
                                    {invoice.items[0].gang_divisions.map((member, idx) => (
                                      <div key={idx} className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-bold">{member.member_name}</p>
                                        <p className="text-sm font-bold text-primary">£{member.amount.toFixed(2)}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePrintInvoice(invoice);
                                }}
                                title="Print"
                                className="h-8 w-8 p-0"
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExportInvoice(invoice);
                                }}
                                title="Export PDF"
                                className="h-8 w-8 p-0"
                              >
                                <FileText className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* User Invoices Dialog */}
        <Dialog open={userInvoicesDialogOpen} onOpenChange={setUserInvoicesDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>
                {selectedUser && (
                  <div>
                    <div className="text-2xl">{selectedUser.full_name}</div>
                  </div>
                )}
              </DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground md:hidden">Tot. INV</p>
                    <p className="text-sm text-muted-foreground hidden md:block">Total Invoices</p>
                    <p className="text-2xl font-bold">{selectedUser.invoices.length}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground md:hidden">Tot. Val</p>
                    <p className="text-sm text-muted-foreground hidden md:block">Total Value</p>
                    <p className="text-2xl font-bold text-primary">£{selectedUser.total_value.toFixed(2)}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Invoices</h4>
                  {/* Desktop table */}
                  <div className="hidden md:block">
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
                            className={`cursor-pointer ${invoice.is_confirmed ? "bg-green-100 dark:bg-green-900/20 hover:bg-green-200 dark:hover:bg-green-900/30" : "hover:bg-muted/50"}`}
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
                                    {" - "}
                                    <span className="text-muted-foreground capitalize">£{member.amount.toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-bold text-primary">
                              £{invoice.total_value.toFixed(2)}
                            </TableCell>
                            <TableCell>{new Date(invoice.created_at).toLocaleDateString()}</TableCell>
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

                  {/* Mobile list */}
                  <div className="md:hidden space-y-2">
                    {selectedUser.invoices.map((invoice) => (
                      <Card
                        key={invoice.invoice_number}
                        className={`cursor-pointer ${invoice.is_confirmed ? "bg-green-100 dark:bg-green-900/20" : "hover:bg-muted/50"}`}
                        onClick={() => handleViewDetails(invoice)}
                      >
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {!invoice.is_viewed && !invoice.is_confirmed && (
                                  <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                                )}
                                <p className="text-xs text-muted-foreground">INV</p>
                                <p className="font-semibold text-sm">...{invoice.invoice_number.slice(-4)}</p>
                                <p className="text-sm font-bold text-primary ml-auto">£{invoice.total_value.toFixed(2)}</p>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {new Date(invoice.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                              </p>
                              {invoice.items[0]?.gang_divisions && invoice.items[0].gang_divisions.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs text-muted-foreground mb-1">Gang</p>
                                  <div className="space-y-1">
                                    {invoice.items[0].gang_divisions.map((member, idx) => (
                                      <div key={idx} className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-bold">{member.member_name}</p>
                                        <p className="text-sm font-bold text-primary">£{member.amount.toFixed(2)}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePrintInvoice(invoice);
                                }}
                                title="Print"
                                className="h-8 w-8 p-0"
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExportInvoice(invoice);
                                }}
                                title="Export PDF"
                                className="h-8 w-8 p-0"
                              >
                                <FileText className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Invoice Details Dialog */}
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] md:max-h-[80vh] overflow-y-auto p-4 md:p-6" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="no-print pb-3 md:pb-4">
              <DialogTitle className="text-lg md:text-xl">Invoice Details</DialogTitle>
            </DialogHeader>
            {selectedInvoice && (
              <div className="space-y-4 md:space-y-6 print-invoice">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs md:text-sm text-muted-foreground mb-1">Invoice Number</p>
                    <p className="font-semibold text-sm md:text-base">{selectedInvoice.invoice_number}</p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs md:text-sm text-muted-foreground mb-1">Date</p>
                    <p className="font-semibold text-sm md:text-base">{new Date(selectedInvoice.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg md:col-span-2">
                    <p className="text-xs md:text-sm text-muted-foreground mb-1">Booked By</p>
                    <p className="font-semibold text-sm md:text-base">{selectedInvoice.booked_by.full_name}</p>
                  </div>
                </div>

                <div className="border-t pt-3 md:pt-4">
                  <h4 className="font-semibold mb-2 md:mb-3 text-sm md:text-base">Invoice Items</h4>
                  <div className="space-y-2 md:space-y-3">
                    {selectedInvoice.items.map((item, index) => (
                      <div key={index} className="p-3 md:p-4 bg-muted rounded-lg">
                        {item.is_non_plot ? (
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1">
                              <p className="font-medium text-sm md:text-base">Non-Plot Work</p>
                              <p className="text-xs md:text-sm text-muted-foreground">General brickwork</p>
                            </div>
                            <p className="font-bold text-primary text-sm md:text-base whitespace-nowrap">£{item.booked_value.toFixed(2)}</p>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between items-start gap-2 mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm md:text-base break-words">
                                  Plot {item.plots?.plot_number} - {item.plots?.house_types.name}
                                </p>
                                <p className="text-xs md:text-sm text-muted-foreground truncate">{item.plots?.house_types.sites.name}</p>
                              </div>
                              <p className="font-bold text-primary text-sm md:text-base whitespace-nowrap">£{item.booked_value.toFixed(2)}</p>
                            </div>
                            <div className="text-xs md:text-sm flex items-center gap-1">
                              <span className="font-medium">
                                {item.lift_values && <LiftTypeLabel liftType={item.lift_values.lift_type} />}
                              </span>
                              {" - "}
                              <span className="text-muted-foreground">{item.percentage}%</span>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 md:pt-3 border-t font-bold text-base md:text-lg bg-primary/5 p-3 rounded-lg">
                      <span>Invoice Total:</span>
                      <span className="text-primary">£{selectedInvoice.total_value.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {selectedInvoice.notes && (
                  <div className="border-t pt-3 md:pt-4">
                    <h4 className="font-semibold mb-2 text-sm md:text-base">Notes</h4>
                    <p className="text-xs md:text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">{selectedInvoice.notes}</p>
                  </div>
                )}

                <div className="border-t pt-3 md:pt-4">
                  <h4 className="font-semibold mb-2 md:mb-3 text-sm md:text-base">Gang Division</h4>
                  <div className="space-y-2 md:space-y-3">
                    {selectedInvoice.items[0]?.gang_divisions.map((member, index) => (
                      <div key={index} className="flex justify-between items-center p-3 md:p-4 bg-muted rounded-lg gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm md:text-base truncate">{member.member_name}</p>
                          <p className="text-xs md:text-sm text-muted-foreground capitalize">{member.member_type}</p>
                        </div>
                        <p className="font-semibold text-primary text-sm md:text-base whitespace-nowrap">£{member.amount.toFixed(2)}</p>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 md:pt-3 border-t font-bold bg-primary/5 p-3 rounded-lg text-sm md:text-base">
                      <span>Total Allocated</span>
                      <span className="text-primary">
                        £{selectedInvoice.items[0]?.gang_divisions.reduce((sum, m) => sum + m.amount, 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-2 print:hidden pt-2">
                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      window.print();
                    }}
                    className="flex-1"
                    variant="outline"
                    type="button"
                    size="lg"
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    <span className="text-sm md:text-base">Print</span>
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      handleExportInvoice(selectedInvoice);
                    }}
                    className="flex-1"
                    variant="default"
                    type="button"
                    size="lg"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    <span className="text-sm md:text-base">Export PDF</span>
                  </Button>
                  {isAdmin && !selectedInvoice.is_confirmed && (
                    <Button
                      onClick={() => handleConfirmInvoice(selectedInvoice)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      size="lg"
                    >
                      <span className="text-sm md:text-base">Confirm</span>
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
