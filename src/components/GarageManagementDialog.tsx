import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GARAGE_TYPES, GARAGE_LIFT_TYPES, getGarageIcon } from "@/lib/garageTypes";
import { Trash2 } from "lucide-react";

interface GarageManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plotId: string;
  plotNumber: number;
  existingGarage?: {
    id: string;
    garage_type: string;
    lift_1_value: number;
    lift_2_value: number;
    cut_ups_value: number;
  } | null;
  onSuccess: () => void;
}

export function GarageManagementDialog({
  open,
  onOpenChange,
  plotId,
  plotNumber,
  existingGarage,
  onSuccess,
}: GarageManagementDialogProps) {
  const [garageType, setGarageType] = useState("");
  const [liftValues, setLiftValues] = useState({
    lift_1: "",
    lift_2: "",
    cut_ups: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (existingGarage) {
      setGarageType(existingGarage.garage_type);
      setLiftValues({
        lift_1: existingGarage.lift_1_value.toString(),
        lift_2: existingGarage.lift_2_value.toString(),
        cut_ups: existingGarage.cut_ups_value.toString(),
      });
    } else {
      setGarageType("");
      setLiftValues({ lift_1: "", lift_2: "", cut_ups: "" });
    }
  }, [existingGarage, open]);

  const handleSave = async () => {
    if (!garageType) {
      toast.error("Please select a garage type");
      return;
    }

    setLoading(true);
    try {
      const data = {
        garage_type: garageType,
        lift_1_value: parseFloat(liftValues.lift_1) || 0,
        lift_2_value: parseFloat(liftValues.lift_2) || 0,
        cut_ups_value: parseFloat(liftValues.cut_ups) || 0,
      };

      if (existingGarage) {
        const { error } = await supabase
          .from("garages")
          .update(data)
          .eq("id", existingGarage.id);
        if (error) throw error;
        toast.success("Garage updated");
      } else {
        const { error } = await supabase
          .from("garages")
          .insert({ ...data, plot_id: plotId });
        if (error) throw error;
        toast.success("Garage added");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save garage");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!existingGarage || !confirm("Delete this garage?")) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("garages").delete().eq("id", existingGarage.id);
      if (error) throw error;
      toast.success("Garage deleted");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Failed to delete garage");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {existingGarage ? "Edit" : "Add"} Garage - Plot {plotNumber}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Garage Type</Label>
            <Select value={garageType} onValueChange={setGarageType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {GARAGE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {getGarageIcon(type.value)} {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            {Object.entries(GARAGE_LIFT_TYPES).map(([key, label]) => (
              <div key={key} className="space-y-1">
                <Label className="text-sm">{label} (£)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={liftValues[key as keyof typeof liftValues]}
                  onChange={(e) => setLiftValues({ ...liftValues, [key]: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={loading} className="flex-1">
              {existingGarage ? "Update" : "Add"}
            </Button>
            {existingGarage && (
              <Button onClick={handleDelete} disabled={loading} variant="destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
