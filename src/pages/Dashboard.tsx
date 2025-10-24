import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, Building2, FileText } from "lucide-react";

interface Site {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [createSiteDialogOpen, setCreateSiteDialogOpen] = useState(false);
  const [siteName, setSiteName] = useState("");
  const [siteDescription, setSiteDescription] = useState("");
  const [numberOfPlots, setNumberOfPlots] = useState(1);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user) fetchSites();
  }, [user]);

  const fetchSites = async () => {
    if (!user) return;

    try {
      if (isAdmin) {
        const { data, error } = await supabase
          .from("sites")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setSites(data || []);
      } else {
        const { data, error } = await supabase
          .from("user_site_assignments")
          .select(`
            sites!inner (
              id,
              name,
              description,
              created_at
            )
          `)
          .eq("user_id", user.id);

        if (error) throw error;
        setSites(data?.map((d: any) => d.sites).filter(Boolean) || []);
      }
    } catch (error: any) {
      toast.error("Failed to load sites");
      console.error("Error fetching sites:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !siteName.trim()) return;

    setCreating(true);

    try {
      // Create the site
      const { data: site, error: siteError } = await supabase
        .from("sites")
        .insert({
          name: siteName.trim(),
          description: siteDescription.trim() || null,
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
      setSiteDescription("");
      setNumberOfPlots(1);
      fetchSites();
    } catch (error: any) {
      toast.error("Failed to create site");
      console.error("Error:", error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <Header />
      
      <main className="container py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            {isAdmin ? "Manage all sites and bookings" : "View your assigned sites and bookings"}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate("/booking-in")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                Booking In
              </CardTitle>
              <CardDescription>
                {isAdmin ? "View all invoices and bookings" : "View your invoices and bookings"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                View Bookings
              </Button>
            </CardContent>
          </Card>

          {isAdmin && (
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate("/admin")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-6 w-6 text-primary" />
                  Admin Panel
                </CardTitle>
                <CardDescription>Manage construction sites</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  Open Admin
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-bold">
              {isAdmin ? "All Sites" : "Your Sites"}
            </h3>
            {isAdmin && (
              <Button onClick={() => setCreateSiteDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Site
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading sites...</p>
          </div>
        ) : sites.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No sites yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                {isAdmin
                  ? "Create your first site to get started"
                  : "No sites have been assigned to you yet"}
              </p>
              {isAdmin && (
                <Button onClick={() => setCreateSiteDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Site
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sites.map((site) => (
              <Card
                key={site.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/site/${site.id}`)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    {site.name}
                  </CardTitle>
                  {site.description && (
                    <CardDescription>{site.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    View Site
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Site Dialog */}
        <Dialog open={createSiteDialogOpen} onOpenChange={setCreateSiteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Site</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateSite} className="space-y-4">
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
                <Label htmlFor="siteDescription">Description</Label>
                <Textarea
                  id="siteDescription"
                  value={siteDescription}
                  onChange={(e) => setSiteDescription(e.target.value)}
                  placeholder="Optional description"
                  rows={3}
                  maxLength={500}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numberOfPlots">Number of Plots *</Label>
                <Input
                  id="numberOfPlots"
                  type="number"
                  min="1"
                  max="1000"
                  value={numberOfPlots}
                  onChange={(e) => setNumberOfPlots(parseInt(e.target.value) || 1)}
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
