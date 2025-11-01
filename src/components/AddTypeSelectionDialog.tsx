import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Building2, Car } from "lucide-react";

interface AddTypeSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectHouseType: () => void;
  onSelectGarageType: () => void;
}

export function AddTypeSelectionDialog({
  open,
  onOpenChange,
  onSelectHouseType,
  onSelectGarageType,
}: AddTypeSelectionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Type</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Button
            onClick={() => {
              onSelectHouseType();
              onOpenChange(false);
            }}
            className="w-full h-20 text-lg justify-start gap-4"
            variant="outline"
          >
            <Building2 className="h-8 w-8" />
            Add House Type
          </Button>
          <Button
            onClick={() => {
              onSelectGarageType();
              onOpenChange(false);
            }}
            className="w-full h-20 text-lg justify-start gap-4"
            variant="outline"
          >
            <Car className="h-8 w-8" />
            Add Garage Type
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
