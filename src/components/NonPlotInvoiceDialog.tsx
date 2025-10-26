import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, X } from "lucide-react";

interface GangMember {
  name: string;
  type: string;
  percent: number;
}

interface NonPlotInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  handleExportPDF: () => void; // reuse from PlotBooking
  handleSendToAdmin: () => void; // reuse from PlotBooking
}

export const NonPlotInvoiceDialog = ({
  open,
  onOpenChange,
  handleExportPDF,
  handleSendToAdmin,
}: NonPlotInvoiceDialogProps) => {
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

  const addMember = () => {
    if (!memberName.trim()) return;
    setGangMembers([...gangMembers, { name: memberName.trim(), type: memberType, percent: 0 }]);
    setMemberName("");
    setGangDialogOpen(false);
  };

  const removeMember = (index: number) => {
    setGangMembers(gangMembers.filter((_, i) => i !== index));
  };

  const updateMemberPercent = (index: number, newPercent: number) => {
    const clamped = Math.max(0, Math.min(100, newPercent));
    const otherTotal = gangMembers.filter((_, i) => i !== index).reduce((s, m) => s + m.percent, 0);
    const maxAllowed = Math.max(0, 100 - otherTotal);
    const finalPercent = Math.min(clamped, maxAllowed);

    const updated = [...gangMembers];
    updated[index] = { ...updated[index], percent: finalPercent };
    setGangMembers(updated);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Non-Plot Invoice</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Invoice Amount (instead of plot fetch) */}
            <Card>
              <CardHeader>
                <CardTitle>Invoice amount</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
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
                      className="w-40"
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
                      Amount: £{invoiceAmount.toFixed(2)}
                    </Label>
                  )}

                  <Slider
                    value={[invoiceAmount]}
                    onValueChange={(value) => setInvoiceAmount(value[0])}
                    max={15000}
                    step={50}
                    className="w-full"
                  />

                  <div className="space-y-2">
                    <Label>Notes *</Label>
                    <Textarea
                      placeholder="Describe the work performed"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gang Division (copied exactly from PlotBooking) */}
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
                        const otherTotal = gangMembers.filter((_, i) => i !== index).reduce((s, m) => s + m.percent, 0);
                        const maxForThis = Math.max(0, 100 - otherTotal);

                        return (
                          <div key={index} className="p-4 bg-muted rounded-lg space-y-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-semibold">{member.name}</p>
                                <p className="text-sm text-muted-foreground capitalize">{member.type}</p>
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => removeMember(index)}>
                                <X className="h-5 w-5" />
                              </Button>
                            </div>

                            <div className="space-y-2">
                              <Label className="cursor-pointer hover:text-primary transition-colors">
                                {member.percent.toFixed(0)}% (£{((invoiceAmount * member.percent) / 100).toFixed(2)})
                              </Label>

                              <Slider
                                value={[member.percent]}
                                onValueChange={(value) => updateMemberPercent(index, value[0])}
                                max={maxForThis}
                                step={1}
                                className="w-full"
                              />
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

            {/* Bottom Action Buttons (same as PlotBooking) */}
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

      {/* Add Gang Member Dialog (same as PlotBooking) */}
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

            <Button onClick={addMember} className="w-full">
              Add Member
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
