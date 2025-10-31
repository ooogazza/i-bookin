import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, Building2, FileText, Trash2, UserCog } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { developerLogos } from "@/lib/developerLogos";
import { NonPlotInvoiceDialog } from "@/components/NonPlotInvoiceDialog";
import { ManageBricklayersDialog } from "@/components/ManageBricklayersDialog";
import { DashboardSearch } from "@/components/DashboardSearch";

interface Developer {
  id: string;
  name: string;
  logo_url: string | null;
  site_count?: number;
}

interface Site {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  developer_id: string | null;
  created_at: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [loading, setLoading] = useState(true);
  const [unviewedInvoicesCount, setUnviewedInvoicesCount] = useState(0);
  const [unconfirmedInvoicesCount, setUnconfirmedInvoicesCount] = useState(0);
  
  const [createSiteDialogOpen, setCreateSiteDialogOpen] = useState(false);
  const [siteName, setSiteName] = useState("");
  const [siteLocation, setSiteLocation] = useState("");
  const [selectedDeveloper, setSelectedDeveloper] = useState("");
  const [numberOfPlots, setNumberOfPlots] = useState(1);
  const [creating, setCreating] = useState(false);
  const [allDevelopers, setAllDevelopers] = useState<Developer[]>([]);
  const [nonPlotInvoiceDialogOpen, setNonPlotInvoiceDialogOpen] = useState(false);
  const [manageBricklayersDialogOpen, setManageBricklayersDialogOpen] = useState(false);
  const [filteredBricklayerId, setFilteredBricklayerId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (user) {
      fetchDevelopers();
      fetchAllDevelopers();
      if (isAdmin) {
        fetchUnviewedInvoicesCount();
      }
    }
  }, [user, isAdmin]);

  // Handle bricklayer filtering from URL
  useEffect(() => {
    const bricklayerIdFromUrl = searchParams.get('bricklayerId');
    if (bricklayerIdFromUrl && isAdmin) {
      setFilteredBricklayerId(bricklayerIdFromUrl);
      // Open the manage bricklayers dialog after data loads
      setTimeout(() => {
        setManageBricklayersDialogOpen(true);
      }, 500);
      // Clear the param
      searchParams.delete('bricklayerId');
      setSearchParams(searchParams);
    }
  }, [searchParams, isAdmin]);

  const fetchDevelopers = async () => {
    if (!user) return;

    try {
      // Fetch all developers
      const { data: allDevs, error: devsError } = await supabase
        .from("developers")
        .select("*")
        .order("name");

      if (devsError) throw devsError;

      // Fetch site counts per developer
      const { data: sites, error: sitesError } = await supabase
        .from("sites")
        .select("developer_id");

      if (sitesError) throw sitesError;

      // Count sites per developer
      const siteCounts = sites?.reduce((acc: Record<string, number>, site) => {
        if (site.developer_id) {
          acc[site.developer_id] = (acc[site.developer_id] || 0) + 1;
        }
        return acc;
      }, {});

      // Only show developers that have at least one site
      const developersWithCounts = allDevs?.map(dev => ({
        ...dev,
        site_count: siteCounts?.[dev.id] || 0
      })).filter(dev => dev.site_count > 0) || [];

      setDevelopers(developersWithCounts);
    } catch (error: any) {
      toast.error("Failed to load developers");
      console.error("Error fetching developers:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllDevelopers = async () => {
    try {
      const { data, error } = await supabase
        .from("developers")
        .select("*")
        .order("name");

      if (error) throw error;
      setAllDevelopers(data || []);
    } catch (error: any) {
      console.error("Error fetching all developers:", error);
    }
  };

  const fetchUnviewedInvoicesCount = async () => {
    if (!user || !isAdmin) return;

    try {
      // Fetch plot-based bookings
      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("invoice_number, confirmed_by_admin")
        .eq("status", "confirmed");

      if (bookingsError) throw bookingsError;

      // Fetch non-plot invoices
      const { data: nonPlotInvoices, error: nonPlotError } = await supabase
        .from("non_plot_invoices")
        .select("invoice_number, status")
        .in("status", ["sent", "confirmed"]);

      if (nonPlotError) throw nonPlotError;

      // Combine and get unique invoice numbers with their confirmation status
      const allInvoices = new Map();
      
      bookings?.forEach(b => {
        if (!allInvoices.has(b.invoice_number)) {
          allInvoices.set(b.invoice_number, b.confirmed_by_admin);
        }
      });

      nonPlotInvoices?.forEach(inv => {
        if (!allInvoices.has(inv.invoice_number)) {
          allInvoices.set(inv.invoice_number, inv.status === "confirmed");
        }
      });

      const uniqueInvoices = Array.from(allInvoices.keys());

      // Get viewed invoices for this admin
      const { data: viewedData, error: viewedError } = await supabase
        .from("invoice_views")
        .select("invoice_number")
        .eq("viewed_by", user.id);

      if (viewedError) throw viewedError;

      const viewedInvoices = new Set(viewedData?.map(v => v.invoice_number) || []);
      
      // Count unviewed and unconfirmed
      let unviewed = 0;
      let unconfirmed = 0;

      uniqueInvoices.forEach(invNum => {
        const isConfirmed = allInvoices.get(invNum);
        const isViewed = viewedInvoices.has(invNum);
        
        if (!isViewed && !isConfirmed) {
          unviewed++;
        }
        if (!isConfirmed) {
          unconfirmed++;
        }
      });

      setUnviewedInvoicesCount(unviewed);
      setUnconfirmedInvoicesCount(unconfirmed);
    } catch (error: any) {
      console.error("Error fetching invoices count:", error);
    }
  };

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !siteName.trim() || !selectedDeveloper) return;

    setCreating(true);

    try {
      // Create the site
      const { data: site, error: siteError } = await supabase
        .from("sites")
        .insert({
          name: siteName.trim(),
          location: siteLocation.trim() || null,
          developer_id: selectedDeveloper,
          created_by: user.id,
          number_of_plots: numberOfPlots,
          number_of_house_types: 0
        })
        .select()
        .single();

      if (siteError) throw siteError;

      // Create plots for the site
      if (numberOfPlots > 0) {
        const plots = Array.from({ length: numberOfPlots }, (_, i) => ({
          site_id: site.id,
          plot_number: i + 1
        }));

        const { error: plotsError } = await supabase
          .from("plots")
          .insert(plots);

        if (plotsError) throw plotsError;
      }

      toast.success("Site created successfully");
      setCreateSiteDialogOpen(false);
      setSiteName("");
      setSiteLocation("");
      setSelectedDeveloper("");
      setNumberOfPlots(1);
      fetchDevelopers();
    } catch (error: any) {
      toast.error("Failed to create site");
      console.error("Error:", error);
    } finally {
      setCreating(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-secondary/20 to-background">
      <Header 
        showLogout 
        actions={
          isAdmin ? (
            <>
              <DashboardSearch />
              <Button onClick={() => setCreateSiteDialogOpen(true)} className="shadow-md">
                <Plus className="mr-2 h-4 w-4" />
                New Site
              </Button>
            </>
          ) : undefined
        }
      />
      
      <main className="container py-12 space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-8 md:p-12 shadow-xl">
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.5))]" />
          <div className="relative">
            <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-3">
              Welcome back, {user?.email?.split('@')[0] || 'User'}
            </h1>
            <p className="text-primary-foreground/90 text-lg mb-6">
              {isAdmin ? "Manage your entire construction workflow" : "View your assigned sites and invoices"}
            </p>
            {isAdmin && unconfirmedInvoicesCount > 0 && (
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-primary-foreground px-4 py-2 rounded-lg">
                <FileText className="h-5 w-5" />
                <span className="font-semibold">{unconfirmedInvoicesCount} invoices awaiting confirmation</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        {isAdmin && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Card 
                className="group cursor-pointer border-2 hover:border-primary transition-all duration-300 hover:shadow-lg relative overflow-hidden" 
                onClick={() => navigate("/booking-in")}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    {(unviewedInvoicesCount > 0 || unconfirmedInvoicesCount > 0) && (
                      <div className="flex items-center gap-2">
                        {unviewedInvoicesCount > 0 && (
                          <div className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold shadow-md">
                            {unviewedInvoicesCount} new
                          </div>
                        )}
                        {unconfirmedInvoicesCount > 0 && (
                          <div className="flex items-center gap-1 bg-success text-success-foreground px-3 py-1 rounded-full text-sm font-semibold shadow-md">
                            {unconfirmedInvoicesCount} pending
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-xl mb-2">Booking In</CardTitle>
                  <CardDescription className="text-base">
                    Review and confirm submitted invoices
                  </CardDescription>
                </CardHeader>
              </Card>
              
              <Card 
                className="group cursor-pointer border-2 hover:border-primary transition-all duration-300 hover:shadow-lg relative overflow-hidden" 
                onClick={() => setManageBricklayersDialogOpen(true)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="relative">
                  <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors mb-2 w-fit">
                    <UserCog className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl mb-2">Manage Bricklayers</CardTitle>
                  <CardDescription className="text-base">
                    Invite and assign bricklayers to sites
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        )}

        {!isAdmin && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
            <Card 
              className="group cursor-pointer border-2 hover:border-primary transition-all duration-300 hover:shadow-lg relative overflow-hidden max-w-md" 
              onClick={() => navigate("/booking-in")}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="relative">
                <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors mb-2 w-fit">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl mb-2">Invoices</CardTitle>
                <CardDescription className="text-base">
                  View and manage your submitted invoices
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        )}


        {/* Developers Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">Developers & Sites</h2>
              <p className="text-muted-foreground mt-1">Browse active development projects</p>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/30 border-t-primary mb-4" />
              <p className="text-muted-foreground">Loading developers...</p>
            </div>
          ) : developers.length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="p-4 rounded-full bg-muted mb-4">
                  <Building2 className="h-12 w-12 text-muted-foreground" />
                </div>
                <p className="text-xl font-semibold mb-2">
                  {isAdmin ? "No developers yet" : "No sites assigned"}
                </p>
                <p className="text-muted-foreground text-center max-w-md">
                  {isAdmin 
                    ? "No developers have been added to the system"
                    : "You haven't been assigned to any sites yet. Contact an administrator to get access."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {developers.map((developer) => {
                const logo = developerLogos[developer.name];
                return (
                  <Card
                    key={developer.id}
                    className="group cursor-pointer border-2 hover:border-primary transition-all duration-300 hover:shadow-xl relative overflow-hidden"
                    onClick={() => navigate(`/developer/${developer.id}`)}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardHeader className="relative">
                      <div className="flex items-center justify-center h-[140px] w-full p-6 mb-4 rounded-xl bg-gradient-to-br from-secondary/50 to-secondary/30 group-hover:from-secondary/70 group-hover:to-secondary/50 transition-colors">
                        {logo && (
                          <img 
                            src={logo} 
                            alt={developer.name}
                            className="h-full w-full object-contain"
                          />
                        )}
                      </div>
                      <div className="text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-semibold">
                          <Building2 className="h-4 w-4" />
                          {developer.site_count || 0} {developer.site_count === 1 ? 'Site' : 'Sites'}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Create Site Dialog */}
        <Dialog open={createSiteDialogOpen} onOpenChange={setCreateSiteDialogOpen}>
          <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Create New Site</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateSite} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="developer">Developer *</Label>
                <Select value={selectedDeveloper} onValueChange={setSelectedDeveloper} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a developer" />
                  </SelectTrigger>
                  <SelectContent>
                    {allDevelopers.map((dev) => (
                      <SelectItem key={dev.id} value={dev.id}>
                        {dev.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="siteName">Site Name *</Label>
                <Input
                  id="siteName"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="e.g., Oak Ridge Development"
                  required
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="siteLocation">Location *</Label>
                <Input
                  id="siteLocation"
                  value={siteLocation}
                  onChange={(e) => setSiteLocation(e.target.value)}
                  placeholder="e.g., Manchester"
                  required
                  maxLength={200}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numberOfPlots">Number of Plots *</Label>
                <Input
                  id="numberOfPlots"
                  type="number"
                  min="1"
                  max="1000"
                  value={numberOfPlots || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setNumberOfPlots(0);
                    } else {
                      const num = parseInt(val);
                      if (!isNaN(num)) setNumberOfPlots(num);
                    }
                  }}
                  onBlur={() => {
                    if (numberOfPlots < 1) {
                      setNumberOfPlots(1);
                    }
                  }}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  This will create {numberOfPlots} plot{numberOfPlots !== 1 ? 's' : ''} automatically
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={creating}>
                {creating ? "Creating..." : "Create Site"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Non-Plot Invoice Dialog for invited users */}
        <NonPlotInvoiceDialog
          open={nonPlotInvoiceDialogOpen}
          onOpenChange={setNonPlotInvoiceDialogOpen}
        />

        {/* Manage Bricklayers Dialog */}
        <ManageBricklayersDialog
          open={manageBricklayersDialogOpen}
          onOpenChange={(open) => {
            setManageBricklayersDialogOpen(open);
            if (!open) {
              setFilteredBricklayerId(undefined);
            }
          }}
          filteredUserId={filteredBricklayerId}
        />

      </main>
    </div>
  );
};

export default Dashboard;
