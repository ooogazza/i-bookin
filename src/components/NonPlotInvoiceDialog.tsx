import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

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
  const [editingAmount, setEditingAmount] = useState(false);
  const [tempAmount, setTempAmount] = useState("0");

  const [percentage, setPercentage] = useState(100);
  const [editingPercentage, setEditingPercentage] = useState(false);
  const [tempPercentage, setTempPercentage] = useState("100");

  const [notes, setNotes] = useState("");

  const [gangMembers, setGangMembers] = useState<GangMember[]>([]);
  const [gangDialogOpen, setGangDialogOpen] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberType, setMemberType] = useState("bricklayer");

  const bookingValue = (invoiceAmount * percentage) / 100;
  const totalAllocated = gangMembers.reduce((sum, m) => sum + m.amount, 0);
  const remainingToAllocate = bookingValue - totalAllocated;

  const handleAddMember = () => {
    if (!memberName.trim()) {
      toast.error("Please enter member name");
      return;
    }
    setGangMembers([...gangMembers, { name: memberName.trim(), type: memberType, amount: 0 }]);
    setMemberName("");
    setGangDialogOpen(false);
  };

  const handleRemoveMember = (index: number) => {
    setGangMembers(gangMembers.filter((_, i) => i !== index));
  };

  const handleUpdateMemberAmount = (index: number, newAmount: number) => {
    const member = gangMembers[index];
    const otherMembersTotal = gangMembers.filter((_, i) => i !== index).reduce((sum, m) => sum + m.amount, 0);
    const maxAllowed = bookingValue - otherMembersTotal;
    const finalAmount = Math.max(0, Math.min(newAmount, Math.max(0, maxAllowed)));

    const updated = [...gangMembers];
    updated[index] = { ...member, amount: finalAmount };
    setGangMembers(updated);
  };

  const createBooking = async (status: string) => {
    if (invoiceAmount <= 0) {
      toast.error("Please set an invoice amount");
      return null;
    }
    if (!notes.trim()) {
      toast.error("Please add notes describing the work");
      return null;
    }
    if (gangMembers.length === 0) {
      toast.error("Please add at least one gang member");
      return null;
    }
    if (Math.abs(remainingToAllocate) > 0.01) {
      toast.error("Please allocate the full booking value to gang members");
      return null;
    }

    try {
      const invoiceNumber = `INV-${Date.now()}`;

      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          booked_by: user?.id,
          booked_value: bookingValue,
          percentage,
          invoice_number: invoiceNumber,
          notes,
          status,
          plot_id: null,
          lift_value_id: null,
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      const gangDivisions = gangMembers.map((m) => ({
        booking_id: booking.id,
        member_name: m.name,
        member_type: m.type,
        amount: m.amount,
      }));

      const { error: gangError } = await supabase.from("gang_divisions").insert(gangDivisions);
      if (gangError) throw gangError;

      return booking;
    } catch (error: any) {
      if (import.meta.env.DEV) console.error("Error:", error);
      toast.error("Failed to create invoice");
      return null;
    }
  };

  const handleSendToAdmin = async () => {
    const booking = await createBooking("pending_admin");
    if (booking) {
      toast.success("Invoice sent to admin");
      resetForm();
    }
  };

  const handleExportPDF = async () => {
    const booking = await createBooking("confirmed");
    if (booking) {
      // Here you’d call your PDF export util, passing booking + gangMembers
      toast.success("Invoice exported to PDF");
      resetForm();
    }
  };

  const resetForm = () => {
    setInvoiceAmount(0);
    setPercentage(100);
    setNotes("");
    setGangMembers([]);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Non-Plot Invoice</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Invoice Amount + Percentage */}
            <Card>
              <CardHeader>
                <CardTitle>Invoice amount and percentage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Amount with inline edit and slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      {editingAmount ? (
                        <Input
                          type="number"
                          value={tempAmount}
                          onChange={(e) => setTempAmount(e.target.value)}
                          onBlur={() => {
                            const val = parseFloat(tempAmount);
                            if (!isNaN(val) && val >= 0 && val <= 15000) {
                              setInvoiceAmount(val);
                            }
                            setEditingAmount(false);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const val = parseFloat(tempAmount);
                              if (!isNaN(val) && val >= 0 && val <= 15000) {
                                setInvoiceAmount(val);
                              }
                              setEditingAmount(false);
                            }
                          }}
                          className="w-32"
                          autoFocus
                          step="50"
                          min="0"
                        />
                      ) : (
                        <Label
                          className="cursor-pointer hover:text-primary transition-colors"
                          onClick={() => {
                            setTempAmount(invoiceAmount.toString());
                            setEditingAmount(true);
                          }}
                        >
                          Amount: £{invoiceAmount.toFixed(2)}
                        </Label>
                      )}
                    </div>
                    <Slider
                      value={[invoiceAmount]}
                      onValueChange={(value) => setInvoiceAmount(value[0])}
                      max={15000}
                      step={50}
                      className="w-full"
                    />
                    <p className="text-sm text-muted-foreground">Maximum: £15,000.00</p>
                  </div>

                  {/* Percentage */}
                  {invoiceAmount > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        {editingPercentage ? (
                          <Input
                            type="number"
                            value={tempPercentage}
                            onChange={(e) => setTempPercentage(e.target.value)}
                            onBlur={() => {
                              const val = parseInt(tempPercentage);
                              if (!isNaN(val) && val >= 1 && val <= 100) {
                                setPercentage(val);
                              }
                              setEditingPercentage(false);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const val = parseInt(tempPercentage);
                                if (!isNaN(val) && val >= 1 && val <= 100) {
                                  setPercentage(val);
                                }
                                setEditingPercentage(false);
                              }
                            }}
                            className="w-32"
                            autoFocus
                            step="1"
                            min="1"
                            max="100"
                          />
                        ) : (
                          <Label
                            className="cursor-pointer hover:text-primary transition-colors"
                            onClick={() => {
                              setTempPercentage(percentage.toString());
                              setEditingPercentage(true);
                            }}
                          >
                            Percentage: {percentage}%
                          </Label>
                        )}
                      </div>
                      <Slider
                        value={[percentage]}
                        onValueChange={(value) => setPercentage(value[0])}
                        min={1}
                        max={100}
                        step={1}
                      />
                      <div className="p-4 bg-muted rounded-lg">
                        <div className="flex justify-between mb-2">
                          <span className="text-muted-foreground">Total Invoice:</span>
                          <span className="font-semibold">£{invoiceAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Booking Value ({percentage}%):</span>
                          <span className="font-semibold text-primary">£{bookingValue.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}

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
                </div>
              </CardContent>
            </Card>

            {/* Gang Division */}
            {invoiceAmount > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Gang Division</CardTitle>
                    <Button onClick={() => setGangDialogOpen(true)} size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Member
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {gangMembers.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">No gang members added yet</p>
                  ) : (
                    <div className="space-y-3">
                      {gangMembers.map((member, index) => {
                        const otherMembersTotal = gangMembers
                          .filter((_, i) => i !== index)
                          .reduce((sum, m) => sum + m.amount, 0);
                        const maxForThisMember = Math.max(0, bookingValue - otherMembersTotal);

                        return (
                          <div key={index} className="p-4 bg-muted rounded-lg space-y-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-semibold text-base">{member.name}</p>
                                <p className="text-sm text-muted-foreground capitalize">{member.type}</p>
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => handleRemoveMember(index)}>
                                <X className="h-5 w-5" />
                              </Button>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">Amount:</span>
                                <Input
                                  type="number"
                                  value={member.amount}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    handleUpdateMemberAmount(index, val);
                                  }}
                                  className="w-24 h-8"
                                  step={10}
                                  min={0}
                                  max={maxForThisMember}
                                />
                              </div>
                              <Slider
                                value={[member.amount]}
                                onValueChange={(value) => handleUpdateMemberAmount(index, value[0])}
                                max={maxForThisMember}
                                step={10}
                                className="w-full"
                              />
                            </div>
                          </div>
                        );
                      })}

                      <div className="mt-4 pt-4 border-t space-y-1">
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Booking Value:</span>
                          <span className="font-semibold">£{bookingValue.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Allocated:</span>
                          <span className="font-semibold">£{totalAllocated.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Remaining:</span>
                          <span
                            className={`font-semibold ${
                              remainingToAllocate < 0
                                ? "text-destructive"
                                : remainingToAllocate > 0
                                  ? "text-orange-500"
                                  : "text-green-600"
                            }`}
                          >
                            £{remainingToAllocate.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Bottom Action Buttons */}
            {invoiceAmount > 0 && gangMembers.length > 0 && (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={Math.abs(remainingToAllocate) > 0.01}
                  onClick={handleExportPDF}
                >
                  Export to PDF
                </Button>

                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={Math.abs(remainingToAllocate) > 0.01}
                  onClick={handleSendToAdmin}
                >
                  Send to Admin
                </Button>
              </div>
            )}
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
                  <SelectItem value="laborer">Laborer</SelectItem>
                  <SelectItem value="apprentice">Apprentice</SelectItem>
                </SelectContent>
              </Select>
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
