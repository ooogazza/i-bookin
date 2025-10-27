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
import { FileText, Plus, Users } from "lucide-react";
import { GangDivisionCard } from "@/components/invoice/GangDivisionCard";
import { useGangDivision } from "@/hooks/useGangDivision";
import { useSavedGangMembers } from "@/hooks/useSavedGangMembers";

const PlotBooking = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plot, setPlot] = useState<any>(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedLiftId, setSelectedLiftId] = useState("");
  const [percentage, setPercentage] = useState(100);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberType, setMemberType] = useState("bricklayer");
  const [memberAmount, setMemberAmount] = useState(0);

  const { savedMembers, setSavedMembers } = useSavedGangMembers();
  const selectedLiftValue = selectedLiftId
    ? plot?.house_types.lift_values.find(lv => lv.id === selectedLiftId)?.value || 0
    : 0;
  const maxBookingPercentage = Math.min(percentage, 100 - getTotalBooked(selectedLiftId));
  const bookingValue = (selectedLiftValue * maxBookingPercentage) / 100;

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

  const fetchSavedMembers = async () => {
    const { data } = await supabase
      .from("saved_gang_members")
      .select("*")
      .eq("user_id", user.id)
      .order("name");
    setSavedMembers(data || []);
  };

  const fetchPlotData = async () => {
    const { data } = await supabase
      .from("plots")
      .select(`*, house_types (id, name, sites (name), lift_values (*))`)
      .eq("id", id)
      .single();
    setPlot(data);
    const { data: bookingsData } = await supabase
      .from("bookings")
      .select("id, lift_value_id, percentage")
      .eq("plot_id", id);
    setBookings(bookingsData || []);
    setLoading(false);
  };

  const getTotalBooked = (liftValueId: string) =>
    bookings.filter(b => b.lift_value_id === liftValueId).reduce((sum, b) => sum + b.percentage, 0);

  const handleAddExistingMember = (member) => {
    if (gangMembers.some(m => m.id === member.id)) return;
    addMember({ ...member, amount: 0 });
  };

  const handleAddMember = () => {
    addMember({ name: memberName.trim(), type: memberType, amount: memberAmount });
    setMemberName("");
    setMemberAmount(0);
    setDialogOpen(false);
  };

  const handleCreateBooking = async () => {
    const { data: booking } = await supabase
      .from("bookings")
      .insert({
        lift_value_id: selectedLiftId,
        plot_id: plot.id,
        booked_by: user.id,
        percentage,
        booked_value: bookingValue,
        invoice_number: `INV-${Date.now()}`,
        status: "confirmed",
      })
      .select()
      .single();

    const gangDivisions = gangMembers.map(m => ({
      booking_id: booking.id,
      member_name: m.name,
      member_type: m.type,
      amount: m.amount,
    }));

    await supabase.from("gang_divisions").insert(gangDivisions);
    toast.success("Booking created");
    navigate("/booking-in");
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="min-h-screen bg-secondary/30">
      <Header showBackButton />
      <main className="container py-8">
        {/* Lift selection UI omitted for brevity */}

        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Member
        </Button>

        <GangDivisionCard
          gangMembers={gangMembers}
          totalValue={bookingValue}
          totalAllocated={totalAllocated}
          remainingToAllocate={remainingToAllocate}
          onAddMemberClick={() => setDialogOpen(true)}
          onRemoveMember={removeMember}
          onUpdateMemberAmount={updateMemberAmount}
          onStartEditing={startEditing}
          onStopEditing={stopEditing}
          savedMembers={savedMembers}
          onAddExistingMember={handleAddExistingMember}
          totalValueLabel="Booking Value"
        />

        <Button onClick={handleCreateBooking} disabled={remainingToAllocate !== 0}>
          Confirm Booking
        </Button>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Gang Member</DialogTitle>
            </DialogHeader>
            <Input value={memberName} onChange={(e) => setMemberName(e.target.value)} />
            <Select value={memberType} onValueChange={setMemberType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bricklayer">Bricklayer</SelectItem>
                <SelectItem value="laborer">Laborer</SelectItem>
                <SelectItem value="apprentice">Apprentice</SelectItem>
              </SelectContent>
            </Select>
            <Slider value={[memberAmount]} onValueChange={(v) => setMemberAmount(v[0])} max={remainingToAllocate} />
            <Button onClick={handleAddMember}>Add Member</Button>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default PlotBooking;