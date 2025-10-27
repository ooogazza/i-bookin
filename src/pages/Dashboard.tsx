import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Plus, Building2, FileText, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { developerLogos } from "@/lib/developerLogos";

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
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [loading, setLoading] = useState(true);
  const [unviewedInvoicesCount, setUnviewedInvoicesCount] = useState(0);
  
  const [createSiteDialogOpen, setCreateSiteDialogOpen] = useState(false);
  const [siteName, setSiteName] = useState("");
  const [siteLocation, setSiteLocation] = useState("");
  const [selectedDeveloper, setSelectedDeveloper] = useState("");
  const [numberOfPlots, setNumberOfPlots] = useState(1);
  const [creating, setCreating] = useState(false);
  const [allDevelopers, setAllDevelopers] = useState<Developer[]>([]);

  useEffect(() => {
    if (user) {
      fetchDevelopers();
      fetchAllDevelopers();
      if (isAdmin) {
        fetchUnviewedInvoicesCount();
      }
    }
  }, [user, isAdmin]);

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
      // Get all confirmed bookings
      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("invoice_number")
        .eq("status", "confirmed");

      if (bookingsError) throw bookingsError;

      // Get unique invoice numbers
      const uniqueInvoices = [...new Set(bookings?.map(b => b.invoice_number) || [])];

      // Get viewed invoices for this admin
      const { data: viewedData, error: viewedError } = await supabase
        .from("invoice_views")
        .select("invoice_number")
        .eq("viewed_by", user.id);

      if (viewedError) throw viewedError;

      const viewedInvoices = new Set(viewedData?.map(v => v.invoice_number) || []);
      const unviewedCount = uniqueInvoices.filter(inv => !viewedInvoices.has(inv)).length;

      setUnviewedInvoicesCount(unviewedCount);
    } catch (error: any) {
      console.error("Error fetching unviewed invoices count:", error);
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
    <div className="min-h-screen bg-secondary/30">
      <Header 
        showLogout 
        actions={
          isAdmin ? (
            <Button onClick={() => setCreateSiteDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Site
            </Button>
          ) : undefined
        }
      />
      
      <main className="container py-8">
        <div className="mb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">
              {isAdmin ? "Manage all developers and sites" : "View your assigned developers and sites"}
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors relative" onClick={() => navigate("/booking-in")}>
            {isAdmin && unviewedInvoicesCount > 0 && (
              <div className="absolute top-4 right-4 h-3 w-3 rounded-full bg-primary animate-pulse" />
            )}
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                Booking In
                {isAdmin && unviewedInvoicesCount > 0 && (
                  <span className="ml-auto text-sm font-normal text-primary">
                    {unviewedInvoicesCount} new
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                {isAdmin ? "View all invoices" : "View your invoices"}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="mb-6">
          <h3 className="text-2xl font-bold mb-4">Developers</h3>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading developers...</p>
          </div>
        ) : developers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No developers yet</p>
              <p className="text-sm text-muted-foreground">
                No developers have been added to the system
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {developers.map((developer) => {
              const logo = developerLogos[developer.name];
              return (
                <Card
                  key={developer.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/developer/${developer.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-center h-[120px] w-full p-4">
                      {logo && (
                        <img 
                          src={logo} 
                          alt={developer.name}
                          className="h-full w-full object-contain rounded-lg"
                        />
                      )}
                    </div>
                    <CardDescription className="mt-3 text-center">
                      {developer.site_count || 0} site{developer.site_count !== 1 ? 's' : ''}
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        )}

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

      </main>
    </div>
  );
};

export default Dashboard;
