import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Settings, Plus } from "lucide-react";

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

interface User {
  user_id: string;
  profiles: {
    full_name: string;
    email: string;
  };
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
  const [users, setUsers] = useState<User[]>([]);
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

  useEffect(() => {
    if (id) fetchSiteData();
  }, [id]);

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
    if (!isAdmin) {
      // Non-admin users navigate to booking page
      navigate(`/plot/${plot.id}/booking`);
      return;
    }
    
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
      <Header />
      
      <main className="container py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight">{site.name}</h2>
          {site.description && (
            <p className="text-muted-foreground">{site.description}</p>
          )}
        </div>

        {isAdmin && (
          <div className="mb-6 flex gap-4">
            <Button onClick={() => openHouseTypeDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add House Type
            </Button>
          </div>
        )}

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
                      <tr key={plot.id} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium">{plot.plot_number}</td>
                        <td 
                          className="p-2 cursor-pointer hover:bg-primary/10"
                          onClick={() => handlePlotClick(plot)}
                        >
                          {plot.house_types?.name || "-"}
                        </td>
                        {Object.keys(LIFT_LABELS).map(liftType => (
                          <td key={liftType} className="p-2 text-right text-sm">
                            £{getLiftValue(plot.house_types, liftType).toFixed(2)}
                          </td>
                        ))}
                        {isAdmin && (
                          <td className="p-2 text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
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
                    <SelectItem value="">None</SelectItem>
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
                    <SelectItem value="">None</SelectItem>
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
      </main>
    </div>
  );
};

export default SiteDetail;
