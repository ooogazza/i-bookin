import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Upload, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { handleExportPDF, handleSendToAdmin } from "@/lib/invoiceUtils";
import { GangDivisionCard } from "@/components/invoice/GangDivisionCard";
import { playSuccessSound } from "@/lib/soundUtils";

interface SavedGangMember {
  id: string;
  name: string;
  type: string;
  email?: string;
}

interface GangMember {
  id?: string;
  name: string;
  type: string;
  amount: number;
  email?: string;
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
  const [isSending, setIsSending] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [gangMembers, setGangMembers] = useState<GangMember[]>([]);
  const [savedMembers, setSavedMembers] = useState<SavedGangMember[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

const [memberName, setMemberName] = useState("");
const [memberType, setMemberType] = useState("bricklayer");
const [memberEmail, setMemberEmail] = useState("");

  useEffect(() => {
    if (open) {
      setInvoiceNumber(`NPINV-${Date.now()}`);
      document.body.style.overflow = "hidden";
      loadSavedMembers();
    } else {
      document.body.style.overflow = "auto";
      // Clean up image preview URL when dialog closes
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
        setImagePreviewUrl(null);
      }
      setUploadedImage(null);
    }
  }, [open]);

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

  const totalAllocated = gangMembers.reduce((sum, m) => sum + m.amount, 0);
  const remainingToAllocate = invoiceAmount - totalAllocated;

  const handleUpdateMemberAmount = (index: number, newAmount: number) => {
    const current = gangMembers[index].amount;
    if (newAmount > current) {
      if (remainingToAllocate <= 0) return;
      const maxIncrease = current + remainingToAllocate;
      newAmount = Math.min(newAmount, maxIncrease);
    }
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

  // Basic email validation (optional field)
  const emailTrimmed = memberEmail.trim();
  if (emailTrimmed.length > 0) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
    if (emailTrimmed.length > 255 || !emailRegex.test(emailTrimmed)) {
      toast.error("Please enter a valid email");
      return;
    }
  }

  try {
    const { data, error } = await supabase
      .from("saved_gang_members")
      .insert({
        user_id: user.id,
        name: memberName.trim(),
        type: memberType,
        email: emailTrimmed || null,
      })
      .select()
      .single();
    if (error) throw error;
    setSavedMembers([...savedMembers, data]);
    setGangMembers([
      ...gangMembers,
      {
        id: data.id,
        name: data.name,
        type: data.type,
        amount: 0,
        email: data.email || undefined,
        editing: false,
      },
    ]);
    setMemberName("");
    setMemberEmail("");
    setDialogOpen(false);
    toast.success("Gang member saved");
  } catch (err) {
    console.error(err);
    toast.error("Failed to save gang member");
  }
};

