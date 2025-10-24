import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Site {
  id: string;
  name: string;
}

interface HouseType {
  id: string;
  name: string;
  total_value: number;
  sites: { name: string };
}

const LIFT_TYPES = [
  { value: "lift_1", label: "Lift 1" },
  { value: "lift_2", label: "Lift 2" },
  { value: "lift_3", label: "Lift 3" },
  { value: "lift_4", label: "Lift 4" },
  { value: "lift_5", label: "Lift 5" },
  { value: "lift_6", label: "Lift 6" },
  { value: "cut_ups", label: "Cut Ups" },
  { value: "snag", label: "Snag" },
];

const HouseTypes = () => {
  const [sites, setSites] = useState<Site[]>([]);
  const [houseTypes, setHouseTypes] = useState<HouseType[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState("");
  const [name, setName] = useState("");
  const [liftValues, setLiftValues] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSites();
    fetchHouseTypes();
  }, []);

  const fetchSites = async () => {
    try {
      const { data, error } = await supabase
        .from("sites")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setSites(data || []);
    } catch (error: any) {
      toast.error("Failed to load sites");
      console.error("Error:", error);
    }
  };

  const fetchHouseTypes = async () => {
    try {
      const { data, error } = await supabase
        .from("house_types")
        .select("*, sites(name)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setHouseTypes(data || []);
    } catch (error: any) {
      toast.error("Failed to load house types");
      console.error("Error:", error);
    }
  };

  const openCreateDialog = () => {
    setSelectedSite("");
    setName("");
    setLiftValues({});
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Calculate total value
      const totalValue = Object.values(liftValues).reduce(
        (sum, val) => sum + (parseFloat(val) || 0),
        0
      );

      // Create house type
      const { data: houseType, error: houseTypeError } = await supabase
        .from("house_types")
        .insert({
          site_id: selectedSite,
          name,
          total_value: totalValue,
        })
        .select()
        .single();

      if (houseTypeError) throw houseTypeError;

      // Create lift values
      const liftValuesToInsert = LIFT_TYPES.map((lift) => ({
        house_type_id: houseType.id,
        lift_type: lift.value as any,
        value: parseFloat(liftValues[lift.value] || "0"),
      }));

      const { error: liftValuesError } = await supabase
        .from("lift_values")
        .insert(liftValuesToInsert);

      if (liftValuesError) throw liftValuesError;

      toast.success("House type created successfully");
      setDialogOpen(false);
      fetchHouseTypes();
    } catch (error: any) {
      toast.error("Failed to create house type");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <Header showBackButton />
      
      <main className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">House Types & Lifts</h2>
            <p className="text-muted-foreground">Configure house types and lift values</p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            New House Type
          </Button>
        </div>

        <Card>
          <CardContent className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site</TableHead>
                  <TableHead>House Type</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {houseTypes.map((houseType) => (
                  <TableRow key={houseType.id}>
                    <TableCell className="font-medium">{houseType.sites.name}</TableCell>
                    <TableCell>{houseType.name}</TableCell>
                    <TableCell className="text-right">
                      £{houseType.total_value.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New House Type</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="site">Site</Label>
                <Select value={selectedSite} onValueChange={setSelectedSite} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a site" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map((site) => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">House Type Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Stanfield"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Lift Values</Label>
                <div className="grid grid-cols-2 gap-4">
                  {LIFT_TYPES.map((lift) => (
                    <div key={lift.value} className="space-y-1">
                      <Label htmlFor={lift.value} className="text-sm">
                        {lift.label}
                      </Label>
                      <Input
                        id={lift.value}
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={liftValues[lift.value] || ""}
                        onChange={(e) =>
                          setLiftValues({ ...liftValues, [lift.value]: e.target.value })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating..." : "Create House Type"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default HouseTypes;
