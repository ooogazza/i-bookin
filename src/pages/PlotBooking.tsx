import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { FileText, Plus } from "lucide-react";
import { gangMemberSchema, bookingSchema } from "@/lib/validations";
import { GangDivisionCard } from "@/components/invoice/GangDivisionCard";

interface Plot {
  id: string;
  plot_number: number;
  site_id: string;
  house_types: {
    id: string;
    name: string;
    sites: {
      name: string;
    };
    lift_values: {
      id: string;
      lift_type: string;
      value: number;
    }[];
  };
}

interface SavedGangMember {
  id: string;
  name: string;
  type: string;
}

interface GangMember {
  id?: string;
  name: string;
  type: string;
  amount: number;
  editing?: boolean;
}

interface Booking {
  id: string;
  lift_value_id: string;
  percentage: number;
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

const PlotBooking = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plot, setPlot] = useState<Plot | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedLiftId, setSelectedLiftId] = useState("");
  const [percentage, setPercentage] = useState(100);
  const [gangMembers, setGangMembers] = useState<GangMember[]>([]);
  const [savedMembers, setSavedMembers] = useState<SavedGangMember[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [memberName, setMemberName] = useState("");
  const [memberType, setMemberType] = useState("bricklayer");
  const [memberAmount, setMemberAmount] = useState(0);
  const [editingPercentage, setEditingPercentage] = useState(false);
  const [tempPercentage, setTempPercentage] = useState("");

  useEffect(() => {
    if (id) fetchPlotData();
    if (user) fetchSavedMembers();
  }, [id, user]);

  const fetchSavedMembers = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("saved_gang_members")
        .select("*")
        .eq("user_id", user.id)
        .order("name");

      if (error) throw error;
      setSavedMembers(data || []);
    } catch (error: any) {
      console.error("Failed to load saved members:", error);
    }
  };

  const fetchPlotData = async () => {
    try {
      const { data, error } = await supabase
        .from("plots")
        .select(`
          *,
          house_types (
            id,
            name,
            sites (
              name
            ),
            lift_values (*)
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      setPlot(data as any);

      // Fetch existing bookings for this plot
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select("id, lift_value_id, percentage")
        .eq("plot_id", id);

      if (bookingsError) throw bookingsError;
      setBookings(bookingsData || []);
    } catch (error: any) {
      toast.error("Failed to load plot data");
      if (import.meta.env.DEV) {
        console.error("Error:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  const getLiftValue = (liftType: string) => {
    if (!plot) return 0;
    const lift = plot.house_types.lift_values.find(lv => lv.lift_type === liftType);
    return lift ? lift.value : 0;
  };

  const getLiftValueId = (liftType: string) => {
    if (!plot) return "";
    const lift = plot.house_types.lift_values.find(lv => lv.lift_type === liftType);
    return lift ? lift.id : "";
  };

  const getTotalBooked = (liftValueId: string): number => {
    return bookings
      .filter(b => b.lift_value_id === liftValueId)
      .reduce((sum, b) => sum + b.percentage, 0);
  };

  const getRemainingPercentage = (liftValueId: string): number => {
    return 100 - getTotalBooked(liftValueId);
  };

  const getAvailableLifts = () => {
    if (!plot) return [];
    return plot.house_types.lift_values.filter(lv => lv.id && lv.id !== "" && getRemainingPercentage(lv.id) > 0);
  };

  const handleAddMember = async () => {
    if (!user) return;

    try {
      // Validate input
      gangMemberSchema.parse({
        name: memberName,
        type: memberType,
        amount: memberAmount,
      });

      const trimmedName = memberName.trim();

      // Check if this member already exists in saved members
      const existingMember = savedMembers.find(
        m => m.name.toLowerCase() === trimmedName.toLowerCase() && m.type === memberType
      );

      let memberId = existingMember?.id;

      // If not, save to database
      if (!existingMember) {
        const { data, error } = await supabase
          .from("saved_gang_members")
          .insert({
            user_id: user.id,
            name: trimmedName,
            type: memberType
          })
          .select()
          .single();

        if (error) throw error;
        memberId = data.id;
        setSavedMembers([...savedMembers, data]);
      }

      setGangMembers([...gangMembers, {
        id: memberId,
        name: trimmedName,
        type: memberType,
        amount: memberAmount
      }]);
      
      setMemberName("");
      setMemberAmount(0);
      setDialogOpen(false);
    } catch (error: any) {
      if (error.errors?.[0]?.message) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Invalid input. Please check all fields.");
      }
    }
  };

  const handleAddExistingMember = (member: SavedGangMember) => {
    // Check if already added
    if (gangMembers.some(m => m.id === member.id)) {
      toast.error("This member is already added");
      return;
    }

    setGangMembers([...gangMembers, {
      id: member.id,
      name: member.name,
      type: member.type,
      amount: 0
    }]);
    toast.success(`${member.name} added`);
  };

  const handleDeletePermanently = async (memberId: string, index: number) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("saved_gang_members")
        .delete()
        .eq("id", memberId)
        .eq("user_id", user.id);

      if (error) throw error;

      // Remove from saved members list
      setSavedMembers(savedMembers.filter(m => m.id !== memberId));
      
      // Also remove from current gang members if present
      setGangMembers(gangMembers.filter((_, i) => i !== index));
      
      toast.success("Gang member deleted permanently");
    } catch (error: any) {
      toast.error("Failed to delete gang member");
      console.error("Delete error:", error);
    }
  };

  const handleRemoveMember = (index: number) => {
    setGangMembers(gangMembers.filter((_, i) => i !== index));
  };

  const handleUpdateMemberAmount = (index: number, newAmount: number) => {
    const updated = [...gangMembers];
    updated[index].amount = newAmount;
    setGangMembers(updated);
  };

  const startEditingMember = (index: number) => {
    const updated = [...gangMembers];
    updated[index].editing = true;
    setGangMembers(updated);
  };

  const stopEditingMember = (index: number) => {
    const updated = [...gangMembers];
    updated[index].editing = false;
    setGangMembers(updated);
  };

  const totalAllocated = gangMembers.reduce((sum, m) => sum + m.amount, 0);
  const selectedLiftValue = selectedLiftId ? 
    plot?.house_types.lift_values.find(lv => lv.id === selectedLiftId)?.value || 0 
    : 0;
  const remainingPercentageForLift = selectedLiftId ? getRemainingPercentage(selectedLiftId) : 100;
  const maxBookingPercentage = Math.min(percentage, remainingPercentageForLift);
  const bookingValue = (selectedLiftValue * maxBookingPercentage) / 100;
  const remainingToAllocate = bookingValue - totalAllocated;

  useEffect(() => {
    // Reset percentage when selecting a new lift
    if (selectedLiftId) {
      const remaining = getRemainingPercentage(selectedLiftId);
      setPercentage(Math.min(100, remaining));
    }
  }, [selectedLiftId]);

  const handleCreateBooking = async () => {
    if (!user || !plot || !selectedLiftId) return;

    if (gangMembers.length === 0) {
      toast.error("Please add at least one gang member");
      return;
    }

    if (Math.abs(remainingToAllocate) > 0.01) {
      toast.error("Please allocate the full booking value to gang members");
      return;
    }

    try {
      // Validate booking data
      bookingSchema.parse({
        percentage,
        invoiceNumber: null,
        notes: null,
      });

      const invoiceNumber = `INV-${Date.now()}`;
      
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          lift_value_id: selectedLiftId,
          plot_id: plot.id,
          booked_by: user.id,
          percentage,
          booked_value: bookingValue,
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

      toast.success("Booking created successfully");
      navigate("/booking-in");
    } catch (error: any) {
      if (error.errors?.[0]?.message) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Failed to create booking");
      }
      if (import.meta.env.DEV) {
        console.error("Error:", error);
      }
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

  if (!plot) {
    return (
      <div className="min-h-screen bg-secondary/30">
        <Header />
        <main className="container py-8">
          <p className="text-center text-muted-foreground">Plot not found</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <Header showBackButton />
      
      <main className="container py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Create Booking
          </h2>
          <p className="text-muted-foreground">
            {plot.house_types.sites.name} - Plot {plot.plot_number} - {plot.house_types.name}
          </p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Lift</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Lift Type</Label>
                  <Select value={selectedLiftId} onValueChange={setSelectedLiftId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select lift" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableLifts().map(lv => {
                        const totalBooked = getTotalBooked(lv.id);
                        const remaining = getRemainingPercentage(lv.id);
                        return (
                          <SelectItem key={lv.id} value={lv.id}>
                            {LIFT_LABELS[lv.lift_type as keyof typeof LIFT_LABELS]} - £{lv.value.toFixed(2)} ({remaining}% available)
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {selectedLiftId && (
                  <>
                    <div className="p-4 bg-muted rounded-lg mb-4">
                      <div className="flex justify-between mb-2">
                        <span className="text-muted-foreground">Already Booked:</span>
                        <span className="font-semibold">{getTotalBooked(selectedLiftId)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Remaining Available:</span>
                        <span className="font-semibold text-primary">{remainingPercentageForLift}%</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        {editingPercentage ? (
                          <Input
                            type="number"
                            value={tempPercentage}
                            onChange={(e) => setTempPercentage(e.target.value)}
                            onBlur={() => {
                              const val = parseInt(tempPercentage);
                              if (!isNaN(val) && val >= 1 && val <= remainingPercentageForLift) {
                                setPercentage(val);
                              }
                              setEditingPercentage(false);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const val = parseInt(tempPercentage);
                                if (!isNaN(val) && val >= 1 && val <= remainingPercentageForLift) {
                                  setPercentage(val);
                                }
                                setEditingPercentage(false);
                              }
                            }}
                            className="w-32"
                            autoFocus
                            step="1"
                            min="1"
                          />
                        ) : (
                          <Label 
                            className="cursor-pointer hover:text-primary transition-colors"
                            onClick={() => {
                              setTempPercentage(percentage.toString());
                              setEditingPercentage(true);
                            }}
                          >
                            Percentage: {percentage}%
                          </Label>
                        )}
                      </div>
                      <Slider
                        value={[percentage]}
                        onValueChange={(value) => setPercentage(value[0])}
                        min={1}
                        max={remainingPercentageForLift}
                        step={1}
                      />
                    </div>

                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex justify-between mb-2">
                        <span className="text-muted-foreground">Total Value:</span>
                        <span className="font-semibold">£{selectedLiftValue.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Booking Value ({percentage}%):</span>
                        <span className="font-semibold text-primary">£{bookingValue.toFixed(2)}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {selectedLiftId && (
            <GangDivisionCard
              gangMembers={gangMembers}
              totalValue={bookingValue}
              totalAllocated={totalAllocated}
              remainingToAllocate={remainingToAllocate}
              onAddMemberClick={() => setDialogOpen(true)}
              onRemoveMember={handleRemoveMember}
              onDeletePermanently={handleDeletePermanently}
              onUpdateMemberAmount={handleUpdateMemberAmount}
              onStartEditing={startEditingMember}
              onStopEditing={stopEditingMember}
              savedMembers={savedMembers}
              onAddExistingMember={handleAddExistingMember}
              totalValueLabel="Booking Value"
            />
          )}

          {selectedLiftId && gangMembers.length > 0 && (
            <Button 
              onClick={handleCreateBooking} 
              size="lg" 
              className="w-full"
              disabled={Math.abs(remainingToAllocate) > 0.01}
            >
              Confirm Booking
            </Button>
          )}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
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
                  autoFocus={false}
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
                    <SelectItem value="apprentice">Apprentice</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount: £{memberAmount.toFixed(2)} (£{remainingToAllocate.toFixed(2)} remaining)</Label>
                <Slider
                  value={[memberAmount]}
                  onValueChange={(value) => setMemberAmount(value[0])}
                  max={remainingToAllocate}
                  step={10}
                  className="w-full"
                />
              </div>
              <Button onClick={handleAddMember} className="w-full">
                Add Member
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default PlotBooking;
