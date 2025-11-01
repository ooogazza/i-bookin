import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

interface PlotSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plotId: string;
  plotNumber: number;
  siteId: string;
  currentlyAssignedTo: string | null;
  existingGarage?: {
    id: string;
    garage_type_id: string | null;
  } | null;
  onSuccess: () => void;
}

export function PlotSettingsDialog({
  open,
  onOpenChange,
  plotId,
  plotNumber,
  siteId,
  currentlyAssignedTo,
  existingGarage,
  onSuccess,
}: PlotSettingsDialogProps) {
  const [selectedBricklayer, setSelectedBricklayer] = useState<string>("");
  const [selectedGarageType, setSelectedGarageType] = useState<string>("");
  const [bricklayers, setBricklayers] = useState<Array<{ id: string; full_name: string }>>([]);
  const [garageTypes, setGarageTypes] = useState<Array<{ id: string; garage_type: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchBricklayers();
      fetchGarageTypes();
      setSelectedBricklayer(currentlyAssignedTo || "");
      setSelectedGarageType(existingGarage?.garage_type_id || "");
    }
  }, [open, currentlyAssignedTo, existingGarage]);

  const fetchBricklayers = async () => {
    try {
      const { data, error } = await supabase
        .from("user_site_assignments")
        .select(`
          user_id,
          profiles!inner(id, full_name)
        `)
        .eq("site_id", siteId);

      if (error) throw error;

      const users = data?.map(d => ({
        id: d.profiles.id,
        full_name: d.profiles.full_name || "Unknown"
      })) || [];

      setBricklayers(users);
    } catch (error: any) {
      console.error("Error fetching bricklayers:", error);
    }
  };

  const fetchGarageTypes = async () => {
    try {
      const { data, error } = await supabase
        .from("garage_types")
        .select("id, garage_type")
        .eq("site_id", siteId);

      if (error) throw error;
      setGarageTypes(data || []);
    } catch (error: any) {
      console.error("Error fetching garage types:", error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Update plot assignment
      const { error: plotError } = await supabase
        .from("plots")
        .update({ assigned_to: selectedBricklayer || null })
        .eq("id", plotId);

      if (plotError) throw plotError;

      // Handle garage assignment
      if (selectedGarageType) {
        if (existingGarage) {
          // Update existing garage
          const { error: garageError } = await supabase
            .from("garages")
            .update({ garage_type_id: selectedGarageType })
            .eq("id", existingGarage.id);
          if (garageError) throw garageError;
        } else {
          // Create new garage
          const { error: garageError } = await supabase
            .from("garages")
            .insert({
              plot_id: plotId,
              garage_type_id: selectedGarageType,
              garage_type: "", // Will be populated from garage_types
              lift_1_value: 0,
              lift_2_value: 0,
              cut_ups_value: 0,
              snag_patch_int_value: 0,
              snag_patch_ext_value: 0
            });
          if (garageError) throw garageError;
        }
      } else if (existingGarage && !selectedGarageType) {
        // Remove garage if unselected
        const { error: deleteError } = await supabase
          .from("garages")
          .delete()
          .eq("id", existingGarage.id);
        if (deleteError) throw deleteError;
      }

      toast.success("Plot settings updated");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update plot settings");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveGarage = async () => {
    if (!existingGarage || !confirm("Remove this garage?")) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("garages").delete().eq("id", existingGarage.id);
      if (error) throw error;
      toast.success("Garage removed");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Failed to remove garage");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Plot {plotNumber} Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Assign Bricklayer</Label>
            <Select value={selectedBricklayer || undefined} onValueChange={(val) => setSelectedBricklayer(val || "")}>
              <SelectTrigger>
                <SelectValue placeholder="No assignment" />
              </SelectTrigger>
              <SelectContent>
                {bricklayers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedBricklayer && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedBricklayer("")}>
                Clear assignment
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label>Assign Garage</Label>
            <Select value={selectedGarageType || undefined} onValueChange={(val) => setSelectedGarageType(val || "")}>
              <SelectTrigger>
                <SelectValue placeholder="No garage" />
              </SelectTrigger>
              <SelectContent>
                {garageTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.garage_type === "single" ? "Single Garage" : "Double Garage"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedGarageType && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedGarageType("")}>
                Clear garage
              </Button>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={loading} className="flex-1">
              Save
            </Button>
            {existingGarage && (
              <Button onClick={handleRemoveGarage} disabled={loading} variant="destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
