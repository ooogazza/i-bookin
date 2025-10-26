import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, X } from "lucide-react";

interface GangMember {
  name: string;
  type: string;
  amount: number;
}

const NonPlotBooking = () => {
  const [invoiceAmount, setInvoiceAmount] = useState(1000); // Set manually
  const [gangMembers, setGangMembers] = useState<GangMember[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberType, setMemberType] = useState("bricklayer");
  const [memberAmount, setMemberAmount] = useState(0);

  const totalAllocated = gangMembers.reduce((sum, m) => sum + m.amount, 0);
  const remainingToAllocate = invoiceAmount - totalAllocated;

  const handleAddMember = () => {
    setGangMembers([
      ...gangMembers,
      {
        name: memberName.trim(),
        type: memberType,
        amount: memberAmount,
      },
    ]);
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

  return (
    <div className="min-h-screen bg-secondary/30">
      <Header showBackButton />
      <main className="container py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Create Invoice
          </h2>
          <p className="text-muted-foreground">Non-Plot Invoice</p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Gang Division</CardTitle>
              <Button onClick={() => setDialogOpen(true)} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Member
              </Button>
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
                    const maxForThisMember = invoiceAmount - otherMembersTotal;

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
                                if (val <= maxForThisMember) {
                                  handleUpdateMemberAmount(index, val);
                                }
                              }}
                              className="w-24 h-8"
                              step={10}
                              min="0"
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
                      <span>Invoice Total:</span>
                      <span className="font-semibold">£{invoiceAmount.toFixed(2)}</span>
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

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Gang Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder="Enter name" />
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
                <div className="space-y-2">
                  <Label>
                    Amount: £{memberAmount.toFixed(2)} (£
                    {remainingToAllocate.toFixed(2)} remaining)
                  </Label>
                  <Slider
                    value={[memberAmount]}
                    onValueChange={(value) => setMemberAmount(value[0])}
                    max={remainingToAllocate}
                    step={10}
                    className="w-full"
                  />
                </div>
                <Button onClick={handleAddMember} className="w-full">
                  Add Member
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
};

export default NonPlotBooking;
