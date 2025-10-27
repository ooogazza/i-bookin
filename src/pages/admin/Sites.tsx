import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, Edit2, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { siteSchema } from "@/lib/validations";

interface Site {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

const Sites = () => {
  const { user } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [numberOfPlots, setNumberOfPlots] = useState(0);
  const [numberOfHouseTypes, setNumberOfHouseTypes] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      const { data, error } = await supabase
        .from("sites")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSites(data || []);
    } catch (error: any) {
      toast.error("Failed to load sites");
      if (import.meta.env.DEV) {
        console.error("Error:", error);
      }
    }
  };

  const openCreateDialog = () => {
    setEditingSite(null);
    setName("");
    setDescription("");
    setNumberOfPlots(0);
    setNumberOfHouseTypes(0);
    setDialogOpen(true);
  };

  const openEditDialog = (site: Site) => {
    setEditingSite(site);
    setName(site.name);
    setDescription(site.description || "");
    setNumberOfPlots((site as any).number_of_plots || 0);
    setNumberOfHouseTypes((site as any).number_of_house_types || 0);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);

    try {
      // Validate input
      siteSchema.parse({
        name,
        description,
        numberOfPlots,
        numberOfHouseTypes,
      });

      if (editingSite) {
        const { error } = await supabase
          .from("sites")
          .update({ 
            name: name.trim(), 
            description: description?.trim() || null,
            number_of_plots: numberOfPlots,
            number_of_house_types: numberOfHouseTypes
          })
          .eq("id", editingSite.id);

        if (error) throw error;
        toast.success("Site updated successfully");
      } else {
        const { data: site, error } = await supabase
          .from("sites")
          .insert({ 
            name: name.trim(), 
            description: description?.trim() || null, 
            created_by: user.id,
            number_of_plots: numberOfPlots,
            number_of_house_types: numberOfHouseTypes
          })
          .select()
          .single();

        if (error) throw error;

        // Create plots for the site
        if (site && numberOfPlots > 0) {
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
      }

      setDialogOpen(false);
      fetchSites();
    } catch (error: any) {
      if (error.errors?.[0]?.message) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Failed to save site");
      }
      if (import.meta.env.DEV) {
        console.error("Error:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this site?")) return;

    try {
      const { error } = await supabase.from("sites").delete().eq("id", id);

      if (error) throw error;
      toast.success("Site deleted successfully");
      fetchSites();
    } catch (error: any) {
      toast.error("Failed to delete site");
      if (import.meta.env.DEV) {
        console.error("Error:", error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <Header showBackButton />
      
      <main className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Manage Sites</h2>
            <p className="text-muted-foreground">Create and edit construction sites</p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            New Site
          </Button>
        </div>

        <Card>
          <CardContent className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Plots</TableHead>
                  <TableHead>House Types</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sites.map((site) => (
                  <TableRow key={site.id}>
                    <TableCell className="font-medium">{site.name}</TableCell>
                    <TableCell>{site.description || "-"}</TableCell>
                    <TableCell>{(site as any).number_of_plots || 0}</TableCell>
                    <TableCell>{(site as any).number_of_house_types || 0}</TableCell>
                    <TableCell>{new Date(site.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(site)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(site.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>{editingSite ? "Edit Site" : "Create New Site"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Site Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Site A"
                  autoFocus={false}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                  autoFocus={false}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="plots">Number of Plots</Label>
                  <Input
                    id="plots"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={numberOfPlots}
                    onChange={(e) => setNumberOfPlots(e.target.value === "" ? 0 : parseInt(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    autoFocus={false}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="houseTypes">Number of House Types</Label>
                  <Input
                    id="houseTypes"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={numberOfHouseTypes}
                    onChange={(e) => setNumberOfHouseTypes(e.target.value === "" ? 0 : parseInt(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    autoFocus={false}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Saving..." : editingSite ? "Update Site" : "Create Site"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Sites;
