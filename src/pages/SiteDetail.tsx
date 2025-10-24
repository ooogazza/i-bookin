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
import { Settings, Plus, Users, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
    if (totalBooked === 0) return "bg-background hover:bg-muted/50";
    if (totalBooked <= 33) return "bg-green-100 hover:bg-green-200 dark:bg-green-900/20 dark:hover:bg-green-900/30";
    if (totalBooked <= 66) return "bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/30";
    if (totalBooked < 100) return "bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/20 dark:hover:bg-orange-900/30";
    return "bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/30";
  };

  const handleLiftCellClick = (plot: Plot, liftType: string) => {
    if (!plot.house_types) {
      toast.error("Please assign a house type to this plot first");
      return;
    }

    if (!isAdmin) {
      // Non-admin users navigate to booking page
      navigate(`/plot/${plot.id}/booking`);
      return;
    }

    // Admins manage plot assignments
    setSelectedPlot(plot);
    setSelectedHouseTypeId(plot.house_type_id || "");
    setPlotDialogOpen(true);
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

        {isAdmin && (
          <div className="mb-6 flex gap-4">
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
                          className="p-2 cursor-pointer hover:bg-primary/10"
                          onClick={() => handlePlotClick(plot)}
                        >
                          {plot.house_types?.name || "-"}
                        </td>
                        {Object.keys(LIFT_LABELS).map(liftType => {
                          const totalBooked = getTotalBooked(plot, liftType);
                          const value = getLiftValue(plot.house_types, liftType);
                          
                          return (
                            <td 
                              key={liftType} 
                              className={`p-2 text-center text-sm cursor-pointer transition-colors ${getCellColor(totalBooked)}`}
                              onClick={() => handleLiftCellClick(plot, liftType)}
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">£{value.toFixed(2)}</span>
                                {totalBooked > 0 && (
                                  <span className="text-xs font-semibold">{totalBooked}%</span>
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
      </main>
    </div>
  );
};

export default SiteDetail;
