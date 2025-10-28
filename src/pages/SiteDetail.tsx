import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Settings, Plus, Users, Trash2, ShoppingCart, FileText, X, ArrowUp, ChevronDown, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import jsPDF from "jspdf";
import { developerLogos } from "@/lib/developerLogos";
import { maskEmail } from "@/lib/emailUtils";
import logo from "@/assets/logo.png";
import { GangDivisionCard } from "@/components/invoice/GangDivisionCard";
import { useSavedGangMembers } from "@/hooks/useSavedGangMembers";
import type { GangMember as GangDivisionMember } from "@/components/invoice/GangDivisionCard";
import { usePinchZoom } from "@/hooks/usePinchZoom";
import { PDFDocument } from 'pdf-lib';

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

interface AssignmentHistory {
  id: string;
  user_id: string;
  assigned_at: string;
  removed_at: string | null;
  profiles: {
    email: string;
    full_name: string;
  } | null;
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
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [houseTypeDialogOpen, setHouseTypeDialogOpen] = useState(false);
  const [editingHouseType, setEditingHouseType] = useState<HouseType | null>(null);
  const [houseTypeName, setHouseTypeName] = useState("");
  const [liftValues, setLiftValues] = useState<Record<string, number>>({});
  const [uploadedDrawings, setUploadedDrawings] = useState<File[]>([]);
  const [existingDrawings, setExistingDrawings] = useState<any[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [drawingsDialogOpen, setDrawingsDialogOpen] = useState(false);
  const [selectedHouseTypeForDrawings, setSelectedHouseTypeForDrawings] = useState<HouseType | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerContent, setViewerContent] = useState<{ url: string; type: string; name: string } | null>(null);
  
  
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
  const [gangMembers, setGangMembers] = useState<GangDivisionMember[]>([]);
  const [gangDialogOpen, setGangDialogOpen] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberType, setMemberType] = useState("bricklayer");
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [notesAmount, setNotesAmount] = useState(0);
  const [editingNotesAmount, setEditingNotesAmount] = useState(false);
  const [tempNotesAmount, setTempNotesAmount] = useState("");
  const [editingBookingPercentage, setEditingBookingPercentage] = useState(false);
  const [tempBookingPercentage, setTempBookingPercentage] = useState("");
  
  const { savedMembers, fetchSavedMembers } = useSavedGangMembers();
  
  const [plotSummaryDialogOpen, setPlotSummaryDialogOpen] = useState(false);
  const [selectedPlotForSummary, setSelectedPlotForSummary] = useState<Plot | null>(null);
  const [plotAssignmentHistory, setPlotAssignmentHistory] = useState<AssignmentHistory[]>([]);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  
  const [searchPlotNumber, setSearchPlotNumber] = useState("");
  const [searchPhase, setSearchPhase] = useState("");
  const [selectedUserForHighlight, setSelectedUserForHighlight] = useState<string | null>(null);
  const [highlightedPlots, setHighlightedPlots] = useState<number[]>([]);
  const [showScrollUpIndicator, setShowScrollUpIndicator] = useState(false);
  const [showScrollDownIndicator, setShowScrollDownIndicator] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userPlotsDialogOpen, setUserPlotsDialogOpen] = useState(false);
  const [selectedUserForDialog, setSelectedUserForDialog] = useState<User | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  
  const stickyScrollRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  
  const { containerRef: pinchZoomContainerRef, scale: zoomScale, position: zoomPosition, style: zoomStyle } = usePinchZoom({
    minScale: 0.5,
    maxScale: 3,
    onlyMobile: true,
  });

  useEffect(() => {
    const handleScroll = () => {
      const shouldShow = window.scrollY > 300;
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

        // Fetch pending invitations
        const { data: invitationsData, error: invitationsError } = await supabase
          .from("invitations")
          .select("*")
          .eq("site_id", id)
          .eq("status", "pending");

        if (!invitationsError && invitationsData) {
          setPendingInvitations(invitationsData);
        }
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

  const openHouseTypeDialog = async (houseType?: HouseType) => {
    if (houseType) {
      setEditingHouseType(houseType);
      setHouseTypeName(houseType.name);
      const values: Record<string, number> = {};
      houseType.lift_values.forEach(lv => {
        values[lv.lift_type] = lv.value;
      });
      setLiftValues(values);
      
      // Fetch existing drawings
      const { data: drawings } = await supabase
        .from("house_type_drawings")
        .select("*")
        .eq("house_type_id", houseType.id)
        .order("display_order");
      setExistingDrawings(drawings || []);
    } else {
      setEditingHouseType(null);
      setHouseTypeName("");
      setLiftValues({});
      setExistingDrawings([]);
    }
    setUploadedDrawings([]);
    setUploadProgress({});
    setHouseTypeDialogOpen(true);
  };

  const handleSaveHouseType = async () => {
    if (!site || !user) return;

    try {
      // Calculate total value from all lift values
      const totalValue = Object.values(liftValues).reduce((sum, value) => sum + (value || 0), 0);

      let houseTypeId: string;

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

        houseTypeId = editingHouseType.id;
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

        houseTypeId = newHouseType.id;
        toast.success("House type created");
      }

      // Upload new drawings
      if (uploadedDrawings.length > 0) {
        for (let i = 0; i < uploadedDrawings.length; i++) {
          const file = uploadedDrawings[i];
          const progressKey = `${file.name}-${i}`;
          
          // Set initial progress
          setUploadProgress(prev => ({ ...prev, [progressKey]: 0 }));
          
          const fileExt = file.name.split('.').pop();
          const fileName = `${houseTypeId}/${Date.now()}_${i}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('house-type-drawings')
            .upload(fileName, file);

          if (uploadError) {
            setUploadProgress(prev => {
              const newProgress = { ...prev };
              delete newProgress[progressKey];
              return newProgress;
            });
            throw uploadError;
          }

          // Set progress to 50% after upload
          setUploadProgress(prev => ({ ...prev, [progressKey]: 50 }));

          const { data: { publicUrl } } = supabase.storage
            .from('house-type-drawings')
            .getPublicUrl(fileName);

          await supabase
            .from('house_type_drawings')
            .insert({
              house_type_id: houseTypeId,
              file_url: publicUrl,
              file_name: file.name,
              file_type: file.type,
              display_order: existingDrawings.length + i,
              uploaded_by: user.id
            });
          
          // Complete - remove from progress
          setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[progressKey];
            return newProgress;
          });
        }
        toast.success("Drawings uploaded");
      }

      setUploadedDrawings([]);
      setUploadProgress({});
      setHouseTypeDialogOpen(false);
      fetchSiteData();
    } catch (error: any) {
      toast.error("Failed to save house type");
      console.error("Error:", error);
    }
  };

  const splitPdfPages = async (file: File): Promise<File[]> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pageCount = pdfDoc.getPageCount();
      
      if (pageCount <= 1) {
        return [file];
      }

      const splitFiles: File[] = [];
      const baseName = file.name.replace('.pdf', '');
      
      for (let i = 0; i < pageCount; i++) {
        const newPdf = await PDFDocument.create();
        const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
        newPdf.addPage(copiedPage);
        
        const pdfBytes = await newPdf.save();
        const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
        const newFile = new File([blob], `${baseName}_Page_${i + 1}.pdf`, { type: 'application/pdf' });
        splitFiles.push(newFile);
      }
      
      return splitFiles;
    } catch (error) {
      console.error('Error splitting PDF:', error);
      toast.error('Failed to process PDF');
      return [file];
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate file types and sizes
    const validFiles = files.filter(file => {
      const isValidType = file.type === 'application/pdf' || file.type.startsWith('image/');
      const isValidSize = file.size <= 50 * 1024 * 1024; // 50MB limit
      
      if (!isValidType) {
        toast.error(`${file.name}: Only PDF and image files are allowed`);
        return false;
      }
      if (!isValidSize) {
        toast.error(`${file.name}: File size must be under 50MB`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Process PDFs and split multi-page ones
    const processedFiles: File[] = [];
    for (const file of validFiles) {
      if (file.type === 'application/pdf') {
        const splitFiles = await splitPdfPages(file);
        processedFiles.push(...splitFiles);
        if (splitFiles.length > 1) {
          toast.success(`Split ${file.name} into ${splitFiles.length} pages`);
        }
      } else {
        processedFiles.push(file);
      }
    }

    setUploadedDrawings([...uploadedDrawings, ...processedFiles]);
  };

  const handleRemoveUploadedDrawing = (index: number) => {
    setUploadedDrawings(uploadedDrawings.filter((_, i) => i !== index));
  };

  const handleDeleteExistingDrawing = async (drawingId: string, fileUrl: string) => {
    if (!confirm("Delete this drawing?")) return;

    try {
      // Extract file path from URL
      const urlParts = fileUrl.split('/house-type-drawings/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage
          .from('house-type-drawings')
          .remove([filePath]);
      }

      await supabase
        .from('house_type_drawings')
        .delete()
        .eq('id', drawingId);

      setExistingDrawings(existingDrawings.filter(d => d.id !== drawingId));
      toast.success("Drawing deleted");
    } catch (error: any) {
      toast.error("Failed to delete drawing");
      console.error("Error:", error);
    }
  };

  const handleDeleteAllDrawings = async () => {
    if (!selectedHouseTypeForDrawings) return;
    if (!confirm(`Delete all ${existingDrawings.length + uploadedDrawings.length} drawings?`)) return;

    try {
      // Delete existing drawings from storage and database
      for (const drawing of existingDrawings) {
        const urlParts = drawing.file_url.split('/house-type-drawings/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          await supabase.storage
            .from('house-type-drawings')
            .remove([filePath]);
        }

        await supabase
          .from('house_type_drawings')
          .delete()
          .eq('id', drawing.id);
      }

      // Clear uploaded drawings that haven't been saved yet
      setUploadedDrawings([]);
      setExistingDrawings([]);
      toast.success("All drawings deleted");
    } catch (error: any) {
      toast.error("Failed to delete drawings");
      console.error("Error:", error);
    }
  };

  const handleViewDrawing = (url: string, type: string, name: string) => {
    console.log('Opening viewer:', { url, type, name });
    setViewerContent({ url, type, name });
    setViewerOpen(true);
  };

  const openDrawingsDialog = async (houseType: HouseType) => {
    setSelectedHouseTypeForDrawings(houseType);
    
    const { data: drawings } = await supabase
      .from("house_type_drawings")
      .select("*")
      .eq("house_type_id", houseType.id)
      .order("display_order");
    
    setExistingDrawings(drawings || []);
    setDrawingsDialogOpen(true);
  };

  const handleExportDrawing = (fileUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

      toast.success("Bricklayer assigned to plot");
      setUserAssignDialogOpen(false);
      setPlotDialogOpen(false);
      fetchSiteData();
    } catch (error: any) {
      toast.error("Failed to assign bricklayer");
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

  const isPendingInInvoice = (plot: Plot, liftType: string): boolean => {
    return invoiceItems.some(item => item.plot.id === plot.id && item.liftType === liftType);
  };

  const getCellColor = (totalBooked: number, isPending: boolean): string => {
    if (isPending) return "bg-blue-200 hover:bg-blue-300 dark:bg-blue-900/40 dark:hover:bg-blue-900/50 cursor-pointer";
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

    // Check if lift has a price
    const liftValue = getLiftValue(plot.house_types, liftType);
    if (liftValue === 0) {
      toast.error("No price set for this lift");
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
    toast.success("Added to invoice");
    setBookingDialogOpen(false);
  };

  const handleRemoveFromInvoice = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  const handleAddGangMember = async () => {
    if (!memberName.trim() || !user) {
      toast.error("Name required");
      return;
    }

    try {
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

      await fetchSavedMembers();
      
      setGangMembers([...gangMembers, {
        id: data.id,
        name: data.name,
        type: data.type,
        amount: 0,
        editing: false,
      }]);

      setMemberName("");
      setMemberType("bricklayer");
      setGangDialogOpen(false);
      toast.success("Gang member saved");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save gang member");
    }
  };

  const handleAddExistingMember = (member: any) => {
    if (gangMembers.some((m) => m.id === member.id)) {
      toast.error("Already added");
      return;
    }
    setGangMembers([...gangMembers, { ...member, amount: 0, editing: false }]);
    toast.success(`${member.name} added`);
  };

  const handleDeletePermanently = async (memberId: string, index: number) => {
    if (!confirm("Delete this member permanently from your saved gang members?")) return;
    
    try {
      const { error } = await supabase
        .from("saved_gang_members")
        .delete()
        .eq("id", memberId)
        .eq("user_id", user?.id);

      if (error) throw error;
      
      await fetchSavedMembers();
      setGangMembers(gangMembers.filter((_, i) => i !== index));
      toast.success("Member deleted permanently");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete member");
    }
  };

  const handleRemoveGangMember = (index: number) => {
    setGangMembers(gangMembers.filter((_, i) => i !== index));
  };

  const handleStartEditing = (index: number) => {
    const updated = [...gangMembers];
    updated[index].editing = true;
    setGangMembers(updated);
  };

  const handleStopEditing = (index: number) => {
    const updated = [...gangMembers];
    updated[index].editing = false;
    setGangMembers(updated);
  };

  const handleUpdateMemberAmount = (index: number, newAmount: number) => {
    const updated = [...gangMembers];
    updated[index].amount = newAmount;
    setGangMembers(updated);
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
      const cellElement = plotElement.querySelector(`[data-lift-type="${searchPhase}"]`) as HTMLElement;
      if (cellElement) {
        cellElement.style.outline = '3px solid hsl(var(--primary))';
        cellElement.style.outlineOffset = '-3px';
        cellElement.style.borderRadius = '0.5rem';
        setTimeout(() => {
          cellElement.style.outline = '';
          cellElement.style.outlineOffset = '';
          cellElement.style.borderRadius = '';
        }, 2000);
      }
    }
  };
  
  const handlePlotNumberClick = async (plot: Plot) => {
    setSelectedPlotForSummary(plot);
    setPlotSummaryDialogOpen(true);
    
    // Fetch assignment history for this plot
    if (isAdmin) {
      try {
        const { data, error } = await supabase
          .from('plot_assignment_history')
          .select(`
            id,
            user_id,
            assigned_at,
            removed_at
          `)
          .eq('plot_id', plot.id)
          .order('assigned_at', { ascending: false });
        
        if (error) throw error;
        
        // Fetch profiles for all users in history
        if (data && data.length > 0) {
          const userIds = [...new Set(data.map(h => h.user_id))];
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .in('id', userIds);
          
          // Merge profiles with history
          const historyWithProfiles = data.map(h => ({
            ...h,
            profiles: profilesData?.find(p => p.id === h.user_id) || null
          }));
          
          setPlotAssignmentHistory(historyWithProfiles);
        } else {
          setPlotAssignmentHistory([]);
        }
      } catch (error) {
        console.error('Error fetching assignment history:', error);
        setPlotAssignmentHistory([]);
      }
    }
  };

  const clearHighlights = () => {
    highlightedPlots.forEach(plotNumber => {
      const plotElement = document.querySelector(`[data-plot-number="${plotNumber}"]`);
      if (plotElement) {
        plotElement.classList.remove('bg-primary/20');
      }
    });
    setHighlightedPlots([]);
    setSelectedUserForHighlight(null);
    setShowScrollUpIndicator(false);
    setShowScrollDownIndicator(false);
  };

  const handleUserSelect = (userId: string) => {
    // Clear previous highlights
    clearHighlights();
    
    setSelectedUserForHighlight(userId);
    
    // Find all plots assigned to this user
    const userPlots = plots.filter(p => p.assigned_to === userId);
    
    if (userPlots.length === 0) {
      toast.info("No plots assigned to this bricklayer");
      return;
    }

    // Scroll to first plot
    const firstPlotElement = document.querySelector(`[data-plot-number="${userPlots[0].plot_number}"]`);
    if (firstPlotElement) {
      const yOffset = -180;
      const y = firstPlotElement.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }

    // Highlight all user's plots persistently
    const plotNumbers = userPlots.map(p => p.plot_number);
    setHighlightedPlots(plotNumbers);
    
    userPlots.forEach(plot => {
      const plotElement = document.querySelector(`[data-plot-number="${plot.plot_number}"]`);
      if (plotElement) {
        plotElement.classList.add('bg-primary/20');
      }
    });

    toast.success(`Highlighting ${userPlots.length} plot(s). Long press to clear.`);
  };

  const handleUserClick = (user: User) => {
    setSelectedUserForDialog(user);
    setUserPlotsDialogOpen(true);
  };

  const handleUserLongPressStart = (userId: string, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const timer = setTimeout(() => {
      // Long press detected - toggle highlight
      if (selectedUserForHighlight === userId && highlightedPlots.length > 0) {
        // Clear if already highlighted
        clearHighlights();
        setDropdownOpen(false);
        toast.info("Highlights cleared");
      } else {
        // Highlight plots
        handleUserSelect(userId);
        setDropdownOpen(false);
      }
    }, 500); // 500ms for long press
    setLongPressTimer(timer);
  };

  const handleUserLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const scrollToPlot = (plotNumber: number) => {
    const plotElement = document.querySelector(`[data-plot-number="${plotNumber}"]`);
    if (plotElement) {
      const yOffset = -180;
      const y = plotElement.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      
      // Highlight the row briefly
      plotElement.classList.add('bg-primary/20');
      setTimeout(() => {
        plotElement.classList.remove('bg-primary/20');
      }, 2000);
    }
    setUserPlotsDialogOpen(false);
  };

  // Long press handler
  useEffect(() => {
    if (highlightedPlots.length === 0) return;

    let pressTimer: NodeJS.Timeout;

    const handleTouchStart = (e: TouchEvent) => {
      pressTimer = setTimeout(() => {
        clearHighlights();
        setDropdownOpen(false);
        toast.info("Highlights cleared");
      }, 500); // 500ms for long press
    };

    const handleTouchEnd = () => {
      clearTimeout(pressTimer);
    };

    const handleMouseDown = () => {
      pressTimer = setTimeout(() => {
        clearHighlights();
        setDropdownOpen(false);
        toast.info("Highlights cleared");
      }, 500);
    };

    const handleMouseUp = () => {
      clearTimeout(pressTimer);
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      clearTimeout(pressTimer);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [highlightedPlots]);

  // Scroll indicator handler
  useEffect(() => {
    if (highlightedPlots.length === 0) return;

    const checkScrollIndicators = () => {
      const viewportTop = window.scrollY;
      const viewportBottom = window.scrollY + window.innerHeight;

      let hasPlotAbove = false;
      let hasPlotBelow = false;

      highlightedPlots.forEach(plotNumber => {
        const plotElement = document.querySelector(`[data-plot-number="${plotNumber}"]`);
        if (plotElement) {
          const rect = plotElement.getBoundingClientRect();
          const elementTop = rect.top + window.scrollY;
          const elementBottom = elementTop + rect.height;

          if (elementBottom < viewportTop) {
            hasPlotAbove = true;
          }
          if (elementTop > viewportBottom) {
            hasPlotBelow = true;
          }
        }
      });

      setShowScrollUpIndicator(hasPlotAbove);
      setShowScrollDownIndicator(hasPlotBelow);
    };

    checkScrollIndicators();
    window.addEventListener('scroll', checkScrollIndicators);
    window.addEventListener('resize', checkScrollIndicators);

    return () => {
      window.removeEventListener('scroll', checkScrollIndicators);
      window.removeEventListener('resize', checkScrollIndicators);
    };
  }, [highlightedPlots]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToNextHighlightedPlotDown = () => {
    const currentScrollY = window.scrollY;
    const viewportBottom = currentScrollY + window.innerHeight;

    // Find the first highlighted plot below the current viewport
    let nextPlot: number | null = null;
    let minDistance = Infinity;

    highlightedPlots.forEach(plotNumber => {
      const plotElement = document.querySelector(`[data-plot-number="${plotNumber}"]`);
      if (plotElement) {
        const rect = plotElement.getBoundingClientRect();
        const elementTop = rect.top + currentScrollY;
        
        if (elementTop > viewportBottom) {
          const distance = elementTop - viewportBottom;
          if (distance < minDistance) {
            minDistance = distance;
            nextPlot = plotNumber;
          }
        }
      }
    });

    if (nextPlot !== null) {
      const plotElement = document.querySelector(`[data-plot-number="${nextPlot}"]`);
      if (plotElement) {
        const yOffset = -180;
        const y = plotElement.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }
  };

  const scrollToNextHighlightedPlotUp = () => {
    const currentScrollY = window.scrollY;
    const viewportTop = currentScrollY;

    // Find the last highlighted plot above the current viewport
    let previousPlot: number | null = null;
    let minDistance = Infinity;

    highlightedPlots.forEach(plotNumber => {
      const plotElement = document.querySelector(`[data-plot-number="${plotNumber}"]`);
      if (plotElement) {
        const rect = plotElement.getBoundingClientRect();
        const elementBottom = rect.bottom + currentScrollY;
        
        if (elementBottom < viewportTop) {
          const distance = viewportTop - elementBottom;
          if (distance < minDistance) {
            minDistance = distance;
            previousPlot = plotNumber;
          }
        }
      }
    });

    if (previousPlot !== null) {
      const plotElement = document.querySelector(`[data-plot-number="${previousPlot}"]`);
      if (plotElement) {
        const yOffset = -180;
        const y = plotElement.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }
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
      
      // Generate PDF for email
      const doc = new jsPDF();
      const blueColor: [number, number, number] = [37, 99, 235];

      // Add logo
      const img = new Image();
      img.src = logo;
      await new Promise<void>((resolve) => {
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          const width = 120;
          const height = 80;
          const radius = 10;
          canvas.width = width;
          canvas.height = height;

          if (ctx) {
            ctx.beginPath();
            ctx.moveTo(radius, 0);
            ctx.lineTo(width - radius, 0);
            ctx.quadraticCurveTo(width, 0, width, radius);
            ctx.lineTo(width, height - radius);
            ctx.quadraticCurveTo(width, height, width - radius, height);
            ctx.lineTo(radius, height);
            ctx.quadraticCurveTo(0, height, 0, height - radius);
            ctx.lineTo(0, radius);
            ctx.quadraticCurveTo(0, 0, radius, 0);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(img, 0, 0, width, height);

            const roundedLogo = canvas.toDataURL("image/png");
            try {
              doc.addImage(roundedLogo, "PNG", 90, 10, 30, 20);
            } catch (e) {
              console.error("Failed to add logo to PDF", e);
            }
          }
          resolve();
        };
      });

      // PDF content
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.text("Brickwork Manager", 105, 38, { align: "center" });

      doc.setFillColor(...blueColor);
      doc.rect(10, 45, 190, 12, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`INVOICE: ${invoiceNumber}`, 105, 53, { align: "center" });

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      let yPos = 68;
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 15, yPos);
      yPos += 10;

      if (site) {
        doc.setTextColor(...blueColor);
        doc.setFont("helvetica", "bold");
        doc.text("SITE:", 15, yPos);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        yPos += 7;
        doc.text(`${site.name}`, 15, yPos);
        yPos += 12;
      }

      doc.setTextColor(...blueColor);
      doc.setFont("helvetica", "bold");
      doc.text("ITEMS:", 15, yPos);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      yPos += 7;

      invoiceItems.forEach((item) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        const text = `Plot ${item.plot.plot_number} - ${LIFT_LABELS[item.liftType as keyof typeof LIFT_LABELS]}: ${item.percentage}% = £${item.bookedValue.toFixed(2)}`;
        doc.text(text, 15, yPos);
        yPos += 6;
      });

      yPos += 6;

      if (invoiceNotes) {
        doc.setTextColor(...blueColor);
        doc.setFont("helvetica", "bold");
        doc.text("NOTES:", 15, yPos);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        yPos += 7;
        const noteLines = doc.splitTextToSize(invoiceNotes, 180);
        doc.text(noteLines, 15, yPos);
        yPos += noteLines.length * 6 + 6;
      }

      doc.setFillColor(...blueColor);
      doc.rect(10, yPos, 190, 10, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text(`Total Value: £${totalInvoiceValue.toFixed(2)}`, 105, yPos + 7, { align: "center" });
      yPos += 18;

      if (gangMembers.length > 0) {
        doc.setTextColor(...blueColor);
        doc.setFont("helvetica", "bold");
        doc.text("GANG DIVISION:", 15, yPos);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        yPos += 7;

        gangMembers.forEach((member) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(`${member.name} (${member.type}): £${member.amount.toFixed(2)}`, 15, yPos);
          yPos += 6;
        });

        yPos += 4;
        doc.setFont("helvetica", "bold");
        doc.text(`Total Allocated: £${totalGangAllocated.toFixed(2)}`, 15, yPos);
      }

      // Convert PDF to base64
      const pdfBase64 = doc.output("dataurlstring").split(",")[1];

      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      // Create bookings and send email in parallel
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

      // Send email to admins
      const { error: emailError } = await supabase.functions.invoke("send-invoice-to-admin", {
        body: {
          invoiceNumber,
          pdfBase64,
          invoiceDetails: {
            bookedBy: profile?.full_name || user.email || "User",
            totalValue: totalInvoiceValue,
            createdAt: new Date().toISOString(),
          },
        },
      });

      if (emailError) {
        console.error("Email error:", emailError);
        toast.success("Invoice created! (Email notification may be delayed)");
      } else {
        toast.success("Invoice sent to admin successfully");
      }

      setInvoiceItems([]);
      setGangMembers(gangMembers.map(m => ({ ...m, amount: 0 })));
      setInvoiceNotes("");
      setNotesAmount(0);
      setInvoiceDialogOpen(false);
      fetchSiteData();
    } catch (error: any) {
      toast.error("Failed to send invoice");
      console.error("Error:", error);
    }
  };

  const handleExportPDF = async () => {
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
    
    const doc = new jsPDF();
    
    // Blue color for styling
    const blueColor: [number, number, number] = [37, 99, 235]; // #2563EB
    
    // Create rounded logo
    const img = new Image();
    img.src = logo;
    img.onload = () => {
      // Create canvas for rounded image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const width = 300;
      const height = 200;
      const radius = 20;
      
      canvas.width = width;
      canvas.height = height;
      
      if (ctx) {
        // Draw rounded rectangle
        ctx.beginPath();
        ctx.moveTo(radius, 0);
        ctx.lineTo(width - radius, 0);
        ctx.quadraticCurveTo(width, 0, width, radius);
        ctx.lineTo(width, height - radius);
        ctx.quadraticCurveTo(width, height, width - radius, height);
        ctx.lineTo(radius, height);
        ctx.quadraticCurveTo(0, height, 0, height - radius);
        ctx.lineTo(0, radius);
        ctx.quadraticCurveTo(0, 0, radius, 0);
        ctx.closePath();
        ctx.clip();
        
        // Draw image
        ctx.drawImage(img, 0, 0, width, height);
        
        // Add rounded logo to PDF
        const roundedLogo = canvas.toDataURL('image/png');
        try {
          doc.addImage(roundedLogo, 'PNG', 90, 10, 30, 20);
        } catch (e) {
          console.error('Failed to add logo to PDF', e);
        }
        
        generateRestOfPDF();
      }
    };
    
    const generateRestOfPDF = () => {
      // Black text for Brickwork Manager
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.text("Brickwork Manager", 105, 38, { align: "center" });
    
    // Invoice number with blue background
    doc.setFillColor(...blueColor);
    doc.rect(10, 45, 190, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`INVOICE: INV-${Date.now()}`, 105, 53, { align: "center" });
    
    // Reset to black text for content
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    let yPos = 68;
    
    // User name
    doc.text(`Booked by: ${userName}`, 15, yPos);
    yPos += 7;
    
    // Date
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 15, yPos);
    yPos += 10;
    
    // Site section with blue title
    if (site) {
      doc.setTextColor(...blueColor);
      doc.setFont("helvetica", "bold");
      doc.text("SITE:", 15, yPos);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      yPos += 7;
      doc.text(`${site.name}`, 15, yPos);
      yPos += 12;
    }
    
    // Items section with blue title
    doc.setTextColor(...blueColor);
    doc.setFont("helvetica", "bold");
    doc.text("ITEMS:", 15, yPos);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    yPos += 7;
    
    invoiceItems.forEach((item) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      const text = `Plot ${item.plot.plot_number} - ${LIFT_LABELS[item.liftType as keyof typeof LIFT_LABELS]}: ${item.percentage}% = £${item.bookedValue.toFixed(2)}`;
      doc.text(text, 15, yPos);
      yPos += 6;
    });
    
    yPos += 6;
    
    // Notes section if exists
    if (invoiceNotes) {
      doc.setTextColor(...blueColor);
      doc.setFont("helvetica", "bold");
      doc.text("NOTES:", 15, yPos);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      yPos += 7;
      const noteLines = doc.splitTextToSize(invoiceNotes, 180);
      doc.text(noteLines, 15, yPos);
      yPos += noteLines.length * 6 + 6;
    }
    
    // Total value with blue box
    doc.setFillColor(...blueColor);
    doc.rect(10, yPos, 190, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text(`Total Value: £${totalInvoiceValue.toFixed(2)}`, 105, yPos + 7, { align: "center" });
    yPos += 18;
    
    // Gang division section
    if (gangMembers.length > 0) {
      doc.setTextColor(...blueColor);
      doc.setFont("helvetica", "bold");
      doc.text("GANG DIVISION:", 15, yPos);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      yPos += 7;
      
      gangMembers.forEach((member) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(`${member.name} (${member.type}): £${member.amount.toFixed(2)}`, 15, yPos);
        yPos += 6;
      });
      
      yPos += 4;
      doc.setFont("helvetica", "bold");
      doc.text(`Total Allocated: £${totalGangAllocated.toFixed(2)}`, 15, yPos);
    }
    
    doc.save(`invoice-${Date.now()}.pdf`);
    toast.success("PDF exported");
    };
  };

  const handleInviteUser = async () => {
    if (!site || !inviteEmail.trim() || !user) return;

    try {
      // Create an invitation record
      const { error: inviteError } = await supabase
        .from("invitations")
        .insert({
          email: inviteEmail.trim().toLowerCase(),
          site_id: site.id,
          invited_by: user.id
        });

      if (inviteError) {
        if (inviteError.code === '23505') {
          toast.error("This user has already been invited to this site");
        } else {
          throw inviteError;
        }
        return;
      }

      // Get user's full name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      // Send invitation email
      const { data, error: emailError } = await supabase.functions.invoke('send-invitation-email', {
        body: {
          email: inviteEmail.trim().toLowerCase(),
          siteName: site.name,
          invitedBy: profile?.full_name || user.email || "An administrator",
          customDomain: window.location.origin
        }
      });

      if (emailError) {
        console.error("Email error:", emailError);
        toast.success("Invitation created! (Email notification may be delayed)");
      } else {
        toast.success("Invitation sent! User will receive an email and automatically get access when they sign up.");
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

      toast.success("Bricklayer removed from site");
      fetchSiteData();
    } catch (error: any) {
      toast.error("Failed to remove bricklayer");
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
        hideTitle
        leftContent={
          <div className="hidden md:flex items-center gap-2">
            {developerLogo && (
              <img 
                src={developerLogo} 
                alt={developer?.name || "Developer"}
                className="h-10 w-auto object-contain rounded-lg"
              />
            )}
            <span className="text-sm text-black dark:text-white font-medium">
              {site.name}
            </span>
          </div>
        }
        actions={
          <>
            {isAdmin && (users.length > 0 || pendingInvitations.length > 0) && (
              <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1" title="View Invited Bricklayers">
                    <Users className="h-4 w-4" />
                    <span className="hidden lg:inline">Bricklayers ({users.length + pendingInvitations.length})</span>
                    <span className="hidden sm:inline lg:hidden">({users.length + pendingInvitations.length})</span>
                    <ChevronDown className="h-4 w-4 hidden lg:inline" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  className="w-80 max-h-96 overflow-y-auto bg-background z-50"
                >
                  {users.map((u) => (
                    <DropdownMenuItem 
                      key={u.user_id} 
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted"
                      onClick={() => handleUserClick(u)}
                      onMouseDown={(e) => handleUserLongPressStart(u.user_id, e)}
                      onMouseUp={handleUserLongPressEnd}
                      onMouseLeave={handleUserLongPressEnd}
                      onTouchStart={(e) => handleUserLongPressStart(u.user_id, e)}
                      onTouchEnd={handleUserLongPressEnd}
                      onSelect={(e) => e.preventDefault()}
                    >
                      <div className="flex-1 flex items-center gap-2">
                        <p className="font-medium">{u.profiles.full_name}</p>
                        <Badge variant="secondary" className="text-xs">
                          {plots.filter(p => p.assigned_to === u.user_id).length} plots
                        </Badge>
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
                  
                  {pendingInvitations.length > 0 && (
                    <>
                      {users.length > 0 && (
                        <div className="px-3 py-2 text-xs text-muted-foreground font-semibold border-t">
                          Pending Invitations
                        </div>
                      )}
                      {pendingInvitations.map((inv) => (
                        <DropdownMenuItem 
                          key={inv.id} 
                          className="flex items-center justify-between p-3"
                          onSelect={(e) => e.preventDefault()}
                        >
                          <div className="flex-1 flex items-center gap-2">
                            <p className="text-muted-foreground">{maskEmail(inv.email)}</p>
                            <Badge variant="outline" className="text-xs">
                              Pending
                            </Badge>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {isAdmin && (
              <>
                <Button onClick={() => openHouseTypeDialog()} size="sm" title="Add House Type">
                  <Plus className="h-4 w-4" />
                  <span className="hidden lg:inline ml-2">Add House Type</span>
                </Button>
                <Button onClick={() => setInviteUserDialogOpen(true)} variant="outline" size="sm" title="Invite Bricklayers" className="gap-1">
                  <Plus className="h-3 w-3" />
                  <Users className="h-4 w-4" />
                  <span className="hidden lg:inline ml-1">Invite Bricklayers</span>
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
                <span className="hidden lg:inline ml-2">View Invoice</span>
              </Button>
            )}
          </>
        }
      />
      
      <main className="container py-8">
        {/* Sticky Scroll Indicators */}
        {showScrollUpIndicator && (
          <div 
            className="fixed left-4 top-1/3 z-50 animate-pulse cursor-pointer"
            onClick={scrollToNextHighlightedPlotUp}
          >
            <ArrowUp className="h-8 w-8 text-primary fill-primary" strokeWidth={0} />
          </div>
        )}
        {showScrollDownIndicator && (
          <div 
            className="fixed left-4 top-2/3 z-50 animate-pulse cursor-pointer"
            onClick={scrollToNextHighlightedPlotDown}
          >
            <ChevronDown className="h-8 w-8 text-primary fill-primary" strokeWidth={0} />
          </div>
        )}
        
        {/* Mobile Layout - Below Header */}
        <div className="md:hidden mb-6 flex items-center gap-2">
          {developerLogo && (
            <img 
              src={developerLogo} 
              alt={developer?.name || "Developer"}
              className="h-10 w-auto object-contain rounded-lg"
            />
          )}
          <span className="text-sm text-black dark:text-white font-medium">
            {site.name}
          </span>
        </div>

        {site.description && (
          <div className="mb-8">
            <p className="text-muted-foreground">{site.description}</p>
          </div>
        )}

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
        <div className="mb-6">
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
        </div>

        <div className="relative">
          <h3 className="text-2xl font-bold tracking-tight mb-4">Plot Grid</h3>
          {plots.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {isAdmin ? "No plots created yet" : "No plots assigned to you"}
            </p>
          ) : (
            <div ref={pinchZoomContainerRef} className="overflow-hidden border rounded-lg touch-none">
              <div ref={mainScrollRef} className="overflow-x-auto" style={zoomStyle}>
                <table className="w-full border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-2 text-left font-medium w-20 sticky left-0 bg-muted/50 z-20 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Plot</th>
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
                      className="p-2 font-medium cursor-pointer hover:bg-primary/10 sticky left-0 bg-background dark:bg-background z-20 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
                      onClick={() => handlePlotNumberClick(plot)}
                    >
                      {plot.plot_number}
                    </td>
                    <td 
                      className={`p-2 ${(isAdmin || plot.house_types) ? 'cursor-pointer hover:bg-primary/10' : ''}`}
                      onClick={() => {
                        if (isAdmin) {
                          handlePlotClick(plot);
                        } else if (plot.house_types) {
                          openDrawingsDialog(plot.house_types);
                        }
                      }}
                    >
                      {plot.house_types?.name || "-"}
                    </td>
                    {Object.keys(LIFT_LABELS).map(liftType => {
                      const totalBooked = getTotalBooked(plot, liftType);
                      const isPending = isPendingInInvoice(plot, liftType);
                      
                      return (
                        <td 
                          key={liftType}
                          data-lift-type={liftType}
                          className={`p-4 text-center transition-all ${getCellColor(totalBooked, isPending)}`}
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
        </div>

        {/* House Type Dialog */}
        <Dialog open={houseTypeDialogOpen} onOpenChange={setHouseTypeDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
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
                  autoFocus={false}
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
                      autoFocus={false}
                    />
                  </div>
                ))}
              </div>
              
              {/* File Upload Section */}
              {isAdmin && (
                <div className="space-y-2">
                  <Label>Drawings (PDF/PNG, up to 50MB each)</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Multi-page PDFs will be automatically split into individual pages.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="drawing-upload-hidden" className="cursor-pointer">
                      <div className="flex items-center gap-2 p-3 border-2 border-dashed rounded-lg hover:border-primary transition-colors bg-muted/50">
                        <Plus className="h-5 w-5" />
                        <div className="flex-1">
                          {uploadedDrawings.length > 0 ? (
                            <p className="text-sm font-medium text-success">
                              ✓ {uploadedDrawings.length} file{uploadedDrawings.length > 1 ? 's' : ''} selected
                            </p>
                          ) : (
                            <p className="text-sm font-medium">Choose files or drag here</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            PDF, PNG, JPG - up to 50MB each
                          </p>
                        </div>
                      </div>
                    </Label>
                    <Input
                      id="drawing-upload-hidden"
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button onClick={handleSaveHouseType} className="flex-1">
                  Save House Type
                </Button>
                {editingHouseType && (
                  <>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setHouseTypeDialogOpen(false);
                        openDrawingsDialog(editingHouseType);
                      }}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      View Drawings
                    </Button>
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
                  </>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Plot Assignment Dialog */}
        <Dialog open={plotDialogOpen} onOpenChange={setPlotDialogOpen}>
          <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
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

        {/* Bricklayer Assignment Dialog */}
        <Dialog open={userAssignDialogOpen} onOpenChange={setUserAssignDialogOpen}>
          <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Assign Bricklayer to Plot {selectedPlot?.plot_number}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Bricklayer</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bricklayer" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.user_id} value={u.user_id}>
                        {u.profiles.full_name} ({plots.filter(p => p.assigned_to === u.user_id).length} plots)
                      </SelectItem>
                    ))}
                    {pendingInvitations.length > 0 && (
                      <>
                        <SelectItem key="pending-header" value="pending-header" disabled>
                          <span className="text-xs text-muted-foreground font-semibold">--- Pending Invitations ---</span>
                        </SelectItem>
                        {pendingInvitations.map(inv => (
                          <SelectItem key={inv.id} value={inv.id} disabled>
                            <span className="text-muted-foreground">{maskEmail(inv.email)} (Pending)</span>
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAssignUserToPlot} className="w-full">
                Assign Bricklayer
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Invite User Dialog */}
        <Dialog open={inviteUserDialogOpen} onOpenChange={setInviteUserDialogOpen}>
          <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Invite Bricklayer to Site</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  autoFocus={false}
                />
              </div>
              <Button onClick={handleInviteUser} className="w-full" disabled={!inviteEmail.trim()}>
                Send Invitation
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* User Plots Dialog */}
        <Dialog open={userPlotsDialogOpen} onOpenChange={setUserPlotsDialogOpen}>
          <DialogContent className="max-w-md max-h-[80vh]" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>
                {selectedUserForDialog?.profiles.full_name}'s Assigned Plots
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2 overflow-y-auto max-h-[60vh]">
              {selectedUserForDialog && plots.filter(p => p.assigned_to === selectedUserForDialog.user_id).length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No plots assigned</p>
              ) : (
                plots
                  .filter(p => p.assigned_to === selectedUserForDialog?.user_id)
                  .sort((a, b) => a.plot_number - b.plot_number)
                  .map(plot => (
                    <Button
                      key={plot.id}
                      variant="outline"
                      className="w-full justify-between"
                      onClick={() => scrollToPlot(plot.plot_number)}
                    >
                      <span className="font-medium">Plot {plot.plot_number}</span>
                      <span className="text-sm text-muted-foreground">
                        {plot.house_types?.name || "No house type"}
                      </span>
                    </Button>
                  ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Drawings Dialog */}
        <Dialog open={drawingsDialogOpen} onOpenChange={setDrawingsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh]" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader>
              <div className="flex items-center gap-4">
                <DialogTitle className="flex-shrink-0">
                  {selectedHouseTypeForDrawings?.name} - Drawings
                </DialogTitle>
                {isAdmin && (existingDrawings.length > 0 || uploadedDrawings.length > 0) && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteAllDrawings}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete All
                  </Button>
                )}
              </div>
            </DialogHeader>
            <div className="space-y-4 overflow-y-auto max-h-[70vh]">
              {existingDrawings.length === 0 && uploadedDrawings.length === 0 && Object.keys(uploadProgress).length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No drawings available</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Upload Progress Indicators */}
                  {Object.entries(uploadProgress).map(([key, progress]) => {
                    const fileName = key.split('-')[0];
                    return (
                      <Card key={key} className="overflow-hidden border-2 border-primary">
                        <CardContent className="p-4 space-y-2">
                          <div className="w-full h-48 flex flex-col items-center justify-center bg-muted rounded">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                            <p className="text-sm font-medium">Uploading...</p>
                            <div className="w-full max-w-[200px] h-2 bg-muted-foreground/20 rounded-full mt-2 overflow-hidden">
                              <div 
                                className="h-full bg-primary transition-all duration-300"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{progress}%</p>
                          </div>
                          <p className="text-sm font-medium truncate">{fileName}</p>
                          <p className="text-xs text-muted-foreground">Processing upload...</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                  
                  {/* Newly Uploaded Drawings (Not Yet Saved) */}
                  {uploadedDrawings.map((file, index) => {
                    const progressKey = `${file.name}-${index}`;
                    if (uploadProgress[progressKey]) return null; // Don't show if uploading
                    
                    const fileUrl = URL.createObjectURL(file);
                    
                    return (
                      <Card 
                        key={`new-${index}`} 
                        className="overflow-hidden border-2 border-primary/50 cursor-pointer hover:border-primary transition-colors"
                        onClick={() => handleViewDrawing(fileUrl, file.type, file.name)}
                      >
                        <CardContent className="p-4 space-y-2">
                          {file.type.startsWith('image/') ? (
                            <img 
                              src={fileUrl} 
                              alt={file.name}
                              className="w-full h-48 object-contain bg-muted rounded"
                            />
                          ) : (
                            <div className="w-full h-48 flex items-center justify-center bg-muted rounded">
                              <FileText className="h-16 w-16 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium truncate flex-1">{file.name}</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveUploadedDrawing(index);
                              }}
                              title="Remove"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-xs text-primary font-medium">New - Not yet saved • Click to view</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                  
                  {/* Existing Saved Drawings */}
                  {existingDrawings.map((drawing) => (
                    <Card 
                      key={drawing.id} 
                      className="overflow-hidden cursor-pointer hover:border-primary transition-colors"
                      onClick={() => handleViewDrawing(drawing.file_url, drawing.file_type, drawing.file_name)}
                    >
                      <CardContent className="p-4 space-y-2">
                        {drawing.file_type.startsWith('image/') ? (
                          <img 
                            src={drawing.file_url} 
                            alt={drawing.file_name}
                            className="w-full h-48 object-contain bg-muted rounded"
                          />
                        ) : drawing.file_type === 'application/pdf' ? (
                          <div className="w-full h-48 flex items-center justify-center bg-muted rounded">
                            <FileText className="h-16 w-16 text-muted-foreground" />
                          </div>
                        ) : (
                          <div className="w-full h-48 flex items-center justify-center bg-muted rounded">
                            <FileText className="h-16 w-16 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium truncate flex-1">{drawing.file_name}</p>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteExistingDrawing(drawing.id, drawing.file_url);
                              }}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                        <Button
                          variant="default"
                          size="sm"
                          className="w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportDrawing(drawing.file_url, drawing.file_name);
                          }}
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Export
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Drawing Viewer Dialog */}
        <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] p-0">
            <DialogHeader className="p-6 pb-4">
              <DialogTitle>{viewerContent?.name}</DialogTitle>
              <DialogDescription>
                View or download the drawing file
              </DialogDescription>
            </DialogHeader>
            <div className="p-6 pt-0 overflow-auto">
              {viewerContent && (
                <>
                  {viewerContent.type.startsWith('image/') ? (
                    <img 
                      src={viewerContent.url} 
                      alt={viewerContent.name}
                      className="w-full h-auto max-h-[60vh] object-contain bg-muted rounded"
                    />
                  ) : viewerContent.type === 'application/pdf' ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-6">
                      <FileText className="h-32 w-32 text-primary" />
                      <div className="text-center space-y-2">
                        <p className="text-lg font-semibold">PDF Document</p>
                        <p className="text-sm text-muted-foreground">Click below to open in a new tab</p>
                      </div>
                      <a 
                        href={viewerContent.url} 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        <FileText className="h-5 w-5" />
                        Open PDF
                      </a>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <FileText className="h-24 w-24 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-6">Preview not available for this file type</p>
                      <a 
                        href={viewerContent.url} 
                        download={viewerContent.name}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        Download File
                      </a>
                    </div>
                  )}
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Booking Dialog */}
        <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
          <DialogContent className="max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
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
                  <div className="flex justify-between items-center">
                    {editingBookingPercentage ? (
                      <Input
                        type="number"
                        value={tempBookingPercentage}
                        onChange={(e) => setTempBookingPercentage(e.target.value)}
                        onBlur={() => {
                          const val = parseInt(tempBookingPercentage);
                          const maxVal = 100 - getTotalBooked(selectedBookingPlot, selectedBookingLiftType);
                          if (!isNaN(val) && val >= 1 && val <= maxVal) {
                            setBookingPercentage(val);
                          }
                          setEditingBookingPercentage(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = parseInt(tempBookingPercentage);
                            const maxVal = 100 - getTotalBooked(selectedBookingPlot, selectedBookingLiftType);
                            if (!isNaN(val) && val >= 1 && val <= maxVal) {
                              setBookingPercentage(val);
                            }
                            setEditingBookingPercentage(false);
                          }
                        }}
                        className="w-32"
                        autoFocus={false}
                        step="1"
                        min="1"
                      />
                    ) : (
                      <Label 
                        className="cursor-pointer hover:text-primary transition-colors"
                        onClick={() => {
                          setTempBookingPercentage(bookingPercentage.toString());
                          setEditingBookingPercentage(true);
                        }}
                      >
                        Percentage: {bookingPercentage}%
                      </Label>
                    )}
                  </div>
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
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
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
                      <div className="flex justify-between items-center">
                        {editingNotesAmount ? (
                          <Input
                            type="number"
                            value={tempNotesAmount}
                            onChange={(e) => setTempNotesAmount(e.target.value)}
                            onBlur={() => {
                              const val = parseFloat(tempNotesAmount);
                              if (!isNaN(val) && val >= 0 && val <= 5000) {
                                setNotesAmount(val);
                              }
                              setEditingNotesAmount(false);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const val = parseFloat(tempNotesAmount);
                                if (!isNaN(val) && val >= 0 && val <= 5000) {
                                  setNotesAmount(val);
                                }
                                setEditingNotesAmount(false);
                              }
                            }}
                            className="w-40"
                            autoFocus={false}
                            step="10"
                            min="0"
                            max="5000"
                          />
                        ) : (
                          <Label 
                            className="cursor-pointer hover:text-primary transition-colors"
                            onClick={() => {
                              setTempNotesAmount(notesAmount.toFixed(2));
                              setEditingNotesAmount(true);
                            }}
                          >
                            Add Additional Amount: £{notesAmount.toFixed(2)}
                          </Label>
                        )}
                      </div>
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
                <GangDivisionCard
                  gangMembers={gangMembers}
                  totalValue={totalInvoiceValue}
                  totalAllocated={totalGangAllocated}
                  remainingToAllocate={remainingToAllocate}
                  onAddMemberClick={() => setGangDialogOpen(true)}
                  onRemoveMember={handleRemoveGangMember}
                  onDeletePermanently={handleDeletePermanently}
                  onUpdateMemberAmount={handleUpdateMemberAmount}
                  onStartEditing={handleStartEditing}
                  onStopEditing={handleStopEditing}
                  savedMembers={savedMembers}
                  onAddExistingMember={handleAddExistingMember}
                  totalValueLabel="Invoice Total"
                />
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
          <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Add New Gang Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder="Enter name"
                  autoFocus={false}
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
              <Button onClick={handleAddGangMember} className="w-full">
                Add Member
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Plot Summary Dialog */}
        <Dialog open={plotSummaryDialogOpen} onOpenChange={setPlotSummaryDialogOpen}>
          <DialogContent className="max-w-lg max-h-[80vh]" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Plot {selectedPlotForSummary?.plot_number} Summary</DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto max-h-[calc(80vh-8rem)] pr-2">
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
                      <p className="text-sm text-muted-foreground mb-3">Assignment History</p>
                      {plotAssignmentHistory.length > 0 ? (
                        <div className="space-y-2">
                          {plotAssignmentHistory.map((history) => (
                            <div 
                              key={history.id} 
                              className={`p-3 rounded-lg ${history.removed_at ? 'bg-muted/50' : 'bg-muted'}`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="font-semibold">
                                    {history.profiles?.full_name || 'Unknown'}
                                  </p>
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    <p>Assigned: {new Date(history.assigned_at).toLocaleDateString()}</p>
                                    {history.removed_at && (
                                      <p>Removed: {new Date(history.removed_at).toLocaleDateString()}</p>
                                    )}
                                  </div>
                                </div>
                                {!history.removed_at && (
                                  <Badge variant="default" className="ml-2">Current</Badge>
                                )}
                                {history.removed_at && (
                                  <Badge variant="secondary" className="ml-2">Past</Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No bricklayer has been assigned to this plot yet</p>
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
            </div>
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
