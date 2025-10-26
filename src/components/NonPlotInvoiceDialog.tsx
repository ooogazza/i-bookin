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
  editing?: boolean;
}

interface NonPlotInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  handleExportPDF: (invoice?: any) => void;
  handleSendToAdmin: (invoice?: any) => void;
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

  useEffect(() => {
    if (open) {
      setInvoiceNumber(`NPINV-${Date.now()}`);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [open]);

  const totalAllocated = gangMembers.reduce((sum, m) => sum + m.amount, 0);
  const remainingToAllocate = invoiceAmount - totalAllocated;

  // ============= Independent Slider Logic ============= //
  const handleUpdateMemberAmount = (index: number, newAmount: number) => {
    const current = gangMembers[index].amount;

    // Increasing
    if (newAmount > current) {
      if (remainingToAllocate <= 0) return; // can't go up
      const maxIncrease = current + remainingToAllocate;
      newAmount = Math.min(newAmount, maxIncrease);
    }

    // Decreasing allowed always
    const updated = [...gangMembers];
    updated[index].amount = Math.max(0, newAmount);
    setGangMembers(updated);
  };

  const startEditingMember = (index: number) => {
    const updated = [...gangMembers];
    updated[index].editing = true;
    setGangMembers(updated);
  };

  const stopEditingMember = (index: number) => {
    const updated = [...gangMembers];
    updated[index].editing = false;
    setGangMembers(updated);
  };

  const handleAddMember = () => {
    if (!memberName.trim()) return toast.error("Name required");
    setGangMembers([
      ...gangMembers,
      {
        name: memberName.trim(),
        type: memberType,
        amount: 0,
        editing: false,
      },
    ]);
    setMemberName("");
    setDialogOpen(false);
  };

  const handleRemoveMember = (idx: number) => {
    setGangMembers(gangMembers.filter((_, i) => i !== idx));
  };

  const buildInvoice = () => ({
    invoiceNumber,
    total: invoiceAmount,
    notes,
    gangMembers,
  });

  // Flexible callback support
  const safeSend = () => {
    try {
      handleSendToAdmin(buildInvoice());
      toast.success("Invoice sent to admin");
      onOpenChange(false);
    } catch {
      handleSendToAdmin();
    }
  };

  const safeExport = () => {
    try {
      handleExportPDF(buildInvoice());
      toast.success("PDF created");
    } catch {
      handleExportPDF();
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <div className="max-h-[70vh] overflow-y-auto px-6 py-6 space-y-6">
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
                  {!editingAmount ? (
                    <Label
                      className="cursor-pointer hover:text-primary text-lg"
                      onClick={() => {
                        setTempAmount(invoiceAmount.toString());
                        setEditingAmount(true);
                      }}
                    >
                      £{invoiceAmount.toFixed(2)}
                    </Label>
                  ) : (
                    <Input
                      autoFocus
                      value={tempAmount}
                      onChange={(e) => setTempAmount(e.target.value)}
                      onBlur={() => {
                        const v = parseFloat(tempAmount);
                        if (!isNaN(v)) setInvoiceAmount(v);
                        setEditingAmount(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const v = parseFloat(tempAmount);
                          if (!isNaN(v)) setInvoiceAmount(v);
                          setEditingAmount(false);
                        }
                      }}
                      className="w-32"
                    />
                  )}

                  <Slider
                    value={[invoiceAmount]}
                    onValueChange={(v) => {
                      if (v[0] < 0) return;
                      setInvoiceAmount(v[0]);
                    }}
                    step={50}
                    max={20000}
                  />

                  <Textarea
                    placeholder="Describe non-plot work"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Gang Division */}
            {invoiceAmount > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Gang Division</CardTitle>
                    <Button size="sm" onClick={() => setDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" /> Add Member
                    </Button>
                  </div>
                </CardHeader>

                <CardContent>
                  {gangMembers.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">No gang members added yet</p>
                  )}

                  <div className="space-y-3">
                    {gangMembers.map((m, i) => (
                      <div key={i} className="p-4 bg-muted rounded-lg space-y-2">
                        <div className="flex justify-between">
                          <div>
                            <p className="font-semibold">{m.name}</p>
                            <p className="text-sm text-muted-foreground capitalize">{m.type}</p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => handleRemoveMember(i)}>
                            <X />
                          </Button>
                        </div>

                        {!m.editing ? (
                          <span
                            className="cursor-pointer hover:text-primary font-medium text-sm"
                            onClick={() => startEditingMember(i)}
                          >
                            Amount: £{m.amount.toFixed(2)}
                          </span>
                        ) : (
                          <Input
                            autoFocus
                            value={m.amount}
                            onBlur={() => stopEditingMember(i)}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value) || 0;
                              handleUpdateMemberAmount(i, v);
                            }}
                            onKeyDown={(e) => e.key === "Enter" && stopEditingMember(i)}
                            className="w-20 h-8"
                          />
                        )}

                        <Slider
                          value={[m.amount]}
                          onValueChange={(v) => handleUpdateMemberAmount(i, v[0])}
                          max={invoiceAmount}
                          step={10}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Total:</span>
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
                </CardContent>
              </Card>
            )}

            {/* ACTIONS SIDE BY SIDE */}
            {invoiceAmount > 0 && gangMembers.length > 0 && (
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" disabled={remainingToAllocate !== 0} onClick={safeExport}>
                  Export PDF
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={remainingToAllocate !== 0}
                  onClick={safeSend}
                >
                  Send to Admin
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Gang Member</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Input placeholder="Name" value={memberName} onChange={(e) => setMemberName(e.target.value)} />

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

            <Button className="w-full" onClick={handleAddMember}>
              Add Member
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
