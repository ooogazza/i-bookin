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

const PlotBooking = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [plot, setPlot] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedLiftId, setSelectedLiftId] = useState("");
  const [percentage, setPercentage] = useState(100);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberType, setMemberType] = useState("bricklayer");
  const [memberAmount, setMemberAmount] = useState(0);

  const { savedMembers, setSavedMembers } = useSavedGangMembers();

  const selectedLiftValue = useMemo(() => {
    if (!plot || !selectedLiftId) return 0;
    const lift = plot.house_types.lift_values.find((lv) => lv.id === selectedLiftId);
    return lift ? lift.value : 0;
  }, [plot, selectedLiftId]);

  const bookingValue = useMemo(() => {
    return (selectedLiftValue * percentage) / 100;
  }, [selectedLiftValue, percentage]);

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
    if (user) fetchSavedMembers();
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
      .select("id, lift_value_id, percentage")
      .eq("plot_id", id);
    setBookings(bookingsData || []);
    setLoading(false);
  };

  const fetchSavedMembers = async () => {
    const { data, error } = await supabase.from("saved_gang_members").select("*").eq("user_id", user?.id).order("name");
    if (!error && data) setSavedMembers(data);
  };

  const getTotalBooked = (liftValueId: string): number =>
    bookings.filter((b) => b.lift_value_id === liftValueId).reduce((sum, b) => sum + b.percentage, 0);

  const getRemainingPercentage = (liftValueId: string): number => 100 - getTotalBooked(liftValueId);

  const getAvailableLifts = () => {
    if (!plot) return [];
    return plot.house_types.lift_values.filter((lv) => getRemainingPercentage(lv.id) > 0);
  };

  const handleAddExistingMember = (member) => {
    if (gangMembers.some((m) => m.id === member.id)) {
      toast.error("Already added");
      return;
    }
    addMember({ ...member, amount: 0 });
    toast.success(`${member.name} added`);
  };

  const handleAddMember = () => {
    addMember({
      name: memberName.trim(),
      type: memberType,
      amount: memberAmount,
    });
    setMemberName("");
    setMemberAmount(0);
    setDialogOpen(false);
  };

  const handleDeletePermanently = async (memberId: string, index: number) => {
    const { error } = await supabase.from("saved_gang_members").delete().eq("id", memberId).eq("user_id", user?.id);
    if (!error) {
      setSavedMembers(savedMembers.filter((m) => m.id !== memberId));
      removeMember(index);
      toast.success("Deleted permanently");
    }
  };

  const handleCreateBooking = async () => {
    if (!user || !plot || !selectedLiftId) return;

    if (gangMembers.length === 0) {
      toast.error("Please add at least one gang member");
      return;
    }

    if (Math.abs(remainingToAllocate) > 0.01) {
      toast.error("Please allocate the full booking value");
      return;
    }

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
            <CardTitle>Select Lift</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Label>Lift Type</Label>
            <Select value={selectedLiftId} onValueChange={setSelectedLiftId}>
              <SelectTrigger>
                <SelectValue placeholder="Select lift" />
              </SelectTrigger>
              <SelectContent>
                {getAvailableLifts().map((lv) => (
                  <SelectItem key={lv.id} value={lv.id}>
                    {lv.lift_type} – £{lv.value.toFixed(2)} ({getRemainingPercentage(lv.id)}% available)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedLiftId && (
              <>
                <Label
                  className="cursor-pointer hover:text-primary"
                  onClick={() => setPercentage(getRemainingPercentage(selectedLiftId))}
                >
                  Percentage: {percentage}%
                </Label>
                <Slider
                  value={[percentage]}
                  onValueChange={(value) => setPercentage(value[0])}
                  min={1}
                  max={getRemainingPercentage(selectedLiftId)}
                  step={1}
                />

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
          </CardContent>
        </Card>

        {selectedLiftId && (
          <>
            <div className="flex items-center gap-2">
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Member
              </Button>
            </div>

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
              <DialogTitle>Add Gang Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder="Enter name" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
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
              <div className="space-y-2">
                <Label>
                  Amount: £{memberAmount.toFixed(2)} (£{remainingToAllocate.toFixed(2)} remaining)
                </Label>
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
