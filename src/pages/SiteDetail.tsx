import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Settings, Plus, Users, Trash2, ShoppingCart, FileText, X, ArrowUp, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import jsPDF from "jspdf";
import { developerLogos } from "@/lib/developerLogos";
import { maskEmail } from "@/lib/emailUtils";

interface Site {
  id: string;
  name: string;
  description: string | null;
  number_of_plots: number;
  number_of_house_types: number;
  developer_id: string | null;
}

interface HouseType {
  id: string;
  name: string;
  total_value: number;
  lift_values: LiftValue[];
}

interface LiftValue {
  id: string;
  lift_type: string;
  value: number;
}

interface Plot {
  id: string;
  plot_number: number;
  house_type_id: string | null;
  assigned_to: string | null;
  house_types: HouseType | null;
}

interface Booking {
  id: string;
  lift_value_id: string;
  plot_id: string;
  percentage: number;
}

interface User {
  user_id: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

interface AvailableUser {
  id: string;
  full_name: string;
  email: string;
}

interface InvoiceItem {
  plot: Plot;
  liftType: string;
  liftValueId: string;
  liftValue: number;
  percentage: number;
  bookedValue: number;
}

interface GangMember {
  name: string;
  type: string;
  amount: number;
}

const LIFT_LABELS = {
  lift_1: "Lift 1",
  lift_2: "Lift 2",
  lift_3: "Lift 3",
  lift_4: "Lift 4",
  lift_5: "Lift 5",
  lift_6: "Lift 6",
  cut_ups: "Cut Ups",
  snag_patch: "Snag/Patch",
  dod: "D.O.D",
};

const SiteDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [site, setSite] = useState<Site | null>(null);
  const [developer, setDeveloper] = useState<{ name: string } | null>(null);
  const [houseTypes, setHouseTypes] = useState<HouseType[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [houseTypeDialogOpen, setHouseTypeDialogOpen] = useState(false);
  const [editingHouseType, setEditingHouseType] = useState<HouseType | null>(null);
  const [houseTypeName, setHouseTypeName] = useState("");
  const [liftValues, setLiftValues] = useState<Record<string, number>>({});
  
  const [plotDialogOpen, setPlotDialogOpen] = useState(false);
  const [selectedPlot, setSelectedPlot] = useState<Plot | null>(null);
  const [selectedHouseTypeId, setSelectedHouseTypeId] = useState("");
  
  const [userAssignDialogOpen, setUserAssignDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");

  const [inviteUserDialogOpen, setInviteUserDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [selectedBookingPlot, setSelectedBookingPlot] = useState<Plot | null>(null);
  const [selectedBookingLiftType, setSelectedBookingLiftType] = useState("");
  const [bookingPercentage, setBookingPercentage] = useState(100);
  
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [gangMembers, setGangMembers] = useState<GangMember[]>([]);
  const [gangDialogOpen, setGangDialogOpen] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberType, setMemberType] = useState("bricklayer");
  const [memberAmount, setMemberAmount] = useState(0);
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [notesAmount, setNotesAmount] = useState(0);
  const [editingMemberIndex, setEditingMemberIndex] = useState<number | null>(null);
  const [tempAmount, setTempAmount] = useState("");
  
  const [plotSummaryDialogOpen, setPlotSummaryDialogOpen] = useState(false);
  const [selectedPlotForSummary, setSelectedPlotForSummary] = useState<Plot | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  
  const [searchPlotNumber, setSearchPlotNumber] = useState("");
  const [searchPhase, setSearchPhase] = useState("");
  
  const stickyScrollRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const shouldShow = window.scrollY > 800;
      setShowBackToTop(shouldShow);
      setShowStickyHeader(shouldShow);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Sync horizontal scroll between sticky header and main table
  useEffect(() => {
    const stickyScroll = stickyScrollRef.current;
    const mainScroll = mainScrollRef.current;

    if (!stickyScroll || !mainScroll) return;

    const syncStickyFromMain = () => {
      if (stickyScroll) {
        stickyScroll.scrollLeft = mainScroll.scrollLeft;
      }
    };

    const syncMainFromSticky = () => {
      if (mainScroll) {
        mainScroll.scrollLeft = stickyScroll.scrollLeft;
      }
    };

    mainScroll.addEventListener('scroll', syncStickyFromMain);
    stickyScroll.addEventListener('scroll', syncMainFromSticky);

    return () => {
      mainScroll.removeEventListener('scroll', syncStickyFromMain);
      stickyScroll.removeEventListener('scroll', syncMainFromSticky);
    };
  }, [showStickyHeader]);

  useEffect(() => {
    if (id) {
      fetchSiteData();
      if (isAdmin) fetchAvailableUsers();
    }
  }, [id, isAdmin]);

  const fetchSiteData = async () => {
    try {
      const { data: siteData, error: siteError } = await supabase
        .from("sites")
        .select("*")
        .eq("id", id)
        .single();

      if (siteError) throw siteError;
      setSite(siteData);

      // Fetch developer if site has developer_id
      if (siteData?.developer_id) {
        const { data: devData, error: devError } = await supabase
          .from("developers")
          .select("name")
          .eq("id", siteData.developer_id)
          .single();
        
        if (!devError && devData) {
          setDeveloper(devData);
        }
      }

      const { data: houseTypesData, error: houseTypesError } = await supabase
        .from("house_types")
        .select(`
          *,
          lift_values (*)
        `)
        .eq("site_id", id);

      if (houseTypesError) throw houseTypesError;
      setHouseTypes(houseTypesData || []);

      const { data: plotsData, error: plotsError } = await supabase
        .from("plots")
        .select(`
          *,
          house_types (
            id,
            name,
            total_value,
            lift_values (*)
          )
        `)
        .eq("site_id", id)
        .order("plot_number");

      if (plotsError) throw plotsError;
      
      // Filter plots if not admin
      let filteredPlots = plotsData || [];
      if (!isAdmin && user) {
        filteredPlots = plotsData?.filter(p => p.assigned_to === user.id) || [];
      }
      setPlots(filteredPlots as any);

      // Fetch bookings for the site
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select("id, lift_value_id, plot_id, percentage")
        .in("plot_id", (plotsData || []).map(p => p.id));

      if (bookingsError) throw bookingsError;
      setBookings(bookingsData || []);

      if (isAdmin) {
        const { data: usersData, error: usersError } = await supabase
          .from("user_site_assignments")
          .select(`
            user_id,
            profiles!inner (
              full_name,
              email
            )
          `)
          .eq("site_id", id);

        if (usersError) throw usersError;
        setUsers(usersData as any || []);
      }
    } catch (error: any) {
      toast.error("Failed to load site data");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name");

      if (error) throw error;
      setAvailableUsers(data || []);
    } catch (error: any) {
      console.error("Error fetching users:", error);
    }
  };

  const openHouseTypeDialog = (houseType?: HouseType) => {
    if (houseType) {
      setEditingHouseType(houseType);
      setHouseTypeName(houseType.name);
      const values: Record<string, number> = {};
      houseType.lift_values.forEach(lv => {
        values[lv.lift_type] = lv.value;
      });
      setLiftValues(values);
    } else {
      setEditingHouseType(null);
      setHouseTypeName("");
      setLiftValues({});
    }
    setHouseTypeDialogOpen(true);
  };

  const handleSaveHouseType = async () => {
    if (!site) return;

    try {
      // Calculate total value from all lift values
      const totalValue = Object.values(liftValues).reduce((sum, value) => sum + (value || 0), 0);

      if (editingHouseType) {
        await supabase
          .from("house_types")
          .update({ name: houseTypeName, total_value: totalValue })
          .eq("id", editingHouseType.id);

        for (const [liftType, value] of Object.entries(liftValues)) {
          const existing = editingHouseType.lift_values.find(lv => lv.lift_type === liftType);
          if (existing) {
            await supabase
              .from("lift_values")
              .update({ value })
              .eq("id", existing.id);
          } else {
            await supabase
              .from("lift_values")
              .insert({ house_type_id: editingHouseType.id, lift_type: liftType as any, value });
          }
        }

        toast.success("House type updated");
      } else {
        const { data: newHouseType, error } = await supabase
          .from("house_types")
          .insert({ site_id: site.id, name: houseTypeName, total_value: totalValue })
          .select()
          .single();

        if (error) throw error;

        const liftValuesArray = Object.entries(liftValues).map(([liftType, value]) => ({
          house_type_id: newHouseType.id,
          lift_type: liftType as any,
          value
        }));

        if (liftValuesArray.length > 0) {
          await supabase.from("lift_values").insert(liftValuesArray);
        }

        toast.success("House type created");
      }

      setHouseTypeDialogOpen(false);
      fetchSiteData();
    } catch (error: any) {
      toast.error("Failed to save house type");
      console.error("Error:", error);
    }
  };

  const handlePlotClick = (plot: Plot) => {
    if (!isAdmin) return;
    
    setSelectedPlot(plot);
    setSelectedHouseTypeId(plot.house_type_id || "");
    setPlotDialogOpen(true);
  };

  const handleAssignHouseType = async () => {
    if (!selectedPlot) return;

    try {
      await supabase
        .from("plots")
        .update({ house_type_id: selectedHouseTypeId || null })
        .eq("id", selectedPlot.id);

      toast.success("House type assigned to plot");
      setPlotDialogOpen(false);
      fetchSiteData();
    } catch (error: any) {
      toast.error("Failed to assign house type");
      console.error("Error:", error);
    }
  };

  const handleAssignUserToPlot = async () => {
    if (!selectedPlot || !selectedUserId) return;

    try {
      await supabase
        .from("plots")
        .update({ assigned_to: selectedUserId })
        .eq("id", selectedPlot.id);

      toast.success("User assigned to plot");
      setUserAssignDialogOpen(false);
      setPlotDialogOpen(false);
      fetchSiteData();
    } catch (error: any) {
      toast.error("Failed to assign user");
      console.error("Error:", error);
    }
  };

  const getLiftValue = (houseType: HouseType | null, liftType: string) => {
    if (!houseType) return 0;
    const lift = houseType.lift_values.find(lv => lv.lift_type === liftType);
    return lift ? lift.value : 0;
  };

  const getTotalBooked = (plot: Plot, liftType: string): number => {
    if (!plot.house_types) return 0;
    
    const liftValue = plot.house_types.lift_values.find(lv => lv.lift_type === liftType);
    if (!liftValue) return 0;

    // Count confirmed bookings
    const liftBookings = bookings.filter(b => 
      b.plot_id === plot.id && b.lift_value_id === liftValue.id
    );
    const confirmedTotal = liftBookings.reduce((sum, b) => sum + b.percentage, 0);

    // Count pending invoice items
    const pendingTotal = invoiceItems
      .filter(item => item.plot.id === plot.id && item.liftType === liftType)
      .reduce((sum, item) => sum + item.percentage, 0);

    return confirmedTotal + pendingTotal;
  };

  const getCellColor = (totalBooked: number): string => {
    if (totalBooked === 0) return "bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/30 cursor-pointer";
    if (totalBooked <= 33) return "bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/20 dark:hover:bg-orange-900/30 cursor-pointer";
    if (totalBooked <= 66) return "bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/30 cursor-pointer";
    if (totalBooked < 100) return "bg-green-100 hover:bg-green-200 dark:bg-green-900/20 dark:hover:bg-green-900/30 cursor-pointer";
    return "bg-green-100 hover:bg-green-200 dark:bg-green-900/20 dark:hover:bg-green-900/30 cursor-pointer";
  };

  const handleLiftCellClick = (plot: Plot, liftType: string) => {
    if (!plot.house_types) {
      toast.error("Please assign a house type to this plot first");
      return;
    }

    const totalBooked = getTotalBooked(plot, liftType);

    // Open booking dialog for all users
    setSelectedBookingPlot(plot);
    setSelectedBookingLiftType(liftType);
    const remaining = 100 - totalBooked;
    setBookingPercentage(Math.min(100, remaining));
    setBookingDialogOpen(true);
  };

  const handleAddToInvoice = () => {
    if (!selectedBookingPlot || !selectedBookingLiftType) return;

    const totalBooked = getTotalBooked(selectedBookingPlot, selectedBookingLiftType);
    const remaining = 100 - totalBooked;

    if (bookingPercentage > remaining) {
      toast.error(`Only ${remaining}% remaining for this lift`);
      return;
    }

    const liftValue = getLiftValue(selectedBookingPlot.house_types, selectedBookingLiftType);
    const liftValueId = selectedBookingPlot.house_types!.lift_values.find(
      lv => lv.lift_type === selectedBookingLiftType
    )?.id || "";

    const bookedValue = (liftValue * bookingPercentage) / 100;

    const newItem: InvoiceItem = {
      plot: selectedBookingPlot,
      liftType: selectedBookingLiftType,
      liftValueId,
      liftValue,
      percentage: bookingPercentage,
      bookedValue
    };

    setInvoiceItems([...invoiceItems, newItem]);
    setBookingDialogOpen(false);
    toast.success("Added to invoice");
  };

  const handleRemoveFromInvoice = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  const handleAddGangMember = () => {
    if (!memberName) {
      toast.error("Please enter a name");
      return;
    }
    
    setGangMembers([...gangMembers, {
      name: memberName,
      type: memberType,
      amount: 0
    }]);
    
    setMemberName("");
    setMemberAmount(0);
    setGangDialogOpen(false);
  };

  const handleRemoveGangMember = (index: number) => {
    setGangMembers(gangMembers.filter((_, i) => i !== index));
  };

  const totalInvoiceValue = invoiceItems.reduce((sum, item) => sum + item.bookedValue, 0) + notesAmount;
  const totalGangAllocated = gangMembers.reduce((sum, m) => sum + m.amount, 0);
  const remainingToAllocate = totalInvoiceValue - totalGangAllocated;
  
  const handleSearchPlot = () => {
    if (!searchPlotNumber) {
      toast.error("Please enter a plot number");
      return;
    }

    const plotNumber = parseInt(searchPlotNumber);
    const plotElement = document.querySelector(`[data-plot-number="${plotNumber}"]`);
    
    if (!plotElement) {
      toast.error(`Plot ${plotNumber} not found`);
      return;
    }

    // Scroll to the plot with offset for sticky header
    const yOffset = -180;
    const y = plotElement.getBoundingClientRect().top + window.pageYOffset + yOffset;
    window.scrollTo({ top: y, behavior: 'smooth' });

    // Highlight the row briefly
    plotElement.classList.add('bg-primary/20');
    setTimeout(() => {
      plotElement.classList.remove('bg-primary/20');
    }, 2000);

    // If phase is selected, highlight that specific cell
    if (searchPhase) {
      const cellElement = plotElement.querySelector(`[data-lift-type="${searchPhase}"]`);
      if (cellElement) {
        cellElement.classList.add('ring-4', 'ring-primary');
        setTimeout(() => {
          cellElement.classList.remove('ring-4', 'ring-primary');
        }, 2000);
      }
    }
  };
  
  const handleUpdateMemberAmount = (index: number, percentage: number) => {
    const calculatedAmount = (totalInvoiceValue * percentage) / 100;
    const otherMembersTotal = gangMembers.reduce((sum, m, i) => i !== index ? sum + m.amount : sum, 0);
    const maxAllowed = totalInvoiceValue - otherMembersTotal;
    const cappedAmount = Math.min(calculatedAmount, maxAllowed);
    
    const updated = [...gangMembers];
    updated[index] = { ...updated[index], amount: cappedAmount };
    setGangMembers(updated);
  };

  const handleDirectAmountInput = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    const otherMembersTotal = gangMembers.reduce((sum, m, i) => i !== index ? sum + m.amount : sum, 0);
    const maxAllowed = totalInvoiceValue - otherMembersTotal;
    const cappedAmount = Math.min(Math.max(0, numValue), maxAllowed);
    
    const updated = [...gangMembers];
    updated[index] = { ...updated[index], amount: cappedAmount };
    setGangMembers(updated);
    setEditingMemberIndex(null);
    setTempAmount("");
  };

  const handlePlotNumberClick = (plot: Plot) => {
    setSelectedPlotForSummary(plot);
    setPlotSummaryDialogOpen(true);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartEditing = (index: number, currentAmount: number) => {
    setEditingMemberIndex(index);
    setTempAmount(currentAmount.toFixed(2));
  };

  const handleConfirmInvoice = async () => {
    if (!user) return;

    if (gangMembers.length === 0) {
      toast.error("Please add at least one gang member");
      return;
    }

    if (Math.abs(remainingToAllocate) > 0.01) {
      toast.error("Please allocate the full invoice value to gang members");
      return;
    }

    try {
      const invoiceNumber = `INV-${Date.now()}`;
      
      for (const item of invoiceItems) {
        const { data: booking, error: bookingError } = await supabase
          .from("bookings")
          .insert({
            lift_value_id: item.liftValueId,
            plot_id: item.plot.id,
            booked_by: user.id,
            percentage: item.percentage,
            booked_value: item.bookedValue,
            invoice_number: invoiceNumber,
            status: "confirmed",
            notes: invoiceNotes
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
      }

      toast.success("Invoice sent to admin successfully");
      setInvoiceItems([]);
      setGangMembers([]);
      setInvoiceNotes("");
      setNotesAmount(0);
      setInvoiceDialogOpen(false);
      fetchSiteData();
    } catch (error: any) {
      toast.error("Failed to send invoice");
      console.error("Error:", error);
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Invoice", 20, 20);
    
    if (site) {
      doc.setFontSize(12);
      doc.text(`Site: ${site.name}`, 20, 30);
    }
    
    doc.setFontSize(12);
    let y = 45;
    
    doc.text("Invoice Items:", 20, y);
    y += 10;
    
    invoiceItems.forEach((item, index) => {
      doc.setFontSize(10);
      doc.text(`${index + 1}. Plot ${item.plot.plot_number} - ${LIFT_LABELS[item.liftType as keyof typeof LIFT_LABELS]}`, 25, y);
      y += 6;
      doc.text(`   ${item.percentage}% of £${item.liftValue.toFixed(2)} = £${item.bookedValue.toFixed(2)}`, 25, y);
      y += 10;
    });
    
    y += 5;
    doc.setFontSize(12);
    doc.text(`Total Value: £${totalInvoiceValue.toFixed(2)}`, 20, y);
    y += 15;
    
    if (invoiceNotes) {
      doc.text("Notes:", 20, y);
      y += 8;
      doc.setFontSize(10);
      const splitNotes = doc.splitTextToSize(invoiceNotes, 170);
      doc.text(splitNotes, 25, y);
      y += (splitNotes.length * 6) + 10;
    }
    
    if (gangMembers.length > 0) {
      doc.setFontSize(12);
      doc.text("Gang Division:", 20, y);
      y += 10;
      
      gangMembers.forEach((member) => {
        doc.setFontSize(10);
        doc.text(`${member.name} (${member.type}): £${member.amount.toFixed(2)}`, 25, y);
        y += 8;
      });
      
      y += 5;
      doc.setFontSize(12);
      doc.text(`Total Allocated: £${totalGangAllocated.toFixed(2)}`, 20, y);
    }
    
    doc.save(`invoice-${Date.now()}.pdf`);
    toast.success("PDF exported");
  };

  const handleInviteUser = async () => {
    if (!site || !inviteEmail.trim() || !user) return;

    try {
      // Create an invitation record
      const { error } = await supabase
        .from("invitations")
        .insert({
          email: inviteEmail.trim().toLowerCase(),
          site_id: site.id,
          invited_by: user.id
        });

      if (error) {
        if (error.code === '23505') {
          toast.error("This user has already been invited to this site");
        } else {
          throw error;
        }
      } else {
        toast.success("Invitation sent! User can now sign up and will automatically get access to this site.");
      }

      setInviteUserDialogOpen(false);
      setInviteEmail("");
      fetchSiteData();
    } catch (error: any) {
      toast.error(error.message || "Failed to send invitation");
      console.error("Error:", error);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!site || !confirm("Remove this user from the site?")) return;

    try {
      const { error } = await supabase
        .from("user_site_assignments")
        .delete()
        .eq("user_id", userId)
        .eq("site_id", site.id);

      if (error) throw error;

      toast.success("User removed from site");
      fetchSiteData();
    } catch (error: any) {
      toast.error("Failed to remove user");
      console.error("Error:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary/30">
        <Header showBackButton />
        <main className="container py-8">
          <p className="text-center text-muted-foreground">Loading...</p>
        </main>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="min-h-screen bg-secondary/30">
        <Header showBackButton />
        <main className="container py-8">
          <p className="text-center text-muted-foreground">Site not found</p>
        </main>
      </div>
    );
  }

  const developerLogo = developer ? developerLogos[developer.name] : undefined;

  return (
    <div className="min-h-screen bg-secondary/30">
      {/* Sticky Header with Column Titles */}
      {showStickyHeader && site && (
        <div className="fixed top-16 left-0 right-0 z-40 bg-background/95 backdrop-blur border-b shadow-md">
          <div ref={stickyScrollRef} className="container py-2 overflow-x-auto">
            <table className="w-full border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left font-medium text-sm w-20">Plot</th>
                  <th className="p-2 text-left font-medium text-sm w-32">House Type</th>
                  {Object.values(LIFT_LABELS).map(label => (
                    <th key={label} className="p-2 text-center font-medium whitespace-nowrap text-sm min-w-[80px]">{label}</th>
                  ))}
                  {isAdmin && <th className="p-2 text-center font-medium text-sm w-24">Actions</th>}
                </tr>
              </thead>
            </table>
          </div>
        </div>
      )}
      
      <Header 
        showBackButton
        actions={
          <>
            {isAdmin && users.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1" title="View Invited Users">
                    <Users className="h-4 w-4" />
                    <span className="hidden md:inline">Invited Users</span>
                    <span className="hidden sm:inline md:hidden">({users.length})</span>
                    <ChevronDown className="h-4 w-4 hidden md:inline" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  className="w-80 max-h-96 overflow-y-auto bg-background z-50"
                >
                  {users.map((u) => (
                    <DropdownMenuItem 
                      key={u.user_id} 
                      className="flex items-center justify-between p-3 cursor-default focus:bg-muted"
                      onSelect={(e) => e.preventDefault()}
                    >
                      <div className="flex-1">
                        <p className="font-medium">{u.profiles.full_name}</p>
                        <p className="text-sm text-muted-foreground">{maskEmail(u.profiles.email)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveUser(u.user_id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {isAdmin && (
              <>
                <Button onClick={() => openHouseTypeDialog()} size="sm" title="Add House Type">
                  <Plus className="h-4 w-4" />
                  <span className="hidden md:inline ml-2">Add House Type</span>
                </Button>
                <Button onClick={() => setInviteUserDialogOpen(true)} variant="outline" size="sm" title="Invite Users" className="gap-1">
                  <Plus className="h-3 w-3" />
                  <Users className="h-4 w-4" />
                  <span className="hidden md:inline ml-1">Invite Users</span>
                </Button>
              </>
            )}
            {invoiceItems.length > 0 && (
              <Button 
                onClick={() => setInvoiceDialogOpen(true)}
                variant="default"
                size="sm"
                title="View Invoice"
              >
                <FileText className="h-4 w-4" />
                <span className="hidden md:inline ml-2">View Invoice</span>
              </Button>
            )}
          </>
        }
      />
      
      <main className="container py-8">
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {developerLogo && (
            <img 
              src={developerLogo} 
              alt={developer?.name || "Developer"}
              className="h-12 w-auto object-contain rounded-lg"
            />
          )}
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{site.name}</h2>
            {site.description && (
              <p className="text-muted-foreground">{site.description}</p>
            )}
          </div>
        </div>

        <div className="mb-6 flex gap-4 justify-between items-center">
          <div className="flex gap-4">
          </div>
        </div>

        {houseTypes.length > 0 && isAdmin && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">House Types</h3>
            <div className="flex gap-2 flex-wrap">
              {houseTypes.map(ht => (
                <Button
                  key={ht.id}
                  variant="outline"
                  size="sm"
                  onClick={() => openHouseTypeDialog(ht)}
                >
                  {ht.name}
                </Button>
              ))}
            </div>
          </div>
        )}


        {/* Search Box */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-3 items-end flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="searchPlot">Plot Number</Label>
                <Input
                  id="searchPlot"
                  type="number"
                  placeholder="Enter plot number"
                  value={searchPlotNumber}
                  onChange={(e) => setSearchPlotNumber(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchPlot()}
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="searchPhase">Phase (Optional)</Label>
                <Select value={searchPhase} onValueChange={setSearchPhase}>
                  <SelectTrigger id="searchPhase">
                    <SelectValue placeholder="All Phases" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LIFT_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => {
                handleSearchPlot();
                setSearchPlotNumber("");
                setSearchPhase("");
              }}>Search</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="relative">
          <CardHeader>
            <CardTitle>Plot Grid</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {plots.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 px-6">
                {isAdmin ? "No plots created yet" : "No plots assigned to you"}
              </p>
            ) : (
              <div ref={mainScrollRef} className="overflow-auto relative max-h-[70vh]">
                <div className="inline-block min-w-full">
                  <table className="w-full border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b">
                      <th className="p-2 text-left font-medium w-20">Plot</th>
                      <th className="p-2 text-left font-medium w-32">House Type</th>
                      {Object.values(LIFT_LABELS).map(label => (
                        <th key={label} className="p-2 text-center font-medium whitespace-nowrap text-sm min-w-[80px]">{label}</th>
                      ))}
                      {isAdmin && <th className="p-2 text-center font-medium w-24">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {plots.map(plot => (
                      <tr key={plot.id} className="border-b transition-colors" data-plot-number={plot.plot_number}>
                        <td 
                          className="p-2 font-medium cursor-pointer hover:bg-primary/10"
                          onClick={() => handlePlotNumberClick(plot)}
                        >
                          {plot.plot_number}
                        </td>
                        <td 
                          className={`p-2 ${isAdmin ? 'cursor-pointer hover:bg-primary/10' : ''}`}
                          onClick={() => isAdmin && handlePlotClick(plot)}
                        >
                          {plot.house_types?.name || "-"}
                        </td>
                        {Object.keys(LIFT_LABELS).map(liftType => {
                          const totalBooked = getTotalBooked(plot, liftType);
                          
                          return (
                            <td 
                              key={liftType}
                              data-lift-type={liftType}
                              className={`p-4 text-center transition-all ${getCellColor(totalBooked)}`}
                              onClick={() => handleLiftCellClick(plot, liftType)}
                            >
                              <div className="flex items-center justify-center min-h-[50px]">
                                <span className="text-xl font-bold text-foreground">{totalBooked}%</span>
                              </div>
                            </td>
                          );
                        })}
                        {isAdmin && (
                          <td className="p-2 text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPlot(plot);
                                setUserAssignDialogOpen(true);
                              }}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* House Type Dialog */}
        <Dialog open={houseTypeDialogOpen} onOpenChange={setHouseTypeDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingHouseType ? "Edit House Type" : "Add House Type"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>House Type Name</Label>
                <Input
                  value={houseTypeName}
                  onChange={(e) => setHouseTypeName(e.target.value)}
                  placeholder="e.g., Type A"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(LIFT_LABELS).map(([key, label]) => (
                  <div key={key} className="space-y-2">
                    <Label>{label}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={liftValues[key] === 0 ? "" : liftValues[key]}
                      onChange={(e) => setLiftValues({ ...liftValues, [key]: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveHouseType} className="flex-1">
                  Save House Type
                </Button>
                {editingHouseType && (
                  <Button 
                    variant="destructive" 
                    onClick={async () => {
                      if (!confirm("Delete this house type?")) return;
                      try {
                        await supabase
                          .from("house_types")
                          .delete()
                          .eq("id", editingHouseType.id);
                        toast.success("House type deleted");
                        setHouseTypeDialogOpen(false);
                        fetchSiteData();
                      } catch (error: any) {
                        toast.error("Failed to delete house type");
                        console.error("Error:", error);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Plot Assignment Dialog */}
        <Dialog open={plotDialogOpen} onOpenChange={setPlotDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage Plot {selectedPlot?.plot_number}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>House Type</Label>
                <Select value={selectedHouseTypeId} onValueChange={setSelectedHouseTypeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select house type" />
                  </SelectTrigger>
                  <SelectContent>
                    {houseTypes.map(ht => (
                      <SelectItem key={ht.id} value={ht.id}>{ht.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAssignHouseType} className="w-full">
                Update House Type
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* User Assignment Dialog */}
        <Dialog open={userAssignDialogOpen} onOpenChange={setUserAssignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign User to Plot {selectedPlot?.plot_number}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>User</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    
                    {users.map(u => (
                      <SelectItem key={u.user_id} value={u.user_id}>
                        {u.profiles.full_name} ({maskEmail(u.profiles.email)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAssignUserToPlot} className="w-full">
                Assign User
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Invite User Dialog */}
        <Dialog open={inviteUserDialogOpen} onOpenChange={setInviteUserDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite User to Site</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <Button onClick={handleInviteUser} className="w-full" disabled={!inviteEmail.trim()}>
                Send Invitation
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Booking Dialog */}
        <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Book Work</DialogTitle>
            </DialogHeader>
            {selectedBookingPlot && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Plot {selectedBookingPlot.plot_number}</p>
                  <p className="font-semibold">{LIFT_LABELS[selectedBookingLiftType as keyof typeof LIFT_LABELS]}</p>
                  <p className="text-lg font-bold text-primary mt-2">
                    £{getLiftValue(selectedBookingPlot.house_types, selectedBookingLiftType).toFixed(2)}
                  </p>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Already Booked:</span>
                    <span className="font-semibold">{getTotalBooked(selectedBookingPlot, selectedBookingLiftType)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Available:</span>
                    <span className="font-semibold text-primary">
                      {100 - getTotalBooked(selectedBookingPlot, selectedBookingLiftType)}%
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Percentage: {bookingPercentage}%</Label>
                  <Slider
                    value={[bookingPercentage]}
                    onValueChange={(value) => setBookingPercentage(value[0])}
                    min={1}
                    max={100 - getTotalBooked(selectedBookingPlot, selectedBookingLiftType)}
                    step={1}
                  />
                </div>

                <div className="p-4 bg-primary/10 rounded-lg">
                  <div className="flex justify-between">
                    <span className="font-medium">Booking Value:</span>
                    <span className="text-xl font-bold text-primary">
                      £{((getLiftValue(selectedBookingPlot.house_types, selectedBookingLiftType) * bookingPercentage) / 100).toFixed(2)}
                    </span>
                  </div>
                </div>

                <Button onClick={handleAddToInvoice} className="w-full">
                  Add to Invoice
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Invoice Dialog */}
        <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoice
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Invoice Items */}
              <Card>
                <CardHeader>
                  <CardTitle>Items</CardTitle>
                </CardHeader>
                <CardContent>
                  {invoiceItems.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">No items added</p>
                  ) : (
                    <div className="space-y-2">
                      {invoiceItems.map((item, index) => (
                        <div key={index} className="flex justify-between items-start p-3 bg-muted rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium">
                              Plot {item.plot.plot_number} - {LIFT_LABELS[item.liftType as keyof typeof LIFT_LABELS]}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {item.percentage}% of £{item.liftValue.toFixed(2)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-primary">£{item.bookedValue.toFixed(2)}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveFromInvoice(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      
                      <div className="flex justify-between items-center pt-4 border-t">
                        <span className="font-semibold text-lg">Total:</span>
                        <span className="font-bold text-2xl text-primary">
                          £{totalInvoiceValue.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Notes Section */}
              {invoiceItems.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Notes & Additional Amount</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <textarea
                        className="w-full min-h-[100px] p-3 rounded-md border border-input bg-background resize-y focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        placeholder="Add any notes or comments about this invoice..."
                        value={invoiceNotes}
                        onChange={(e) => setInvoiceNotes(e.target.value)}
                        maxLength={500}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {invoiceNotes.length}/500 characters
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Add Additional Amount: £{notesAmount.toFixed(2)}</Label>
                      <Slider
                        value={[notesAmount]}
                        onValueChange={(value) => setNotesAmount(value[0])}
                        min={0}
                        max={5000}
                        step={10}
                      />
                      <p className="text-xs text-muted-foreground">
                        Use this slider to add extra charges like materials, travel, etc.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Gang Division */}
              {invoiceItems.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Gang Division - Who Gets Paid</CardTitle>
                      <Button onClick={() => setGangDialogOpen(true)} size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Member
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {gangMembers.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">
                        No gang members added yet - add members to allocate payment
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {gangMembers.map((member, index) => (
                          <div key={index} className="p-3 bg-muted rounded-lg space-y-3">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">{member.name}</p>
                                <p className="text-sm text-muted-foreground capitalize">{member.type}</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveGangMember(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                {editingMemberIndex === index ? (
                                  <Input
                                    type="number"
                                    value={tempAmount}
                                    onChange={(e) => setTempAmount(e.target.value)}
                                    onBlur={() => handleDirectAmountInput(index, tempAmount)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleDirectAmountInput(index, tempAmount);
                                      }
                                    }}
                                    className="w-32"
                                    autoFocus
                                    step="0.01"
                                    min="0"
                                  />
                                ) : (
                                  <Label 
                                    className="text-sm cursor-pointer hover:text-primary transition-colors"
                                    onClick={() => handleStartEditing(index, member.amount)}
                                  >
                                    Amount: £{member.amount.toFixed(2)}
                                  </Label>
                                )}
                              </div>
                              <Slider
                                value={[(member.amount / totalInvoiceValue) * 100]}
                                onValueChange={(value) => handleUpdateMemberAmount(index, value[0])}
                                min={0}
                                max={100}
                                step={1}
                              />
                            </div>
                          </div>
                        ))}
                        
                        <div className="mt-4 pt-4 border-t space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Invoice Total:</span>
                            <span className="font-semibold">£{totalInvoiceValue.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Allocated:</span>
                            <span className="font-semibold">£{totalGangAllocated.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Remaining:</span>
                            <span className={`font-semibold ${remainingToAllocate < 0 ? 'text-destructive' : remainingToAllocate > 0 ? 'text-orange-500' : 'text-green-500'}`}>
                              £{remainingToAllocate.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              {invoiceItems.length > 0 && (
                <div className="flex gap-2">
                  <Button 
                    onClick={handleExportPDF} 
                    variant="outline"
                    className="flex-1"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Export PDF
                  </Button>
                  <Button 
                    onClick={handleConfirmInvoice} 
                    className="flex-1"
                    disabled={gangMembers.length === 0 || Math.abs(remainingToAllocate) > 0.01}
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
                  placeholder="Enter name"
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
                    <SelectItem value="hod carrier">Hod Carrier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground">
                Amount will be allocated using the slider in the invoice view
              </p>
              <Button onClick={handleAddGangMember} className="w-full">
                Add Member
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Plot Summary Dialog */}
        <Dialog open={plotSummaryDialogOpen} onOpenChange={setPlotSummaryDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Plot {selectedPlotForSummary?.plot_number} Summary</DialogTitle>
            </DialogHeader>
            {selectedPlotForSummary && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">House Type</p>
                  <p className="font-semibold text-lg">
                    {selectedPlotForSummary.house_types?.name || "Not assigned"}
                  </p>
                </div>

                {isAdmin && (
                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground mb-1">Assigned User</p>
                    {selectedPlotForSummary.assigned_to ? (
                      <div className="bg-muted p-3 rounded-lg">
                        {users.find(u => u.user_id === selectedPlotForSummary.assigned_to) ? (
                          <>
                            <p className="font-semibold">
                              {users.find(u => u.user_id === selectedPlotForSummary.assigned_to)?.profiles.full_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {maskEmail(users.find(u => u.user_id === selectedPlotForSummary.assigned_to)?.profiles.email || '')}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">User details not available</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No user assigned</p>
                    )}
                  </div>
                )}

                {selectedPlotForSummary.house_types && (
                  <>
                    <div className="border-t pt-4">
                      <p className="font-semibold mb-3">Lift Values</p>
                      <div className="space-y-2">
                        {selectedPlotForSummary.house_types.lift_values.map((lift) => (
                          <div key={lift.id} className="flex justify-between items-center p-2 bg-muted rounded">
                            <span className="text-sm">
                              {LIFT_LABELS[lift.lift_type as keyof typeof LIFT_LABELS]}
                            </span>
                            <span className="font-medium">£{lift.value.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-lg">Total Value:</span>
                        <span className="font-bold text-2xl text-primary">
                          £{selectedPlotForSummary.house_types.total_value.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Back to Top Button */}
        {showBackToTop && (
          <Button
            onClick={scrollToTop}
            size="icon"
            className="fixed bottom-6 right-6 z-50 rounded-full shadow-lg"
          >
            <ArrowUp className="h-5 w-5" />
          </Button>
        )}
      </main>
    </div>
  );
};

export default SiteDetail;
