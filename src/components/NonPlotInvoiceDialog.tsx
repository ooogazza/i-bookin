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
import jsPDF from "jspdf";

interface GangMember {
  name: string;
  type: string;
  percent: number;
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

  const [notes, setNotes] = useState("");

  const [gangMembers, setGangMembers] = useState<GangMember[]>([]);
  const [gangDialogOpen, setGangDialogOpen] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberType, setMemberType] = useState("bricklayer");

  const totalPercent = gangMembers.reduce((sum, m) => sum + m.percent, 0);
  const remainingPercent = 100 - totalPercent;
  const totalAllocatedValue = gangMembers.reduce((sum, m) => sum + (invoiceAmount * m.percent) / 100, 0);

  const handleAddMember = () => {
    if (!memberName.trim()) {
      toast.error("Please enter member name");
      return;
    }
    setGangMembers([...gangMembers, { name: memberName.trim(), type: memberType, percent: 0 }]);
    setMemberName("");
    setGangDialogOpen(false);
  };

  const handleRemoveMember = (index: number) => {
    setGangMembers(gangMembers.filter((_, i) => i !== index));
  };

  const handleUpdateMemberPercent = (index: number, newPercent: number) => {
    const clamped = Math.max(0, Math.min(100, newPercent));
    const otherTotal = gangMembers.filter((_, i) => i !== index).reduce((sum, m) => sum + m.percent, 0);
    const maxAllowed = Math.max(0, 100 - otherTotal);
    const finalPercent = Math.min(clamped, maxAllowed);

    const updated = [...gangMembers];
    updated[index] = { ...updated[index], percent: finalPercent };
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
    if (Math.abs(remainingPercent) > 0.01) {
      toast.error("Please allocate 100% across gang members");
      return null;
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
        amount: parseFloat(((invoiceAmount * m.percent) / 100).toFixed(2)),
        percent: m.percent,
      }));

      const { error: gangError } = await supabase.from("gang_divisions").insert(gangDivisions);
      if (gangError) throw gangError;

      return { booking, invoiceNumber, gangDivisions };
    } catch (error: any) {
      if (import.meta.env.DEV) console.error("Error:", error);
      toast.error("Failed to create invoice");
      return null;
    }
  };

  const handleSendToAdmin = async () => {
    const result = await createBooking("pending_admin");
    if (result) {
      toast.success("Invoice sent to admin");
      resetForm();
    }
  };

  const handleExportPDF = async () => {
    const result = await createBooking("confirmed");
    if (!result) return;

    const { booking, invoiceNumber, gangDivisions } = result;

    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Invoice (Non-Plot)", 14, 20);
      doc.setFontSize(12);
      doc.text(`Invoice #: ${invoiceNumber}`, 14, 28);
      doc.text(`Status: ${booking.status}`, 14, 34);
      doc.text(`Booked By: ${user?.id ?? "Unknown"}`, 14, 40);
      doc.text(`Total Invoice: £${invoiceAmount.toFixed(2)}`, 14, 50);
      doc.text(`Total Allocated: £${totalAllocatedValue.toFixed(2)}`, 14, 56);
      doc.text("Notes:", 14, 66);
      const splitNotes = doc.splitTextToSize(notes || "-", 180);
      doc.text(splitNotes, 14, 72);

      let y = 90;
      doc.text("Gang Division:", 14, y);
      y += 8;
      gangDivisions.forEach((gd) => {
        const line = `${gd.member_name} (${gd.member_type}) — ${gd.percent}% — £${gd.amount.toFixed(2)}`;
        doc.text(line, 14, y);
        y += 6;
      });

      doc.save(`${invoiceNumber}.pdf`);
      toast.success("Invoice exported to PDF");
      resetForm();
    } catch (err) {
      if (import.meta.env.DEV) console.error("PDF error:", err);
      toast.error("Failed to export PDF");
    }
  };

  const resetForm = () => {
    setInvoiceAmount(0);
    setNotes("");
    setGangMembers([]);
    setMemberName("");
    setMemberType("bricklayer");
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
            {/* Invoice Amount */}
            <Card>
              <CardHeader>
                <CardTitle>Invoice amount</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
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
                    <CardTitle>Gang Division (percent-based)</CardTitle>
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
                          .reduce((sum, m) => sum + m.percent, 0);
                        const maxForThisMember = Math.max(0, 100 - otherMembersTotal);
                        const amountForMember = (invoiceAmount * member.percent) / 100;

                        // Inline edit state per member
                        const [editing, setEditing] = useState(false);
                        const [tempPercent, setTempPercent] = useState(member.percent.toString());

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
                                <span className="text-sm font-medium">Percent:</span>
                                {editing ? (
                                  <Input
                                    type="number"
                                    value={tempPercent}
                                    onChange={(e) => setTempPercent(e.target.value)}
                                    onBlur={() => {
                                      const val = parseFloat(tempPercent);
                                      if (!isNaN(val)) {
                                        handleUpdateMemberPercent(index, val);
                                      }
                                      setEditing(false);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        const val = parseFloat(tempPercent);
                                        if (!isNaN(val)) {
                                          handleUpdateMemberPercent(index, val);
                                        }
                                        setEditing(false);
                                      }
                                    }}
                                    className="w-20 h-8"
                                    autoFocus
                                    step={1}
                                    min={0}
                                    max={maxForThisMember}
                                  />
                                ) : (
                                  <Label
                                    className="cursor-pointer hover:text-primary transition-colors"
                                    onClick={() => {
                                      setTempPercent(member.percent.toString());
                                      setEditing(true);
                                    }}
                                  >
                                    {member.percent.toFixed(0)}%
                                  </Label>
                                )}
                              </div>

                              <Slider
                                value={[member.percent]}
                                onValueChange={(value) => handleUpdateMemberPercent(index, value[0])}
                                max={maxForThisMember}
                                step={1}
                                className="w-full"
                              />

                              <p className="text-xs text-muted-foreground">
                                Allocated: {member.percent.toFixed(0)}% — £{amountForMember.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        );
                      })}

                      <div className="mt-4 pt-4 border-t space-y-1">
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Invoice total:</span>
                          <span className="font-semibold">£{invoiceAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Allocated value:</span>
                          <span className="font-semibold">£{totalAllocatedValue.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Allocated percent:</span>
                          <span className="font-semibold">{totalPercent.toFixed(0)}%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Remaining percent:</span>
                          <span
                            className={`font-semibold ${
                              remainingPercent < 0
                                ? "text-destructive"
                                : remainingPercent > 0
                                  ? "text-orange-500"
                                  : "text-green-600"
                            }`}
                          >
                            {remainingPercent.toFixed(0)}%
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
                  disabled={Math.abs(remainingPercent) > 0.01}
                  onClick={handleExportPDF}
                >
                  Export to PDF
                </Button>

                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={Math.abs(remainingPercent) > 0.01}
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
