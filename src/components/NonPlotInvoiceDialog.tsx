import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { gangMemberSchema } from "@/lib/validations";

interface GangMember {
  name: string;
  type: string;
  amount: number;
}

interface NonPlotInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NonPlotInvoiceDialog = ({ open, onOpenChange }: NonPlotInvoiceDialogProps) => {
  const { user } = useAuth();
  const [invoiceAmount, setInvoiceAmount] = useState(0);
  const [notes, setNotes] = useState("");
  const [gangMembers, setGangMembers] = useState<GangMember[]>([]);
  const [gangDialogOpen, setGangDialogOpen] = useState(false);
  
  const [memberName, setMemberName] = useState("");
  const [memberType, setMemberType] = useState("bricklayer");
  const [memberAmount, setMemberAmount] = useState(0);
  const [editingMemberIndex, setEditingMemberIndex] = useState<number | null>(null);
  const [tempAmount, setTempAmount] = useState("");

  const totalAllocated = gangMembers.reduce((sum, m) => sum + m.amount, 0);
  const remainingToAllocate = invoiceAmount - totalAllocated;

  const handleAddMember = () => {
    if (!memberName.trim()) {
      toast.error("Please enter member name");
      return;
    }

    try {
      gangMemberSchema.parse({
        name: memberName,
        type: memberType,
        amount: memberAmount
      });

      if (memberAmount > remainingToAllocate) {
        toast.error(`Cannot allocate more than £${remainingToAllocate.toFixed(2)}`);
        return;
      }

      setGangMembers([...gangMembers, { name: memberName, type: memberType, amount: memberAmount }]);
      setMemberName("");
      setMemberType("bricklayer");
      setMemberAmount(0);
      setGangDialogOpen(false);
      toast.success("Gang member added");
    } catch (error: any) {
      if (error.errors?.[0]?.message) {
        toast.error(error.errors[0].message);
      }
    }
  };

  const handleRemoveMember = (index: number) => {
    setGangMembers(gangMembers.filter((_, i) => i !== index));
  };

  const handleUpdateMemberAmount = (index: number, newAmount: number) => {
    const member = gangMembers[index];
    const otherMembersTotal = gangMembers
      .filter((_, i) => i !== index)
      .reduce((sum, m) => sum + m.amount, 0);
    
    if (newAmount > invoiceAmount - otherMembersTotal) {
      toast.error(`Cannot allocate more than £${(invoiceAmount - otherMembersTotal).toFixed(2)}`);
      return;
    }

    const updated = [...gangMembers];
    updated[index] = { ...member, amount: newAmount };
    setGangMembers(updated);
  };

  const handleCreateInvoice = async () => {
    if (invoiceAmount <= 0) {
      toast.error("Please set an invoice amount");
      return;
    }

    if (!notes.trim()) {
      toast.error("Please add notes describing the work");
      return;
    }

    if (gangMembers.length === 0) {
      toast.error("Please add at least one gang member");
      return;
    }

    if (Math.abs(remainingToAllocate) > 0.01) {
      toast.error("Please allocate the full invoice amount to gang members");
      return;
    }

    try {
      const invoiceNumber = `INV-${Date.now()}`;
      
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          booked_by: user?.id,
          booked_value: invoiceAmount,
          percentage: 100,
          invoice_number: invoiceNumber,
          notes: notes,
          status: "confirmed",
          plot_id: null,
          lift_value_id: null
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      const gangDivisions = gangMembers.map(m => ({
        booking_id: booking.id,
        member_name: m.name,
        member_type: m.type,
        amount: m.amount
      }));

      const { error: gangError } = await supabase
        .from("gang_divisions")
        .insert(gangDivisions);

      if (gangError) throw gangError;

      toast.success("Invoice created successfully");
      
      // Reset form
      setInvoiceAmount(0);
      setNotes("");
      setGangMembers([]);
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Failed to create invoice");
      if (import.meta.env.DEV) {
        console.error("Error:", error);
      }
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Non-Plot Invoice</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Invoice Amount Slider */}
            <div className="space-y-2">
              <Label>Invoice Amount: £{invoiceAmount.toFixed(2)}</Label>
              <Slider
                value={[invoiceAmount]}
                onValueChange={(value) => setInvoiceAmount(value[0])}
                max={15000}
                step={50}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground">Maximum: £15,000.00</p>
            </div>

            {/* Notes Section */}
            <div className="space-y-2">
              <Label>Notes *</Label>
              <Textarea
                placeholder="Describe the work performed (required)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            {/* Gang Division Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Gang Division</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setGangDialogOpen(true)}
                  disabled={invoiceAmount === 0}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Member
                </Button>
              </div>

              {gangMembers.length > 0 && (
                <div className="space-y-2">
                  {gangMembers.map((member, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground capitalize">{member.type}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {editingMemberIndex === index ? (
                          <Input
                            type="number"
                            value={tempAmount}
                            onChange={(e) => setTempAmount(e.target.value)}
                            onBlur={() => {
                              const val = parseFloat(tempAmount);
                              if (!isNaN(val) && val > 0) {
                                handleUpdateMemberAmount(index, val);
                              }
                              setEditingMemberIndex(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const val = parseFloat(tempAmount);
                                if (!isNaN(val) && val > 0) {
                                  handleUpdateMemberAmount(index, val);
                                }
                                setEditingMemberIndex(null);
                              }
                            }}
                            className="w-24 h-8"
                            autoFocus
                          />
                        ) : (
                          <span 
                            className="font-semibold cursor-pointer hover:text-primary"
                            onClick={() => {
                              setEditingMemberIndex(index);
                              setTempAmount(member.amount.toString());
                            }}
                          >
                            £{member.amount.toFixed(2)}
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <div className="p-3 bg-primary/10 rounded-lg">
                    <div className="flex justify-between font-semibold">
                      <span>Total Allocated:</span>
                      <span>£{totalAllocated.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-muted-foreground">Remaining:</span>
                      <span className={remainingToAllocate < 0 ? "text-destructive" : "text-muted-foreground"}>
                        £{remainingToAllocate.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Button
              onClick={handleCreateInvoice}
              className="w-full"
              disabled={invoiceAmount === 0 || gangMembers.length === 0 || !notes.trim()}
            >
              Create Invoice
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Gang Member Dialog */}
      <Dialog open={gangDialogOpen} onOpenChange={setGangDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Gang Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                placeholder="Enter member name"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={memberType} onValueChange={setMemberType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bricklayer">Bricklayer</SelectItem>
                  <SelectItem value="labourer">Labourer</SelectItem>
                  <SelectItem value="hod_carrier">HOD Carrier</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Amount (£{remainingToAllocate.toFixed(2)} remaining)</Label>
              <Input
                type="number"
                value={memberAmount}
                onChange={(e) => setMemberAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                step="0.01"
                min="0"
                max={remainingToAllocate}
              />
            </div>

            <Button onClick={handleAddMember} className="w-full">
              Add Member
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
