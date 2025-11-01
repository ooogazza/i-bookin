import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GARAGE_TYPES } from "@/lib/garageTypes";
import { Trash2 } from "lucide-react";

interface AddGarageTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteId: string;
  existingGarageType?: {
    id: string;
    garage_type: string;
    lift_1_value: number;
    lift_2_value: number;
    cut_ups_value: number;
    snag_patch_int_value: number;
    snag_patch_ext_value: number;
  } | null;
  onSuccess: () => void;
}

export function AddGarageTypeDialog({
  open,
  onOpenChange,
  siteId,
  existingGarageType,
  onSuccess,
}: AddGarageTypeDialogProps) {
  const [garageType, setGarageType] = useState("");
  const [liftValues, setLiftValues] = useState({
    lift_1: "",
    lift_2: "",
    cut_ups: "",
    snag_patch_int: "",
    snag_patch_ext: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (existingGarageType) {
      setGarageType(existingGarageType.garage_type);
      setLiftValues({
        lift_1: existingGarageType.lift_1_value.toString(),
        lift_2: existingGarageType.lift_2_value.toString(),
        cut_ups: existingGarageType.cut_ups_value.toString(),
        snag_patch_int: existingGarageType.snag_patch_int_value.toString(),
        snag_patch_ext: existingGarageType.snag_patch_ext_value.toString(),
      });
    } else {
      setGarageType("");
      setLiftValues({ lift_1: "", lift_2: "", cut_ups: "", snag_patch_int: "", snag_patch_ext: "" });
    }
  }, [existingGarageType, open]);

  const handleSave = async () => {
    if (!garageType) {
      toast.error("Please select a garage type");
      return;
    }

    setLoading(true);
    try {
      const data = {
        site_id: siteId,
        garage_type: garageType,
        lift_1_value: parseFloat(liftValues.lift_1) || 0,
        lift_2_value: parseFloat(liftValues.lift_2) || 0,
        cut_ups_value: parseFloat(liftValues.cut_ups) || 0,
        snag_patch_int_value: parseFloat(liftValues.snag_patch_int) || 0,
        snag_patch_ext_value: parseFloat(liftValues.snag_patch_ext) || 0,
      };

      if (existingGarageType) {
        const { error } = await supabase
          .from("garage_types")
          .update(data)
          .eq("id", existingGarageType.id);
        if (error) throw error;
        toast.success("Garage type updated");
      } else {
        const { error } = await supabase
          .from("garage_types")
          .insert(data);
        if (error) throw error;
        toast.success("Garage type added");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save garage type");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!existingGarageType || !confirm("Delete this garage type? This will affect all plots using this garage type.")) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("garage_types").delete().eq("id", existingGarageType.id);
      if (error) throw error;
      toast.success("Garage type deleted");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Failed to delete garage type");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {existingGarageType ? "Edit" : "Add"} Garage Type
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
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-sm">Lift 1 (£)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={liftValues.lift_1}
                onChange={(e) => setLiftValues({ ...liftValues, lift_1: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Lift 2 (£)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={liftValues.lift_2}
                onChange={(e) => setLiftValues({ ...liftValues, lift_2: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Cut-Ups (£)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={liftValues.cut_ups}
                onChange={(e) => setLiftValues({ ...liftValues, cut_ups: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Snag/Patch Int (£)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={liftValues.snag_patch_int}
                onChange={(e) => setLiftValues({ ...liftValues, snag_patch_int: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Snag/Patch Ext (£)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={liftValues.snag_patch_ext}
                onChange={(e) => setLiftValues({ ...liftValues, snag_patch_ext: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={loading} className="flex-1">
              {existingGarageType ? "Update" : "Add"}
            </Button>
            {existingGarageType && (
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
