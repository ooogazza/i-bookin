import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GARAGE_TYPES, getGarageIcon } from "@/lib/garageTypes";
import { Trash2 } from "lucide-react";

interface GarageManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plotId: string;
  plotNumber: number;
  existingGarage?: {
    id: string;
    garage_type: string;
    price: number;
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
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (existingGarage) {
      setGarageType(existingGarage.garage_type);
      setPrice(existingGarage.price.toString());
    } else {
      setGarageType("");
      setPrice("");
    }
  }, [existingGarage, open]);

  const handleSave = async () => {
    if (!garageType || !price || parseFloat(price) <= 0) {
      toast.error("Please fill in all fields with valid values");
      return;
    }

    setLoading(true);
    try {
      if (existingGarage) {
        // Update existing garage
        const { error } = await supabase
          .from("garages")
          .update({
            garage_type: garageType,
            price: parseFloat(price),
          })
          .eq("id", existingGarage.id);

        if (error) throw error;
        toast.success("Garage updated successfully");
      } else {
        // Create new garage
        const { error } = await supabase
          .from("garages")
          .insert({
            plot_id: plotId,
            garage_type: garageType,
            price: parseFloat(price),
          });

        if (error) throw error;
        toast.success("Garage added successfully");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving garage:", error);
      toast.error(error.message || "Failed to save garage");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!existingGarage) return;
    if (!confirm("Are you sure you want to delete this garage?")) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("garages")
        .delete()
        .eq("id", existingGarage.id);

      if (error) throw error;
      toast.success("Garage deleted successfully");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error deleting garage:", error);
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
            {existingGarage ? "Edit" : "Add"} Garage for Plot {plotNumber}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="garageType">Garage Type</Label>
            <Select value={garageType} onValueChange={setGarageType}>
              <SelectTrigger id="garageType">
                <SelectValue placeholder="Select garage type" />
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

          <div className="space-y-2">
            <Label htmlFor="price">Price (£)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Enter garage price"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={loading}
              className="flex-1"
            >
              {existingGarage ? "Update" : "Add"} Garage
            </Button>
            {existingGarage && (
              <Button
                onClick={handleDelete}
                disabled={loading}
                variant="destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
