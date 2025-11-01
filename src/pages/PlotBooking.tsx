import { useEffect, useState, useMemo } from "react";
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
import { GangDivisionCard } from "@/components/invoice/GangDivisionCard";
import { useGangDivision } from "@/hooks/useGangDivision";
import { useSavedGangMembers } from "@/hooks/useSavedGangMembers";
import { LiftTypeLabel } from "@/components/LiftTypeLabel";
import { getLiftFullLabel } from "@/lib/liftTypeLabels";
import { getGarageLabel, getGarageIcon } from "@/lib/garageTypes";

const PlotBooking = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [plot, setPlot] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [garages, setGarages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedLiftId, setSelectedLiftId] = useState("");
  const [selectedGarageId, setSelectedGarageId] = useState("");
  const [percentage, setPercentage] = useState(100);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberType, setMemberType] = useState("bricklayer");
  const [memberEmail, setMemberEmail] = useState("");

  const { savedMembers, setSavedMembers, fetchSavedMembers } = useSavedGangMembers();

  const selectedLiftValue = useMemo(() => {
    if (!plot || !selectedLiftId) return 0;
    const lift = plot.house_types.lift_values.find((lv) => lv.id === selectedLiftId);
    return lift ? lift.value : 0;
  }, [plot, selectedLiftId]);

  const selectedGarageValue = useMemo(() => {
    if (!garages || !selectedGarageId) return 0;
    const garage = garages.find((g) => g.id === selectedGarageId);
    if (!garage) return 0;
    
    // Calculate value based on selected lift type
    const liftType = selectedGarageId.split('-').pop(); // Extract lift type from ID
    if (liftType === 'lift_1') return garage.lift_1_value;
    if (liftType === 'lift_2') return garage.lift_2_value;
    if (liftType === 'cut_ups') return garage.cut_ups_value;
    return 0;
  }, [garages, selectedGarageId]);

  const bookingValue = useMemo(() => {
    const baseValue = selectedLiftId ? selectedLiftValue : selectedGarageValue;
    return (baseValue * percentage) / 100;
  }, [selectedLiftValue, selectedGarageValue, percentage, selectedLiftId]);

  const {
    gangMembers,
    totalAllocated,
    remainingToAllocate,
    updateMemberAmount,
    addMember,
    removeMember,
    startEditing,
    stopEditing,
    setGangMembers,
  } = useGangDivision([], bookingValue);

  useEffect(() => {
    if (id) fetchPlotData();
  }, [id, user]);

  const fetchPlotData = async () => {
    const { data, error } = await supabase
      .from("plots")
      .select(`*, house_types (id, name, sites (name), lift_values (*))`)
      .eq("id", id)
      .single();
    if (!error && data) setPlot(data);

    const { data: bookingsData } = await supabase
      .from("bookings")
      .select("id, lift_value_id, garage_id, percentage")
      .eq("plot_id", id);
    setBookings(bookingsData || []);

    const { data: garagesData } = await supabase
      .from("garages")
      .select("*")
      .eq("plot_id", id);
    setGarages(garagesData || []);

    setLoading(false);
  };

  const getTotalBooked = (liftValueId: string): number =>
    bookings.filter((b) => b.lift_value_id === liftValueId).reduce((sum, b) => sum + b.percentage, 0);

  const getGarageTotalBooked = (garageIdWithLift: string): number =>
    bookings.filter((b) => b.garage_id && `${b.garage_id}-${b.garage_lift_type}` === garageIdWithLift)
      .reduce((sum, b) => sum + b.percentage, 0);

  const getRemainingPercentage = (liftValueId: string): number => 100 - getTotalBooked(liftValueId);

  const getGarageRemainingPercentage = (garageIdWithLift: string): number => 
    100 - getGarageTotalBooked(garageIdWithLift);

  const getAvailableLifts = () => {
    if (!plot) return [];
    return plot.house_types.lift_values.filter((lv) => getRemainingPercentage(lv.id) > 0);
  };

  const getAvailableGarages = () => {
    const available: Array<{ id: string; label: string; value: number; garageId: string; liftType: string }> = [];
    
    garages.forEach((g) => {
      if (g.lift_1_value > 0 && getGarageRemainingPercentage(`${g.id}-lift_1`) > 0) {
        available.push({
          id: `${g.id}-lift_1`,
          label: `${getGarageLabel(g.garage_type)} - Lift 1`,
          value: g.lift_1_value,
          garageId: g.id,
          liftType: 'lift_1'
        });
      }
      if (g.lift_2_value > 0 && getGarageRemainingPercentage(`${g.id}-lift_2`) > 0) {
        available.push({
          id: `${g.id}-lift_2`,
          label: `${getGarageLabel(g.garage_type)} - Lift 2`,
          value: g.lift_2_value,
          garageId: g.id,
          liftType: 'lift_2'
        });
      }
      if (g.cut_ups_value > 0 && getGarageRemainingPercentage(`${g.id}-cut_ups`) > 0) {
        available.push({
          id: `${g.id}-cut_ups`,
          label: `${getGarageLabel(g.garage_type)} - Cut-Ups`,
          value: g.cut_ups_value,
          garageId: g.id,
          liftType: 'cut_ups'
        });
      }
    });
    
    return available;
  };

  const handleAddExistingMember = (member) => {
    if (gangMembers.some((m) => m.id === member.id)) {
      toast.error("Already added");
      return;
    }
    addMember({ ...member, amount: 0 });
    toast.success(`${member.name} added`);
  };

  const handleAddMember = async () => {
    if (!memberName.trim() || !user) {
      toast.error("Name required");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("saved_gang_members")
        .insert({
          user_id: user.id,
          name: memberName.trim(),
          type: memberType,
          email: memberEmail.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh saved members list
      await fetchSavedMembers();
      
      // Add to current gang with zero amount
      addMember({
        id: data.id,
        name: data.name,
        type: data.type,
        email: data.email,
        amount: 0,
        editing: false,
      });

      setMemberName("");
      setMemberEmail("");
      setMemberType("bricklayer");
      setDialogOpen(false);
      toast.success("Gang member saved");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save gang member");
    }
  };

  const handleDeletePermanently = async (memberId: string, index: number) => {
    const { error } = await supabase.from("saved_gang_members").delete().eq("id", memberId).eq("user_id", user?.id);
    if (!error) {
      await fetchSavedMembers();
      removeMember(index);
      toast.success("Deleted permanently");
    }
  };

  const handleCreateBooking = async () => {
    if (!user || !plot) return;

    if (!selectedLiftId && !selectedGarageId) {
      toast.error("Please select a lift or garage to book");
      return;
    }

    if (gangMembers.length === 0) {
      toast.error("Please add at least one gang member");
      return;
    }

    if (Math.abs(remainingToAllocate) > 0.01) {
      toast.error("Please allocate the full booking value");
      return;
    }

    const invoiceNumber = `INV-${Date.now()}`;
    
    // Extract garage ID and lift type if garage is selected
    let garageId = null;
    let garageLiftType = null;
    if (selectedGarageId) {
      const parts = selectedGarageId.split('-');
      garageLiftType = parts.pop();
      garageId = parts.join('-');
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        lift_value_id: selectedLiftId || null,
        garage_id: garageId,
        garage_lift_type: garageLiftType,
        plot_id: plot.id,
        booked_by: user.id,
        percentage,
        booked_value: bookingValue,
        invoice_number: invoiceNumber,
        status: "confirmed",
      })
      .select()
      .single();

    if (bookingError) {
      toast.error("Failed to create booking");
      return;
    }

    const gangDivisions = gangMembers.map((m) => ({
      booking_id: booking.id,
      member_name: m.name,
      member_type: m.type,
      email: m.email || null,
      amount: m.amount,
    }));

    const { error: gangError } = await supabase.from("gang_divisions").insert(gangDivisions);

    if (gangError) {
      toast.error("Failed to save gang divisions");
      return;
    }

    toast.success("Booking created successfully");
    navigate("/booking-in");
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
      <main className="container py-8 space-y-6">
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Create Booking
          </h2>
          <p className="text-muted-foreground">
            {plot.house_types.sites.name} – Plot {plot.plot_number} – {plot.house_types.name}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select Work Type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Label>Work Type</Label>
            <Select 
              value={selectedLiftId || selectedGarageId} 
              onValueChange={(value) => {
                if (value.includes('-lift_') || value.includes('-cut_ups')) {
                  setSelectedGarageId(value);
                  setSelectedLiftId("");
                } else {
                  setSelectedLiftId(value);
                  setSelectedGarageId("");
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select lift or garage" />
              </SelectTrigger>
              <SelectContent>
                {getAvailableLifts().length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">House Lifts</div>
                    {getAvailableLifts().map((lv) => (
                      <SelectItem key={lv.id} value={lv.id}>
                        {getLiftFullLabel(lv.lift_type)} – £{lv.value.toFixed(2)} ({getRemainingPercentage(lv.id)}% available)
                      </SelectItem>
                    ))}
                  </>
                )}
                {getAvailableGarages().length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Garages</div>
                    {getAvailableGarages().map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {getGarageIcon(g.garageId.split('-')[0])} {g.label} – £{g.value.toFixed(2)} ({getGarageRemainingPercentage(g.id)}% available)
                      </SelectItem>
                    ))}
                  </>
                )}
                {getAvailableLifts().length === 0 && getAvailableGarages().length === 0 && (
                  <SelectItem value="none" disabled>No work available to book</SelectItem>
                )}
              </SelectContent>
            </Select>

            {(selectedLiftId || selectedGarageId) && (
              <>
                <div className="flex items-center gap-2">
                  <Label>Percentage:</Label>
                  <Input
                    type="number"
                    value={percentage}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      const max = selectedLiftId 
                        ? getRemainingPercentage(selectedLiftId) 
                        : getGarageRemainingPercentage(selectedGarageId);
                      if (!isNaN(val) && val >= 1 && val <= max) {
                        setPercentage(val);
                      }
                    }}
                    className="w-24"
                    min="1"
                    max={selectedLiftId ? getRemainingPercentage(selectedLiftId) : getGarageRemainingPercentage(selectedGarageId)}
                  />
                  <span>%</span>
                </div>
                <Slider
                  value={[percentage]}
                  onValueChange={(value) => setPercentage(value[0])}
                  min={1}
                  max={selectedLiftId ? getRemainingPercentage(selectedLiftId) : getGarageRemainingPercentage(selectedGarageId)}
                  step={1}
                />

                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span className="text-muted-foreground">Total Value:</span>
                    <span className="font-semibold">£{(selectedLiftId ? selectedLiftValue : selectedGarageValue).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Booking Value ({percentage}%):</span>
                    <span className="font-semibold text-primary">£{bookingValue.toFixed(2)}</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {(selectedLiftId || selectedGarageId) && (
          <>
            <GangDivisionCard
              gangMembers={gangMembers}
              totalValue={bookingValue}
              totalAllocated={totalAllocated}
              remainingToAllocate={remainingToAllocate}
              onAddMemberClick={() => setDialogOpen(true)}
              onRemoveMember={removeMember}
              onDeletePermanently={handleDeletePermanently}
              onUpdateMemberAmount={updateMemberAmount}
              onStartEditing={startEditing}
              onStopEditing={stopEditing}
              savedMembers={savedMembers}
              onAddExistingMember={handleAddExistingMember}
              totalValueLabel="Booking Value"
            />

            {gangMembers.length > 0 && (
              <Button
                onClick={handleCreateBooking}
                size="lg"
                className="w-full"
                disabled={Math.abs(remainingToAllocate) > 0.01}
              >
                Confirm Booking
              </Button>
            )}
          </>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Add New Gang Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder="Enter name" />
              </div>
              <div className="space-y-2">
                <Label>Email (Optional)</Label>
                <Input 
                  type="email"
                  value={memberEmail} 
                  onChange={(e) => setMemberEmail(e.target.value)} 
                  placeholder="Enter email address" 
                />
              </div>
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select value={memberType} onValueChange={setMemberType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bricklayer">Bricklayer</SelectItem>
                    <SelectItem value="laborer">Laborer</SelectItem>
                    <SelectItem value="apprentice">Apprentice</SelectItem>
                  </SelectContent>
                </Select>
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
