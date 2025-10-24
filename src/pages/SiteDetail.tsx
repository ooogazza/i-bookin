import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/contexts/AuthContext";

interface Site {
  id: string;
  name: string;
  description: string | null;
}

interface HouseType {
  id: string;
  name: string;
  total_value: number;
}

interface LiftValue {
  id: string;
  lift_type: string;
  value: number;
  house_type_id: string;
}

interface Booking {
  id: string;
  lift_value_id: string;
  percentage: number;
  booked_value: number;
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

const SiteDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [site, setSite] = useState<Site | null>(null);
  const [houseTypes, setHouseTypes] = useState<HouseType[]>([]);
  const [liftValues, setLiftValues] = useState<LiftValue[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedLift, setSelectedLift] = useState<LiftValue | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [percentage, setPercentage] = useState(0);

  useEffect(() => {
    if (id) {
      fetchSiteData();
    }
  }, [id]);

  const fetchSiteData = async () => {
    try {
      // Fetch site details
      const { data: siteData, error: siteError } = await supabase
        .from("sites")
        .select("*")
        .eq("id", id)
        .single();

      if (siteError) throw siteError;
      setSite(siteData);

      // Fetch house types
      const { data: houseTypesData, error: houseTypesError } = await supabase
        .from("house_types")
        .select("*")
        .eq("site_id", id);

      if (houseTypesError) throw houseTypesError;
      setHouseTypes(houseTypesData || []);

      // Fetch lift values
      const { data: liftValuesData, error: liftValuesError } = await supabase
        .from("lift_values")
        .select("*");

      if (liftValuesError) throw liftValuesError;
      setLiftValues(liftValuesData || []);

      // Fetch bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select("*");

      if (bookingsError) throw bookingsError;
      setBookings(bookingsData || []);

    } catch (error: any) {
      toast.error("Failed to load site data");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getLiftValue = (houseTypeId: string, liftType: string) => {
    return liftValues.find(
      (lv) => lv.house_type_id === houseTypeId && lv.lift_type === liftType
    );
  };

  const getTotalBooked = (liftValueId: string) => {
    return bookings
      .filter((b) => b.lift_value_id === liftValueId)
      .reduce((sum, b) => sum + b.percentage, 0);
  };

  const getCellColor = (totalBooked: number) => {
    if (totalBooked === 0) return "bg-status-pending";
    if (totalBooked >= 100) return "bg-status-complete";
    return "bg-status-partial";
  };

  const handleCellClick = (liftValue: LiftValue) => {
    setSelectedLift(liftValue);
    setPercentage(0);
    setDialogOpen(true);
  };

  const handleBooking = async () => {
    if (!selectedLift || !user || percentage === 0) return;

    try {
      const bookedValue = (selectedLift.value * percentage) / 100;

      const { error } = await supabase.from("bookings").insert({
        lift_value_id: selectedLift.id,
        percentage,
        booked_value: bookedValue,
        booked_by: user.id,
      });

      if (error) throw error;

      toast.success("Booking recorded successfully");
      setDialogOpen(false);
      fetchSiteData();
    } catch (error: any) {
      toast.error("Failed to create booking");
      console.error("Error:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary/30">
        <Header />
        <div className="container py-8 text-center">
          <p className="text-muted-foreground">Loading site data...</p>
        </div>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="min-h-screen bg-secondary/30">
        <Header />
        <div className="container py-8 text-center">
          <p className="text-muted-foreground">Site not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <Header />
      
      <main className="container py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">{site.name}</CardTitle>
            {site.description && (
              <p className="text-muted-foreground">{site.description}</p>
            )}
          </CardHeader>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-48">House Type</TableHead>
                    {Object.entries(LIFT_LABELS).map(([key, label]) => (
                      <TableHead key={key} className="text-center">
                        {label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {houseTypes.map((houseType) => (
                    <TableRow key={houseType.id}>
                      <TableCell className="font-medium">{houseType.name}</TableCell>
                      {Object.keys(LIFT_LABELS).map((liftType) => {
                        const liftValue = getLiftValue(houseType.id, liftType);
                        if (!liftValue) {
                          return (
                            <TableCell key={liftType} className="text-center">
                              <Badge variant="secondary">N/A</Badge>
                            </TableCell>
                          );
                        }
                        const totalBooked = getTotalBooked(liftValue.id);
                        return (
                          <TableCell
                            key={liftType}
                            className={`text-center cursor-pointer ${getCellColor(totalBooked)} hover:opacity-80 transition-opacity`}
                            onClick={() => handleCellClick(liftValue)}
                          >
                            <div className="font-medium">{totalBooked}%</div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Book Lift Progress</DialogTitle>
          </DialogHeader>
          {selectedLift && (
            <div className="space-y-4">
              <div>
                <Label>Lift Value</Label>
                <p className="text-2xl font-bold">£{selectedLift.value.toFixed(2)}</p>
              </div>
              <div>
                <Label>Already Booked</Label>
                <p className="text-lg">
                  {getTotalBooked(selectedLift.id)}% (£
                  {((selectedLift.value * getTotalBooked(selectedLift.id)) / 100).toFixed(2)})
                </p>
              </div>
              <div>
                <Label>Remaining Value</Label>
                <p className="text-lg">
                  £
                  {(
                    selectedLift.value -
                    (selectedLift.value * getTotalBooked(selectedLift.id)) / 100
                  ).toFixed(2)}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Book Percentage: {percentage}%</Label>
                <Slider
                  value={[percentage]}
                  onValueChange={(values) => setPercentage(values[0])}
                  max={100 - getTotalBooked(selectedLift.id)}
                  step={5}
                  className="w-full"
                />
              </div>
              <div>
                <Label>This Booking Value</Label>
                <p className="text-xl font-bold text-primary">
                  £{((selectedLift.value * percentage) / 100).toFixed(2)}
                </p>
              </div>
              <Button onClick={handleBooking} className="w-full" disabled={percentage === 0}>
                Confirm Booking
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SiteDetail;