const handleAddExistingMember = (member: SavedGangMember) => {
  if (gangMembers.some(m => m.id === member.id)) {
    toast.error("Member already added to this invoice");
    return;
  }
  setGangMembers([
    ...gangMembers,
    {
      id: member.id,
      name: member.name,
      type: member.type,
      amount: 0,
      email: member.email,
      editing: false,
    },
  ]);
  toast.success(`${member.name} added to invoice`);
};

  const handleRemoveMemberFromInvoice = (idx: number) => {
    setGangMembers(gangMembers.filter((_, i) => i !== idx));
    toast.success("Member removed from invoice");
  };

  const handleDeleteMemberPermanently = async (memberId: string, idx: number) => {
    if (!confirm("Delete this member permanently from your saved gang members?")) return;
    try {
      const { error } = await supabase
        .from("saved_gang_members")
        .delete()
        .eq("id", memberId);
      if (error) throw error;
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a valid image (JPEG, PNG, or WebP)");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setUploadedImage(file);
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setImagePreviewUrl(previewUrl);
  };

  const handleRemoveImage = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setUploadedImage(null);
    setImagePreviewUrl(null);
  };

  const uploadImageToStorage = async (): Promise<string | null> => {
    if (!uploadedImage || !user) return null;

    setUploadingImage(true);
    try {
      const fileExt = uploadedImage.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('invoice-images')
        .upload(fileName, uploadedImage);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('invoice-images')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveInvoice = async () => {
    if (!user) return;
    if (remainingToAllocate !== 0) {
      toast.error("Please allocate the full invoice amount");
      return;
    }
    setIsSending(true);
    try {
      // Upload image if present
      let imageUrl: string | null = null;
      if (uploadedImage) {
        imageUrl = await uploadImageToStorage();
        if (!imageUrl) {
          setIsSending(false);
          return;
        }
      }

      // Get user's full name
      let userName = user?.email || "Unknown";
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      if (profile?.full_name) {
        userName = profile.full_name;
      }

      // Save invoice to database
      const { data: invoice, error: invoiceError } = await supabase
        .from("non_plot_invoices")
        .insert({
          invoice_number: invoiceNumber,
          user_id: user.id,
          total_amount: invoiceAmount,
          notes,
          image_url: imageUrl,
          status: "sent",
        })
        .select()
        .single();
      if (invoiceError) throw invoiceError;

const divisions = gangMembers.map(m => ({
  invoice_id: invoice.id,
  member_name: m.name,
  member_type: m.type,
  email: m.email || null,
  amount: m.amount,
}));

      const { error: divisionsError } = await supabase
        .from("non_plot_gang_divisions")
        .insert(divisions);
      if (divisionsError) throw divisionsError;

      // Send PDF to admin with offline support
      const invoicePayload = buildInvoice();
      const { sendInvoiceWithOfflineSupport } = await import("@/lib/invoiceUtilsWithOffline");
      const result = await sendInvoiceWithOfflineSupport(invoicePayload, userName);

      setInvoiceAmount(0);
      setNotes("");
      setGangMembers([]);
      handleRemoveImage();
      onOpenChange(false);

      // Play success sound
      playSuccessSound();
      
      if (result.queued) {
        toast.info("Invoice saved and queued for sending when online", { duration: 5000 });
      } else {
        toast.success("Invoice saved and sent to admin");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save invoice");
    } finally {
      setIsSending(false);
    }
  };

  const handleExport = async () => {
    if (remainingToAllocate !== 0) {
      toast.error("Please allocate the full invoice amount");
      return;
    }
    
    // Get user's full name
    let userName = user?.email || "Unknown";
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      if (profile?.full_name) {
        userName = profile.full_name;
      }
    }
    
    const payload = buildInvoice();
    handleExportPDF(payload, userName);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden max-h-[90vh]" onOpenAutoFocus={(e) => e.preventDefault()}>
          <div className="overflow-y-auto px-6 py-6 space-y-6 max-h-[calc(90vh-2rem)]">
            <div className="flex items-center gap-2">
              <FileText className="h-7 w-7 text-primary" />
              <h2 className="text-2xl font-bold tracking-tight">Non-Plot Invoice</h2>
            </div>

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
                    step={1}
                    max={20000}
                  />

                  <Textarea
                    placeholder="Describe non-plot work"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />

                  {/* Image Upload Section */}
                  <div className="space-y-2">
                    <Label>Attach Image (Optional)</Label>
                    
                    {!imagePreviewUrl ? (
                      <div className="border-2 border-dashed border-muted rounded-lg p-4 hover:border-primary/50 transition-colors">
                        <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center gap-2">
                          <Upload className="h-8 w-8 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Click to upload image</span>
                          <span className="text-xs text-muted-foreground">JPEG, PNG or WebP (max 5MB)</span>
                        </label>
                        <input
                          id="image-upload"
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </div>
                    ) : (
                      <div className="relative border rounded-lg overflow-hidden">
                        <img 
                          src={imagePreviewUrl} 
                          alt="Invoice attachment" 
                          className="w-full h-auto max-h-64 object-contain bg-muted"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={handleRemoveImage}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gang Division */}
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

            {/* ACTIONS */}
            <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="outline"
                className="flex-1"
                disabled={remainingToAllocate !== 0 || gangMembers.length === 0}
                onClick={(e) => {
                  e.stopPropagation();
                  handleExport();
                }}
              >
                Export PDF
              </Button>

              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={remainingToAllocate !== 0 || !notes.trim() || gangMembers.length === 0 || isSending || uploadingImage}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSaveInvoice();
                }}
              >
                {uploadingImage ? "Uploading..." : isSending ? "Sending..." : "Send to Admin"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
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

  <Input
    type="email"
    placeholder="Email (optional)"
    value={memberEmail}
    onChange={(e) => setMemberEmail(e.target.value)}
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