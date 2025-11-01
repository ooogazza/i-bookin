import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Building2, MapPin, User } from "lucide-react";
import houseIcon from "@/assets/house-icon.png";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SearchResult {
  type: "plot" | "house_type" | "site" | "bricklayer";
  id: string;
  title: string;
  subtitle?: string;
  metadata?: string;
}

export const DashboardSearch = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setSearching(true);
    const searchTerm = query.toLowerCase().trim();
    const allResults: SearchResult[] = [];

    try {
      // Search sites
      const { data: sites, error: sitesError } = await supabase
        .from("sites")
        .select("id, name, location, developer_id, developers(name)")
        .or(`name.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%`);

      if (!sitesError && sites) {
        sites.forEach((site: any) => {
          allResults.push({
            type: "site",
            id: site.id,
            title: site.name,
            subtitle: site.location || "No location",
            metadata: site.developers?.name || "Unknown developer"
          });
        });
      }

      // Search plots
      const { data: plots, error: plotsError } = await supabase
        .from("plots")
        .select("id, plot_number, site_id, sites(name), house_type_id, house_types(name)")
        .ilike("plot_number::text", `%${searchTerm}%`);

      if (!plotsError && plots) {
        plots.forEach((plot: any) => {
          allResults.push({
            type: "plot",
            id: plot.id,
            title: `Plot ${plot.plot_number}`,
            subtitle: plot.sites?.name || "Unknown site",
            metadata: plot.house_types?.name || "No house type"
          });
        });
      }

      // Search house types
      const { data: houseTypes, error: houseTypesError } = await supabase
        .from("house_types")
        .select("id, name, site_id, sites(name)")
        .ilike("name", `%${searchTerm}%`);

      if (!houseTypesError && houseTypes) {
        houseTypes.forEach((ht: any) => {
          allResults.push({
            type: "house_type",
            id: ht.id,
            title: ht.name,
            subtitle: ht.sites?.name || "Unknown site",
            metadata: "House Type"
          });
        });
      }

      // Search bricklayers (profiles with user_site_assignments)
      const { data: bricklayers, error: bricklayersError } = await supabase
        .from("profiles")
        .select("id, full_name, email, user_roles(role)")
        .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);

      if (!bricklayersError && bricklayers) {
        bricklayers.forEach((user: any) => {
          const isAdmin = user.user_roles?.some((r: any) => r.role === "admin");
          allResults.push({
            type: "bricklayer",
            id: user.id,
            title: user.full_name || "Unnamed",
            subtitle: user.email,
            metadata: isAdmin ? "Admin" : "Bricklayer"
          });
        });
      }

      setResults(allResults);
    } catch (error: any) {
      console.error("Search error:", error);
      toast.error("Failed to search");
    } finally {
      setSearching(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    setOpen(false);
    setSearchQuery("");
    setResults([]);

    switch (result.type) {
      case "site":
        navigate(`/site/${result.id}`);
        break;
      case "plot":
        // Navigate to the site with the plot highlighted
        const plotData = results.find(r => r.id === result.id);
        if (plotData) {
          // Extract site ID from the result - we need to fetch it
          supabase
            .from("plots")
            .select("site_id, plot_number")
            .eq("id", result.id)
            .single()
            .then(({ data }) => {
              if (data) {
                navigate(`/site/${data.site_id}?plot=${data.plot_number}`);
              }
            });
        }
        break;
      case "house_type":
        // Navigate to site where this house type exists and open edit dialog
        supabase
          .from("house_types")
          .select("site_id")
          .eq("id", result.id)
          .single()
          .then(({ data }) => {
            if (data) {
              navigate(`/site/${data.site_id}?houseTypeId=${result.id}`);
            }
          });
        break;
      case "bricklayer":
        // Navigate to dashboard with filtered bricklayer
        navigate(`/dashboard?bricklayerId=${result.id}`);
        break;
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "plot":
        return <MapPin className="h-4 w-4" />;
      case "house_type":
        return <img src={houseIcon} alt="House" className="h-4 w-4 object-contain" />;
      case "site":
        return <Building2 className="h-4 w-4" />;
      case "bricklayer":
        return <User className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Search</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search plots, house types, sites, or bricklayers..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>

            {searching ? (
              <div className="text-center py-8 text-muted-foreground">
                Searching...
              </div>
            ) : results.length > 0 ? (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {results.map((result) => (
                    <Button
                      key={`${result.type}-${result.id}`}
                      variant="ghost"
                      className="w-full justify-start h-auto py-3 px-3"
                      onClick={() => handleResultClick(result)}
                    >
                      <div className="flex items-start gap-3 w-full">
                        <div className="mt-0.5 text-muted-foreground">
                          {getIcon(result.type)}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-medium">{result.title}</div>
                          {result.subtitle && (
                            <div className="text-sm text-muted-foreground">
                              {result.subtitle}
                            </div>
                          )}
                          {result.metadata && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {result.metadata}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {result.type.replace("_", " ")}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            ) : searchQuery ? (
              <div className="text-center py-8 text-muted-foreground">
                No results found for "{searchQuery}"
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Start typing to search
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
