import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Building2, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { developerLogos } from "@/lib/developerLogos";

interface Developer {
  id: string;
  name: string;
  logo_url: string | null;
}

interface Site {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  created_at: string;
  number_of_plots: number;
}

const DeveloperDetail = () => {
  const { developerId } = useParams();
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const [developer, setDeveloper] = useState<Developer | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState<Site | null>(null);

  useEffect(() => {
    if (user && developerId) {
      fetchDeveloperAndSites();
    }
  }, [user, developerId]);

  const fetchDeveloperAndSites = async () => {
    if (!user || !developerId) return;

    try {
      // Fetch developer
      const { data: devData, error: devError } = await supabase
        .from("developers")
        .select("*")
        .eq("id", developerId)
        .single();

      if (devError) throw devError;
      setDeveloper(devData);

      // Fetch sites for this developer
      const { data: sitesData, error: sitesError } = await supabase
        .from("sites")
        .select("id, name, description, location, created_at, number_of_plots")
        .eq("developer_id", developerId)
        .order("created_at", { ascending: false });

      if (sitesError) throw sitesError;
      setSites(sitesData || []);
    } catch (error: any) {
      toast.error("Failed to load developer data");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, site: Site) => {
    e.stopPropagation();
    setSiteToDelete(site);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!siteToDelete) return;

    try {
      const { error } = await supabase
        .from("sites")
        .delete()
        .eq("id", siteToDelete.id);

      if (error) throw error;

      toast.success("Site deleted successfully");
      fetchDeveloperAndSites();
    } catch (error: any) {
      toast.error("Failed to delete site");
      console.error("Error:", error);
    } finally {
      setDeleteDialogOpen(false);
      setSiteToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary/30">
        <Header showBackButton />
        <main className="container py-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!developer) {
    return (
      <div className="min-h-screen bg-secondary/30">
        <Header showBackButton />
        <main className="container py-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Developer not found</p>
          </div>
        </main>
      </div>
    );
  }

  const logo = developerLogos[developer.name];

  return (
    <div className="min-h-screen bg-secondary/30">
      <Header 
        showBackButton 
        developerLogo={logo}
        developerName={developer.name}
      />
      
      <main className="container py-8">
        <div className="mb-8">
          <p className="text-muted-foreground">Sites for this developer</p>
        </div>

        {sites.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No sites yet</p>
              <p className="text-sm text-muted-foreground">
                No sites have been created for this developer
              </p>
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
                  <div className="flex items-start justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      {site.name}
                    </CardTitle>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => handleDeleteClick(e, site)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {site.location && (
                    <CardDescription className="flex items-center gap-1">
                      <span className="text-primary">📍</span>
                      <span className="text-primary">{site.location}</span>
                    </CardDescription>
                  )}
                  {site.description && (
                    <CardDescription>{site.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{new Date(site.created_at).toLocaleDateString()}</span>
                    <span>{site.number_of_plots} plot{site.number_of_plots !== 1 ? 's' : ''}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Site</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{siteToDelete?.name}"? This action cannot be undone and will remove all associated plots and data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default DeveloperDetail;
