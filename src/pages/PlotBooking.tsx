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
import { FileText, Plus, X } from "lucide-react";

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

interface GangMember {
  name: string;
  type: string;
  amount: number;
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
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [memberName, setMemberName] = useState("");
  const [memberType, setMemberType] = useState("bricklayer");
  const [memberAmount, setMemberAmount] = useState(0);

  useEffect(() => {
    if (id) fetchPlotData();
  }, [id]);

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
      console.error("Error:", error);
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
    return plot.house_types.lift_values.filter(lv => getRemainingPercentage(lv.id) > 0);
  };

  const handleAddMember = () => {
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
    setDialogOpen(false);
  };

  const handleRemoveMember = (index: number) => {
    setGangMembers(gangMembers.filter((_, i) => i !== index));
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
      toast.error("Failed to create booking");
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
                      <Label>Percentage: {percentage}%</Label>
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
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Gang Division</CardTitle>
                  <Button onClick={() => setDialogOpen(true)} size="sm">
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
                            onClick={() => handleRemoveMember(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex justify-between mb-2">
                        <span className="text-muted-foreground">Total Allocated:</span>
                        <span className="font-semibold">£{totalAllocated.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Remaining:</span>
                        <span className={`font-semibold ${remainingToAllocate < 0 ? 'text-destructive' : 'text-primary'}`}>
                          £{remainingToAllocate.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
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
