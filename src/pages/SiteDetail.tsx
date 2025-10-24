import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Settings, Plus, Users, Trash2, ShoppingCart, FileText, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import jsPDF from "jspdf";

interface Site {
  id: string;
  name: string;
  description: string | null;
  number_of_plots: number;
  number_of_house_types: number;
}

interface HouseType {
  id: string;
  name: string;
  total_value: number;
  lift_values: LiftValue[];
}

interface LiftValue {
  id: string;
  lift_type: string;
  value: number;
}

interface Plot {
  id: string;
  plot_number: number;
  house_type_id: string | null;
  assigned_to: string | null;
  house_types: HouseType | null;
}

interface Booking {
  id: string;
  lift_value_id: string;
  plot_id: string;
  percentage: number;
}

interface User {
  user_id: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

interface AvailableUser {
  id: string;
  full_name: string;
  email: string;
}

interface InvoiceItem {
  plot: Plot;
  liftType: string;
  liftValueId: string;
  liftValue: number;
  percentage: number;
  bookedValue: number;
}

interface GangMember {
  name: string;
  type: string;
  amount: number;
}

const LIFT_LABELS = {
  lift_1: "Lift 1",
  lift_2: "Lift 2",
  lift_3: "Lift 3",
  lift_4: "Lift 4",
  lift_5: "Lift 5",
  lift_6: "Lift 6",
  cut_ups: "Cut Ups",
  snag: "Snag/Patch D.O.D",
};

const SiteDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [site, setSite] = useState<Site | null>(null);
  const [houseTypes, setHouseTypes] = useState<HouseType[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [houseTypeDialogOpen, setHouseTypeDialogOpen] = useState(false);
  const [editingHouseType, setEditingHouseType] = useState<HouseType | null>(null);
  const [houseTypeName, setHouseTypeName] = useState("");
  const [liftValues, setLiftValues] = useState<Record<string, number>>({});
  
  const [plotDialogOpen, setPlotDialogOpen] = useState(false);
  const [selectedPlot, setSelectedPlot] = useState<Plot | null>(null);
  const [selectedHouseTypeId, setSelectedHouseTypeId] = useState("");
  
  const [userAssignDialogOpen, setUserAssignDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");

  const [inviteUserDialogOpen, setInviteUserDialogOpen] = useState(false);
  const [selectedInviteUserId, setSelectedInviteUserId] = useState("");

  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [selectedBookingPlot, setSelectedBookingPlot] = useState<Plot | null>(null);
  const [selectedBookingLiftType, setSelectedBookingLiftType] = useState("");
  const [bookingPercentage, setBookingPercentage] = useState(100);
  
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [gangMembers, setGangMembers] = useState<GangMember[]>([]);
  const [gangDialogOpen, setGangDialogOpen] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberType, setMemberType] = useState("bricklayer");
  const [memberAmount, setMemberAmount] = useState(0);

  useEffect(() => {
    if (id) {
      fetchSiteData();
      if (isAdmin) fetchAvailableUsers();
    }
  }, [id, isAdmin]);

  const fetchSiteData = async () => {
    try {
      const { data: siteData, error: siteError } = await supabase
        .from("sites")
        .select("*")
        .eq("id", id)
        .single();

      if (siteError) throw siteError;
      setSite(siteData);

      const { data: houseTypesData, error: houseTypesError } = await supabase
        .from("house_types")
        .select(`
          *,
          lift_values (*)
        `)
        .eq("site_id", id);

      if (houseTypesError) throw houseTypesError;
      setHouseTypes(houseTypesData || []);

      const { data: plotsData, error: plotsError } = await supabase
        .from("plots")
        .select(`
          *,
          house_types (
            id,
            name,
            total_value,
            lift_values (*)
          )
        `)
        .eq("site_id", id)
        .order("plot_number");

      if (plotsError) throw plotsError;
      
      // Filter plots if not admin
      let filteredPlots = plotsData || [];
      if (!isAdmin && user) {
        filteredPlots = plotsData?.filter(p => p.assigned_to === user.id) || [];
      }
      setPlots(filteredPlots as any);

      // Fetch bookings for the site
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select("id, lift_value_id, plot_id, percentage")
        .in("plot_id", (plotsData || []).map(p => p.id));

      if (bookingsError) throw bookingsError;
      setBookings(bookingsData || []);

      if (isAdmin) {
        const { data: usersData, error: usersError } = await supabase
          .from("user_site_assignments")
          .select(`
            user_id,
            profiles!inner (
              full_name,
              email
            )
          `)
          .eq("site_id", id);

        if (usersError) throw usersError;
        setUsers(usersData as any || []);
      }
    } catch (error: any) {
      toast.error("Failed to load site data");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name");

      if (error) throw error;
      setAvailableUsers(data || []);
    } catch (error: any) {
      console.error("Error fetching users:", error);
    }
  };

  const openHouseTypeDialog = (houseType?: HouseType) => {
    if (houseType) {
      setEditingHouseType(houseType);
      setHouseTypeName(houseType.name);
      const values: Record<string, number> = {};
      houseType.lift_values.forEach(lv => {
        values[lv.lift_type] = lv.value;
      });
      setLiftValues(values);
    } else {
      setEditingHouseType(null);
      setHouseTypeName("");
      setLiftValues({});
    }
    setHouseTypeDialogOpen(true);
  };

  const handleSaveHouseType = async () => {
    if (!site) return;

    try {
      if (editingHouseType) {
        await supabase
          .from("house_types")
          .update({ name: houseTypeName })
          .eq("id", editingHouseType.id);

        for (const [liftType, value] of Object.entries(liftValues)) {
          const existing = editingHouseType.lift_values.find(lv => lv.lift_type === liftType);
          if (existing) {
            await supabase
              .from("lift_values")
              .update({ value })
              .eq("id", existing.id);
          } else {
            await supabase
              .from("lift_values")
              .insert({ house_type_id: editingHouseType.id, lift_type: liftType as any, value });
          }
        }

        toast.success("House type updated");
      } else {
        const { data: newHouseType, error } = await supabase
          .from("house_types")
          .insert({ site_id: site.id, name: houseTypeName, total_value: 0 })
          .select()
          .single();

        if (error) throw error;

        const liftValuesArray = Object.entries(liftValues).map(([liftType, value]) => ({
          house_type_id: newHouseType.id,
          lift_type: liftType as any,
          value
        }));

        if (liftValuesArray.length > 0) {
          await supabase.from("lift_values").insert(liftValuesArray);
        }

        toast.success("House type created");
      }

      setHouseTypeDialogOpen(false);
      fetchSiteData();
    } catch (error: any) {
      toast.error("Failed to save house type");
      console.error("Error:", error);
    }
  };

  const handlePlotClick = (plot: Plot) => {
    if (!isAdmin) return;
    
    setSelectedPlot(plot);
    setSelectedHouseTypeId(plot.house_type_id || "");
    setPlotDialogOpen(true);
  };

  const handleAssignHouseType = async () => {
    if (!selectedPlot) return;

    try {
      await supabase
        .from("plots")
        .update({ house_type_id: selectedHouseTypeId || null })
        .eq("id", selectedPlot.id);

      toast.success("House type assigned to plot");
      setPlotDialogOpen(false);
      fetchSiteData();
    } catch (error: any) {
      toast.error("Failed to assign house type");
      console.error("Error:", error);
    }
  };

  const handleAssignUserToPlot = async () => {
    if (!selectedPlot || !selectedUserId) return;

    try {
      await supabase
        .from("plots")
        .update({ assigned_to: selectedUserId })
        .eq("id", selectedPlot.id);

      toast.success("User assigned to plot");
      setUserAssignDialogOpen(false);
      setPlotDialogOpen(false);
      fetchSiteData();
    } catch (error: any) {
      toast.error("Failed to assign user");
      console.error("Error:", error);
    }
  };

  const getLiftValue = (houseType: HouseType | null, liftType: string) => {
    if (!houseType) return 0;
    const lift = houseType.lift_values.find(lv => lv.lift_type === liftType);
    return lift ? lift.value : 0;
  };

  const getTotalBooked = (plot: Plot, liftType: string): number => {
    if (!plot.house_types) return 0;
    
    const liftValue = plot.house_types.lift_values.find(lv => lv.lift_type === liftType);
    if (!liftValue) return 0;

    const liftBookings = bookings.filter(b => 
      b.plot_id === plot.id && b.lift_value_id === liftValue.id
    );

    return liftBookings.reduce((sum, b) => sum + b.percentage, 0);
  };

  const getCellColor = (totalBooked: number): string => {
    if (totalBooked === 0) return "bg-background hover:bg-muted/50 cursor-pointer";
    if (totalBooked <= 33) return "bg-green-100 hover:bg-green-200 dark:bg-green-900/20 dark:hover:bg-green-900/30 cursor-pointer";
    if (totalBooked <= 66) return "bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/30 cursor-pointer";
    if (totalBooked < 100) return "bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/20 dark:hover:bg-orange-900/30 cursor-pointer";
    return "bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/30 cursor-not-allowed";
  };

  const handleLiftCellClick = (plot: Plot, liftType: string) => {
    if (!plot.house_types) {
      toast.error("Please assign a house type to this plot first");
      return;
    }

    const totalBooked = getTotalBooked(plot, liftType);
    if (totalBooked >= 100) {
      toast.error("This lift is fully booked");
      return;
    }

    // Open booking dialog for all users
    setSelectedBookingPlot(plot);
    setSelectedBookingLiftType(liftType);
    const remaining = 100 - totalBooked;
    setBookingPercentage(Math.min(100, remaining));
    setBookingDialogOpen(true);
  };

  const handleAddToInvoice = () => {
    if (!selectedBookingPlot || !selectedBookingLiftType) return;

    const liftValue = getLiftValue(selectedBookingPlot.house_types, selectedBookingLiftType);
    const liftValueId = selectedBookingPlot.house_types!.lift_values.find(
      lv => lv.lift_type === selectedBookingLiftType
    )?.id || "";

    const bookedValue = (liftValue * bookingPercentage) / 100;

    const newItem: InvoiceItem = {
      plot: selectedBookingPlot,
      liftType: selectedBookingLiftType,
      liftValueId,
      liftValue,
      percentage: bookingPercentage,
      bookedValue
    };

    setInvoiceItems([...invoiceItems, newItem]);
    setBookingDialogOpen(false);
    toast.success("Added to invoice");
  };

  const handleRemoveFromInvoice = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  const handleAddGangMember = () => {
    if (!memberName || memberAmount <= 0) {
      toast.error("Please fill in all fields");
      return;
    }
    
    setGangMembers([...gangMembers, {
      name: memberName,
      type: memberType,
      amount: memberAmount
    }]);
    
    setMemberName("");
    setMemberAmount(0);
    setGangDialogOpen(false);
  };

  const handleRemoveGangMember = (index: number) => {
    setGangMembers(gangMembers.filter((_, i) => i !== index));
  };

  const totalInvoiceValue = invoiceItems.reduce((sum, item) => sum + item.bookedValue, 0);
  const totalGangAllocated = gangMembers.reduce((sum, m) => sum + m.amount, 0);
  const remainingToAllocate = totalInvoiceValue - totalGangAllocated;

  const handleConfirmInvoice = async () => {
    if (!user) return;

    if (gangMembers.length === 0) {
      toast.error("Please add at least one gang member");
      return;
    }

    if (Math.abs(remainingToAllocate) > 0.01) {
      toast.error("Please allocate the full invoice value to gang members");
      return;
    }

    try {
      const invoiceNumber = `INV-${Date.now()}`;
      
      for (const item of invoiceItems) {
        const { data: booking, error: bookingError } = await supabase
          .from("bookings")
          .insert({
            lift_value_id: item.liftValueId,
            plot_id: item.plot.id,
            booked_by: user.id,
            percentage: item.percentage,
            booked_value: item.bookedValue,
            invoice_number: invoiceNumber,
            status: "confirmed"
          })
          .select()
          .single();

        if (bookingError) throw bookingError;

        const gangDivisions = gangMembers.map(m => ({
          booking_id: booking.id,
          member_name: m.name,
          member_type: m.type,
          amount: m.amount
        }));

        const { error: gangError } = await supabase
          .from("gang_divisions")
          .insert(gangDivisions);

        if (gangError) throw gangError;
      }

      toast.success("Invoice confirmed and sent");
      setInvoiceItems([]);
      setGangMembers([]);
      setInvoiceDialogOpen(false);
      fetchSiteData();
    } catch (error: any) {
      toast.error("Failed to confirm invoice");
      console.error("Error:", error);
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Invoice", 20, 20);
    
    doc.setFontSize(12);
    let y = 40;
    
    doc.text("Invoice Items:", 20, y);
    y += 10;
    
    invoiceItems.forEach((item, index) => {
      doc.setFontSize(10);
      doc.text(`${index + 1}. Plot ${item.plot.plot_number} - ${LIFT_LABELS[item.liftType as keyof typeof LIFT_LABELS]}`, 25, y);
      y += 6;
      doc.text(`   ${item.percentage}% of £${item.liftValue.toFixed(2)} = £${item.bookedValue.toFixed(2)}`, 25, y);
      y += 10;
    });
    
    y += 5;
    doc.setFontSize(12);
    doc.text(`Total Value: £${totalInvoiceValue.toFixed(2)}`, 20, y);
    y += 15;
    
    if (gangMembers.length > 0) {
      doc.text("Gang Division:", 20, y);
      y += 10;
      
      gangMembers.forEach((member) => {
        doc.setFontSize(10);
        doc.text(`${member.name} (${member.type}): £${member.amount.toFixed(2)}`, 25, y);
        y += 8;
      });
      
      y += 5;
      doc.setFontSize(12);
      doc.text(`Total Allocated: £${totalGangAllocated.toFixed(2)}`, 20, y);
    }
    
    doc.save(`invoice-${Date.now()}.pdf`);
    toast.success("PDF exported");
  };

  const handleInviteUser = async () => {
    if (!site || !selectedInviteUserId) return;

    try {
      const { error } = await supabase
        .from("user_site_assignments")
        .insert({
          user_id: selectedInviteUserId,
          site_id: site.id
        });

      if (error) throw error;

      toast.success("User invited to site");
      setInviteUserDialogOpen(false);
      setSelectedInviteUserId("");
      fetchSiteData();
    } catch (error: any) {
      toast.error("Failed to invite user");
      console.error("Error:", error);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!site || !confirm("Remove this user from the site?")) return;

    try {
      const { error } = await supabase
        .from("user_site_assignments")
        .delete()
        .eq("user_id", userId)
        .eq("site_id", site.id);

      if (error) throw error;

      toast.success("User removed from site");
      fetchSiteData();
    } catch (error: any) {
      toast.error("Failed to remove user");
      console.error("Error:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary/30">
        <Header />
        <main className="container py-8">
          <p className="text-center text-muted-foreground">Loading...</p>
        </main>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="min-h-screen bg-secondary/30">
        <Header />
        <main className="container py-8">
          <p className="text-center text-muted-foreground">Site not found</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <Header showBackButton />
      
      <main className="container py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight">{site.name}</h2>
          {site.description && (
            <p className="text-muted-foreground">{site.description}</p>
          )}
        </div>

        <div className="mb-6 flex gap-4 justify-between">
          {isAdmin && (
            <div className="flex gap-4">
              <Button onClick={() => openHouseTypeDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Add House Type
              </Button>
              <Button onClick={() => setInviteUserDialogOpen(true)} variant="outline">
                <Users className="mr-2 h-4 w-4" />
                Invite Users
              </Button>
            </div>
          )}
          
          {!isAdmin && invoiceItems.length > 0 && (
            <Button onClick={() => setInvoiceDialogOpen(true)} className="ml-auto">
              <ShoppingCart className="mr-2 h-4 w-4" />
              View Invoice ({invoiceItems.length})
            </Button>
          )}
        </div>

        {houseTypes.length > 0 && isAdmin && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">House Types</h3>
            <div className="flex gap-2 flex-wrap">
              {houseTypes.map(ht => (
                <Button
                  key={ht.id}
                  variant="outline"
                  size="sm"
                  onClick={() => openHouseTypeDialog(ht)}
                >
                  {ht.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {isAdmin && users.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Invited Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {users.map((u) => (
                  <div key={u.user_id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">{u.profiles.full_name}</p>
                      <p className="text-sm text-muted-foreground">{u.profiles.email}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveUser(u.user_id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Plot Grid</CardTitle>
          </CardHeader>
          <CardContent>
            {plots.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {isAdmin ? "No plots created yet" : "No plots assigned to you"}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="p-2 text-left font-medium">Plot</th>
                      <th className="p-2 text-left font-medium">House Type</th>
                      {Object.values(LIFT_LABELS).map(label => (
                        <th key={label} className="p-2 text-right font-medium whitespace-nowrap text-sm">{label}</th>
                      ))}
                      {isAdmin && <th className="p-2 text-center font-medium">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {plots.map(plot => (
                      <tr key={plot.id} className="border-b">
                        <td className="p-2 font-medium">{plot.plot_number}</td>
                        <td 
                          className={`p-2 ${isAdmin ? 'cursor-pointer hover:bg-primary/10' : ''}`}
                          onClick={() => isAdmin && handlePlotClick(plot)}
                        >
                          {plot.house_types?.name || "-"}
                        </td>
                        {Object.keys(LIFT_LABELS).map(liftType => {
                          const totalBooked = getTotalBooked(plot, liftType);
                          
                          return (
                            <td 
                              key={liftType} 
                              className={`p-2 text-center text-sm transition-colors ${getCellColor(totalBooked)}`}
                              onClick={() => handleLiftCellClick(plot, liftType)}
                            >
                              <div className="flex flex-col items-center justify-center min-h-[60px]">
                                {totalBooked > 0 ? (
                                  <span className="text-lg font-bold">{totalBooked}%</span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                        {isAdmin && (
                          <td className="p-2 text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPlot(plot);
                                setUserAssignDialogOpen(true);
                              }}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* House Type Dialog */}
        <Dialog open={houseTypeDialogOpen} onOpenChange={setHouseTypeDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingHouseType ? "Edit House Type" : "Add House Type"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>House Type Name</Label>
                <Input
                  value={houseTypeName}
                  onChange={(e) => setHouseTypeName(e.target.value)}
                  placeholder="e.g., Type A"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(LIFT_LABELS).map(([key, label]) => (
                  <div key={key} className="space-y-2">
                    <Label>{label}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={liftValues[key] || 0}
                      onChange={(e) => setLiftValues({ ...liftValues, [key]: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                ))}
              </div>
              <Button onClick={handleSaveHouseType} className="w-full">
                Save House Type
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Plot Assignment Dialog */}
        <Dialog open={plotDialogOpen} onOpenChange={setPlotDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage Plot {selectedPlot?.plot_number}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>House Type</Label>
                <Select value={selectedHouseTypeId} onValueChange={setSelectedHouseTypeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select house type" />
                  </SelectTrigger>
                  <SelectContent>
                    {houseTypes.map(ht => (
                      <SelectItem key={ht.id} value={ht.id}>{ht.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAssignHouseType} className="w-full">
                Update House Type
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* User Assignment Dialog */}
        <Dialog open={userAssignDialogOpen} onOpenChange={setUserAssignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign User to Plot {selectedPlot?.plot_number}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>User</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    
                    {users.map(u => (
                      <SelectItem key={u.user_id} value={u.user_id}>
                        {u.profiles.full_name} ({u.profiles.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAssignUserToPlot} className="w-full">
                Assign User
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Invite User Dialog */}
        <Dialog open={inviteUserDialogOpen} onOpenChange={setInviteUserDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite User to Site</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>User</Label>
                <Select value={selectedInviteUserId} onValueChange={setSelectedInviteUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers
                      .filter(u => !users.some(su => su.user_id === u.id))
                      .map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.full_name} ({u.email})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleInviteUser} className="w-full" disabled={!selectedInviteUserId}>
                Invite User
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Booking Dialog */}
        <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Book Work</DialogTitle>
            </DialogHeader>
            {selectedBookingPlot && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Plot {selectedBookingPlot.plot_number}</p>
                  <p className="font-semibold">{LIFT_LABELS[selectedBookingLiftType as keyof typeof LIFT_LABELS]}</p>
                  <p className="text-lg font-bold text-primary mt-2">
                    £{getLiftValue(selectedBookingPlot.house_types, selectedBookingLiftType).toFixed(2)}
                  </p>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Already Booked:</span>
                    <span className="font-semibold">{getTotalBooked(selectedBookingPlot, selectedBookingLiftType)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Available:</span>
                    <span className="font-semibold text-primary">
                      {100 - getTotalBooked(selectedBookingPlot, selectedBookingLiftType)}%
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Percentage: {bookingPercentage}%</Label>
                  <Slider
                    value={[bookingPercentage]}
                    onValueChange={(value) => setBookingPercentage(value[0])}
                    min={1}
                    max={100 - getTotalBooked(selectedBookingPlot, selectedBookingLiftType)}
                    step={1}
                  />
                </div>

                <div className="p-4 bg-primary/10 rounded-lg">
                  <div className="flex justify-between">
                    <span className="font-medium">Booking Value:</span>
                    <span className="text-xl font-bold text-primary">
                      £{((getLiftValue(selectedBookingPlot.house_types, selectedBookingLiftType) * bookingPercentage) / 100).toFixed(2)}
                    </span>
                  </div>
                </div>

                <Button onClick={handleAddToInvoice} className="w-full">
                  Add to Invoice
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Invoice Dialog */}
        <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoice
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Invoice Items */}
              <Card>
                <CardHeader>
                  <CardTitle>Items</CardTitle>
                </CardHeader>
                <CardContent>
                  {invoiceItems.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">No items added</p>
                  ) : (
                    <div className="space-y-2">
                      {invoiceItems.map((item, index) => (
                        <div key={index} className="flex justify-between items-start p-3 bg-muted rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium">
                              Plot {item.plot.plot_number} - {LIFT_LABELS[item.liftType as keyof typeof LIFT_LABELS]}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {item.percentage}% of £{item.liftValue.toFixed(2)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-primary">£{item.bookedValue.toFixed(2)}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveFromInvoice(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      
                      <div className="flex justify-between items-center pt-4 border-t">
                        <span className="font-semibold text-lg">Total:</span>
                        <span className="font-bold text-2xl text-primary">
                          £{totalInvoiceValue.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Gang Division */}
              {invoiceItems.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Gang Division</CardTitle>
                      <Button onClick={() => setGangDialogOpen(true)} size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Member
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {gangMembers.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">
                        No gang members added yet
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {gangMembers.map((member, index) => (
                          <div key={index} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                            <div>
                              <p className="font-medium">{member.name}</p>
                              <p className="text-sm text-muted-foreground capitalize">{member.type}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">£{member.amount.toFixed(2)}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveGangMember(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        
                        <div className="mt-4 pt-4 border-t space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Invoice Total:</span>
                            <span className="font-semibold">£{totalInvoiceValue.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Allocated:</span>
                            <span className="font-semibold">£{totalGangAllocated.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Remaining:</span>
                            <span className={`font-semibold ${remainingToAllocate < 0 ? 'text-destructive' : remainingToAllocate > 0 ? 'text-orange-500' : 'text-green-500'}`}>
                              £{remainingToAllocate.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              {invoiceItems.length > 0 && (
                <div className="flex gap-2">
                  <Button 
                    onClick={handleExportPDF} 
                    variant="outline"
                    className="flex-1"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Export PDF
                  </Button>
                  <Button 
                    onClick={handleConfirmInvoice} 
                    className="flex-1"
                    disabled={gangMembers.length === 0 || Math.abs(remainingToAllocate) > 0.01}
                  >
                    Confirm Invoice
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Gang Member Dialog */}
        <Dialog open={gangDialogOpen} onOpenChange={setGangDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Gang Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder="Enter name"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={memberType} onValueChange={setMemberType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bricklayer">Bricklayer</SelectItem>
                    <SelectItem value="laborer">Laborer</SelectItem>
                    <SelectItem value="hod carrier">Hod Carrier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount (£)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={memberAmount}
                  onChange={(e) => setMemberAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
              <Button onClick={handleAddGangMember} className="w-full">
                Add Member
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default SiteDetail;
