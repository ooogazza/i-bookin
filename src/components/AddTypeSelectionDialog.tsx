import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import houseIcon from "@/assets/house-icon.png";
import garageSingleIcon from "@/assets/garage-single.png";

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
            <img src={houseIcon} alt="House" className="h-8 w-8 object-contain" />
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
            <img src={garageSingleIcon} alt="Garage" className="h-8 w-8 object-contain" />
            Add Garage Type
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
