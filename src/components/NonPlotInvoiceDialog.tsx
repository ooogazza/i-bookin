import { useState, useEffect } from "react";
import {
  Card, CardContent, CardHeader, CardTitle,
  Dialog, DialogContent, DialogHeader, DialogTitle,
  Input, Label, Slider, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Textarea, Button
} from "@/components/ui";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { handleExportPDF, handleSendToAdmin } from "@/lib/invoiceUtils";
import { GangDivisionCard } from "@/components/invoice/GangDivisionCard";
import { useGangDivision } from "@/hooks/useGangDivision";
import { useSavedGangMembers } from "@/hooks/useSavedGangMembers";

interface NonPlotInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NonPlotInvoiceDialog = ({ open, onOpenChange }: NonPlotInvoiceDialogProps) => {
  const { user } = useAuth();
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState(0);
  const [editingAmount, setEditingAmount] = useState(false);
  const [tempAmount, setTempAmount] = useState("0");
  const [notes, setNotes] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberType, setMemberType] = useState("bricklayer");

  const { savedMembers, setSavedMembers } = useSavedGangMembers();
  const {
    gangMembers,
    totalAllocated,
    remainingToAllocate,
    updateMemberAmount,
    addMember,
    removeMember,
    startEditing,
    stopEditing,
    setGangMembers,
  } = useGangDivision([], invoiceAmount);

  useEffect(() => {
    if (open) {
      setInvoiceNumber(`NPINV-${Date.now()}`);
      document.body.style.overflow = "hidden";
      loadSavedMembers();
    } else {
      document.body.style.overflow = "auto";
    }
  }, [open]);

  const loadSavedMembers = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("saved_gang_members")
      .select("*")
      .eq("user_id", user.id)
      .order("name");
    if (!error && data) setSavedMembers(data);
  };

  const handleAddNewMember = async () => {
    if (!memberName.trim() || !user) {
      toast.error("Name required");
      return;
    }

    const { data, error } = await supabase
      .from("saved_gang_members")
      .insert({ user_id: user.id, name: memberName.trim(), type: memberType })
      .select()
      .single();

    if (error) {
      toast.error("Failed to save gang member");
      return;
    }

    setSavedMembers([...savedMembers, data]);
    addMember({ id: data.id, name: data.name, type: data.type, amount: 0 });
    setMemberName("");
    setDialogOpen(false);
    toast.success("Gang member saved");
  };

  const handleAddExistingMember = (member) => {
    if (gangMembers.some(m => m.id === member.id)) {
      toast.error("Already added");
      return;
    }
    addMember({ ...member, amount: 0 });
    toast.success(`${member.name} added`);
  };

  const handleDeleteMemberPermanently = async (memberId: string, idx: number) => {
    const { error } = await supabase
      .from("saved_gang_members")
      .delete()
      .eq("id", memberId);
    if (error) {
      toast.error("Failed to delete member");
      return;
    }
    setSavedMembers(savedMembers.filter(m => m.id !== memberId));
    removeMember(idx);
    toast.success("Deleted permanently");
  };

  const handleSaveInvoice = async () => {
    if (!user || remainingToAllocate !== 0) {
      toast.error("Please allocate full amount");
      return;
    }

    const { data: invoice, error } = await supabase
      .from("non_plot_invoices")
      .insert({
        invoice_number: invoiceNumber,
        user_id: user.id,
        total_amount: invoiceAmount,
        notes,
        status: "sent",
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to save invoice");
      return;
    }

    const divisions = gangMembers.map(m => ({
      invoice_id: invoice.id,
      member_name: m.name,
      member_type: m.type,
      amount: m.amount,
    }));

    const { error: divError } = await supabase
      .from("non_plot_gang_divisions")
      .insert(divisions);

    if (divError) {
      toast.error("Failed to save divisions");
      return;
    }

    await handleSendToAdmin({ invoiceNumber, total: invoiceAmount, notes, gangMembers });
    setInvoiceAmount(0);
    setNotes("");
    setGangMembers([]);
    onOpenChange(false);
    toast.success("Invoice sent to admin");
  };

  const handleExport = () => {
    if (remainingToAllocate !== 0) {
      toast.error("Please allocate full amount");
      return;
    }
    handleExportPDF({ invoiceNumber, total: invoiceAmount, notes, gangMembers });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden" onOpenAutoFocus={(e) => e.preventDefault()}>
          <div className="max-h-[70vh] overflow-y-auto px-6 py-6 space-y-6">
            <div className="flex items-center gap-2">
              <FileText className="h-7 w-7 text-primary" />
              <h2 className="text-2xl font-bold tracking-tight">Create Non-Plot Invoice</h2>
            </div>

            <Card>
              <CardHeader><CardTitle>Invoice Amount</CardTitle></CardHeader>
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
                      if (v[0] >= 0) setInvoiceAmount(v[0]);
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

            {invoiceAmount > 0 && (
              <GangDivisionCard
                gangMembers={gangMembers}
                totalValue={invoiceAmount}
                totalAllocated={totalAllocated}
                remainingToAllocate={remainingToAllocate}
                onAddMemberClick={() => setDialogOpen(true)}
                onRemoveMember={removeMember}
                onDeletePermanently={handleDeleteMemberPermanently}
                onUpdateMemberAmount={updateMemberAmount}
                onStartEditing={startEditing}
                onStopEditing={stopEditing}
                savedMembers={savedMembers}
                onAddExistingMember={handleAddExistingMember}
                totalValueLabel="Total"
              />
            )}

            {invoiceAmount > 0 && gangMembers.length > 0 && (
              <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
                <Button variant="outline" className="flex-1" disabled={remainingToAllocate !== 0} onClick={handleExport}>
                  Export PDF
                </Button>
                <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" disabled={remainingToAllocate !== 0} onClick={handleSaveInvoice}>
                  Send to Admin
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

           <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Add New Gang Member</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              placeholder="Name"
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
            />

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

            <Button className="w-full" onClick={handleAddNewMember}>
              Add Member
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};