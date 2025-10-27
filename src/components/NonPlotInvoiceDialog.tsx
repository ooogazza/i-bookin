import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { handleExportPDF, handleSendToAdmin } from "@/lib/invoiceUtils";
import { GangDivisionCard } from "@/components/invoice/GangDivisionCard";

interface SavedGangMember {
  id: string;
  name: string;
  type: string;
}

interface GangMember {
  id?: string;
  name: string;
  type: string;
  amount: number;
  editing?: boolean;
}

interface NonPlotInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NonPlotInvoiceDialog = ({
  open,
  onOpenChange,
}: NonPlotInvoiceDialogProps) => {
  const { user } = useAuth();
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState(0);
  const [editingAmount, setEditingAmount] = useState(false);
  const [tempAmount, setTempAmount] = useState("0");
  const [notes, setNotes] = useState("");

  const [gangMembers, setGangMembers] = useState<GangMember[]>([]);
  const [savedMembers, setSavedMembers] = useState<SavedGangMember[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [memberName, setMemberName] = useState("");
  const [memberType, setMemberType] = useState("bricklayer");

  // Load saved gang members
  const loadSavedMembers = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("saved_gang_members")
      .select("*")
      .eq("user_id", user.id)
      .order("name");

    if (error) {
      console.error("Error loading saved members:", error);
      return;
    }

    setSavedMembers(data || []);
  };

  // Generate invoice number + prevent page background scroll
  useEffect(() => {
    if (open) {
      setInvoiceNumber(`NPINV-${Date.now()}`);
      document.body.style.overflow = "hidden";
      loadSavedMembers();
    } else {
      document.body.style.overflow = "auto";
    }
  }, [open]);

  const totalAllocated = gangMembers.reduce((sum, m) => sum + m.amount, 0);
  const remainingToAllocate = invoiceAmount - totalAllocated;

  // Independent slider logic
  const handleUpdateMemberAmount = (index: number, newAmount: number) => {
    const current = gangMembers[index].amount;

    // Increasing
    if (newAmount > current) {
      if (remainingToAllocate <= 0) return;
      const maxIncrease = current + remainingToAllocate;
      newAmount = Math.min(newAmount, maxIncrease);
    }

    // Decreasing always allowed
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

  const handleAddNewMember = async () => {
    if (!memberName.trim() || !user) {
      toast.error("Name required");
      return;
    }

    try {
      // Save to database
      const { data, error } = await supabase
        .from("saved_gang_members")
        .insert({
          user_id: user.id,
          name: memberName.trim(),
          type: memberType,
        })
        .select()
        .single();

      if (error) throw error;

      // Add to saved members list
      setSavedMembers([...savedMembers, data]);
      
      // Add to current invoice with 0 amount
      setGangMembers([...gangMembers, { 
        id: data.id,
        name: data.name, 
        type: data.type, 
        amount: 0, 
        editing: false 
      }]);
      
      setMemberName("");
      setDialogOpen(false);
      toast.success("Gang member saved");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save gang member");
    }
  };

  const handleAddExistingMember = (member: SavedGangMember) => {
    // Check if already added
    if (gangMembers.some(m => m.id === member.id)) {
      toast.error("Member already added to this invoice");
      return;
    }
    
    setGangMembers([...gangMembers, { 
      id: member.id,
      name: member.name, 
      type: member.type, 
      amount: 0, 
      editing: false 
    }]);
    toast.success(`${member.name} added to invoice`);
  };

  const handleRemoveMemberFromInvoice = (idx: number) => {
    setGangMembers(gangMembers.filter((_, i) => i !== idx));
    toast.success("Member removed from invoice");
  };

  const handleDeleteMemberPermanently = async (memberId: string, idx: number) => {
    if (!confirm("Delete this member permanently from your saved gang members?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("saved_gang_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      // Remove from both lists
      setSavedMembers(savedMembers.filter(m => m.id !== memberId));
      setGangMembers(gangMembers.filter((_, i) => i !== idx));
      
      toast.success("Member deleted permanently");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete member");
    }
  };

  const buildInvoice = () => ({
    invoiceNumber,
    total: invoiceAmount,
    notes,
    gangMembers,
  });

  const handleSaveInvoice = async () => {
    if (!user) return;
    
    if (remainingToAllocate !== 0) {
      toast.error("Please allocate the full invoice amount");
      return;
    }

    try {
      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
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

      if (invoiceError) throw invoiceError;

      // Create gang divisions
      const divisions = gangMembers.map(m => ({
        invoice_id: invoice.id,
        member_name: m.name,
        member_type: m.type,
        amount: m.amount,
      }));

      const { error: divisionsError } = await supabase
        .from("non_plot_gang_divisions")
        .insert(divisions);

      if (divisionsError) throw divisionsError;

      const payload = buildInvoice();
      await handleSendToAdmin(payload);
      
      // Reset form
      setInvoiceAmount(0);
      setNotes("");
      setGangMembers([]);
      onOpenChange(false);
      
      toast.success("Invoice saved and sent to admin");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save invoice");
    }
  };

  const handleExport = () => {
    if (remainingToAllocate !== 0) {
      toast.error("Please allocate the full invoice amount");
      return;
    }
    
    const payload = buildInvoice();
    handleExportPDF(payload);
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
              <GangDivisionCard
                gangMembers={gangMembers}
                totalValue={invoiceAmount}
                totalAllocated={totalAllocated}
                remainingToAllocate={remainingToAllocate}
                onAddMemberClick={() => setDialogOpen(true)}
                onRemoveMember={handleRemoveMemberFromInvoice}
                onDeletePermanently={handleDeleteMemberPermanently}
                onUpdateMemberAmount={handleUpdateMemberAmount}
                onStartEditing={startEditingMember}
                onStopEditing={stopEditingMember}
                savedMembers={savedMembers}
                onAddExistingMember={handleAddExistingMember}
                totalValueLabel="Total"
              />
            )}

            {/* ACTIONS — side-by-side */}
            {invoiceAmount > 0 && gangMembers.length > 0 && (
              <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={remainingToAllocate !== 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExport();
                  }}
                >
                  Export PDF
                </Button>

                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={remainingToAllocate !== 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSaveInvoice();
                  }}
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
            <DialogTitle>Add New Gang Member</DialogTitle>
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

            <Button className="w-full" onClick={handleAddNewMember}>
              Add Member
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
