import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, FileText } from "lucide-react";
import { toast } from "sonner";

interface GangMember {
  name: string;
  type: string;
  amount: number;
}

interface NonPlotInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  handleExportPDF: (invoiceData: any) => void;
  handleSendToAdmin: (invoiceData: any) => void;
}

export const NonPlotInvoiceDialog = ({
  open,
  onOpenChange,
  handleExportPDF,
  handleSendToAdmin,
}: NonPlotInvoiceDialogProps) => {
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState(0);
  const [editingAmount, setEditingAmount] = useState(false);
  const [tempAmount, setTempAmount] = useState("0");
  const [notes, setNotes] = useState("");

  const [gangMembers, setGangMembers] = useState<GangMember[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [memberName, setMemberName] = useState("");
  const [memberType, setMemberType] = useState("bricklayer");
  const [memberAmount, setMemberAmount] = useState(0);

  useEffect(() => {
    if (open) {
      setInvoiceNumber(`NPINV-${Date.now()}`);
      document.body.style.overflow = "hidden"; // stop background scrolling
    } else {
      document.body.style.overflow = "auto";
    }
  }, [open]);

  const totalAllocated = gangMembers.reduce((sum, m) => sum + m.amount, 0);
  const remainingToAllocate = invoiceAmount - totalAllocated;

  const handleAddMember = () => {
    if (!memberName.trim()) {
      toast.error("Name required");
      return;
    }

    setGangMembers([...gangMembers, { name: memberName.trim(), type: memberType, amount: memberAmount }]);

    setMemberName("");
    setMemberAmount(0);
    setDialogOpen(false);
  };

  const handleRemoveMember = (index: number) => {
    setGangMembers(gangMembers.filter((_, i) => i !== index));
  };

  const handleUpdateMemberAmount = (index: number, newAmount: number) => {
    const member = gangMembers[index];
    const otherMembersTotal = gangMembers.filter((_, i) => i !== index).reduce((sum, m) => sum + m.amount, 0);

    const maxAllowed = invoiceAmount - otherMembersTotal;
    const finalAmount = Math.min(newAmount, maxAllowed);

    const updated = [...gangMembers];
    updated[index] = { ...member, amount: finalAmount };
    setGangMembers(updated);
  };

  const buildInvoicePayload = () => ({
    invoiceNumber,
    total: invoiceAmount,
    notes,
    gangMembers,
  });

  const onExportClick = () => {
    handleExportPDF(buildInvoicePayload());
    toast.success("PDF exported");
  };

  const onSendClick = () => {
    handleSendToAdmin(buildInvoicePayload());
    toast.success("Invoice sent to admin");
    onOpenChange(false);
  };

  return (
    <>
      {/* ENTIRE CONTENT NOW SCROLLS LIKE PlotBooking */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <div className="max-h-[85vh] overflow-y-auto px-6 py-8 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-2">
              <FileText className="h-7 w-7 text-primary" />
              <h2 className="text-2xl font-bold tracking-tight">Create Non-Plot Invoice</h2>
            </div>

            {/* Invoice Amount */}
            <Card>
              <CardHeader>
                <CardTitle>Invoice Amount</CardTitle>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    {editingAmount ? (
                      <Input
                        type="number"
                        value={tempAmount}
                        onChange={(e) => setTempAmount(e.target.value)}
                        onBlur={() => {
                          const val = parseFloat(tempAmount);
                          if (!isNaN(val) && val >= 0) setInvoiceAmount(val);
                          setEditingAmount(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const val = parseFloat(tempAmount);
                            if (!isNaN(val) && val >= 0) setInvoiceAmount(val);
                            setEditingAmount(false);
                          }
                        }}
                        className="w-32"
                        autoFocus
                      />
                    ) : (
                      <Label
                        className="cursor-pointer hover:text-primary transition-colors"
                        onClick={() => {
                          setTempAmount(invoiceAmount.toString());
                          setEditingAmount(true);
                        }}
                      >
                        £{invoiceAmount.toFixed(2)}
                      </Label>
                    )}
                  </div>

                  <Slider
                    value={[invoiceAmount]}
                    onValueChange={(value) => setInvoiceAmount(value[0])}
                    max={20000}
                    step={50}
                  />

                  <div className="space-y-2">
                    <Label>Notes *</Label>
                    <Textarea
                      placeholder="Describe the non-plot work performed"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
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
                    <Button onClick={() => setDialogOpen(true)} size="sm">
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
                        const otherTotal = gangMembers
                          .filter((_, i) => i !== index)
                          .reduce((sum, m) => sum + m.amount, 0);

                        const maxForThisMember = invoiceAmount - otherTotal;

                        return (
                          <div key={index} className="p-4 bg-muted rounded-lg space-y-2">
                            <div className="flex justify-between">
                              <div>
                                <p className="font-semibold">{member.name}</p>
                                <p className="text-sm text-muted-foreground capitalize">{member.type}</p>
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => handleRemoveMember(index)}>
                                <X className="h-5 w-5" />
                              </Button>
                            </div>

                            <div className="space-y-1">
                              <div className="flex gap-2 items-center">
                                <span className="text-sm">Amount:</span>
                                <Input
                                  type="number"
                                  value={member.amount}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    if (val <= maxForThisMember) {
                                      handleUpdateMemberAmount(index, val);
                                    }
                                  }}
                                  className="w-24 h-8"
                                />
                              </div>

                              <Slider
                                value={[member.amount]}
                                onValueChange={(value) => handleUpdateMemberAmount(index, value[0])}
                                max={maxForThisMember}
                                step={10}
                              />
                            </div>
                          </div>
                        );
                      })}

                      <div className="mt-4 pt-4 border-t space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Invoice Total:</span>
                          <span className="font-semibold">£{invoiceAmount.toFixed(2)}</span>
                        </div>

                        <div className="flex justify-between text-sm">
                          <span>Allocated:</span>
                          <span className="font-semibold">£{totalAllocated.toFixed(2)}</span>
                        </div>

                        <div className="flex justify-between text-sm">
                          <span>Remaining:</span>
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

            {/* ACTION BUTTONS LIKE PLOT BOOKING */}
            {invoiceAmount > 0 && gangMembers.length > 0 && (
              <Button
                onClick={onSendClick}
                size="lg"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={remainingToAllocate !== 0}
              >
                Send to Admin
              </Button>
            )}

            {invoiceAmount > 0 && gangMembers.length > 0 && (
              <Button
                onClick={onExportClick}
                variant="outline"
                size="lg"
                className="w-full"
                disabled={remainingToAllocate !== 0}
              >
                Export PDF
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ADD MEMBER DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Gang Member</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={memberName} onChange={(e) => setMemberName(e.target.value)} />
            </div>

            <div>
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

            <div>
              <Label>
                Amount: £{memberAmount.toFixed(2)} (£{remainingToAllocate.toFixed(2)} remaining)
              </Label>
              <Slider
                value={[memberAmount]}
                onValueChange={(value) => setMemberAmount(value[0])}
                max={remainingToAllocate}
                step={10}
              />
            </div>

            <Button className="w-full" onClick={handleAddMember}>
              Add Member
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
