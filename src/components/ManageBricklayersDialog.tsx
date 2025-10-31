import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Users, Mail, Building2, Plus, X, MapPin } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface Site {
  id: string;
  name: string;
  location: string | null;
}

interface UserWithSites {
  id: string;
  email: string;
  full_name: string | null;
  assignedSites: string[];
}

interface PlotWithSite {
  id: string;
  plot_number: number;
  site_id: string;
  site_name: string;
  site_location: string | null;
}

interface ManageBricklayersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageBricklayersDialog({ open, onOpenChange }: ManageBricklayersDialogProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [users, setUsers] = useState<UserWithSites[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithSites | null>(null);
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAssignment, setPendingAssignment] = useState<{ userId: string; siteId: string } | null>(null);
  const [viewPlotsUser, setViewPlotsUser] = useState<UserWithSites | null>(null);
  const [userPlots, setUserPlots] = useState<PlotWithSite[]>([]);
  const [loadingPlots, setLoadingPlots] = useState(false);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all sites
      const { data: sitesData, error: sitesError } = await supabase
        .from("sites")
        .select("id, name, location")
        .order("name");

      if (sitesError) throw sitesError;
      setSites(sitesData || []);

      // Fetch all non-admin users
      const { data: allUsers, error: usersError } = await supabase
        .from("profiles")
        .select("id, email, full_name");

      if (usersError) throw usersError;

      // Filter out admins
      const { data: adminRoles, error: adminError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (adminError) throw adminError;

      const adminIds = new Set(adminRoles?.map(r => r.user_id) || []);
      const nonAdminUsers = allUsers?.filter(u => !adminIds.has(u.id)) || [];

      // Fetch site assignments for each user
      const { data: assignments, error: assignError } = await supabase
        .from("user_site_assignments")
        .select("user_id, site_id");

      if (assignError) throw assignError;

      const assignmentMap = new Map<string, string[]>();
      assignments?.forEach(a => {
        if (!assignmentMap.has(a.user_id)) {
          assignmentMap.set(a.user_id, []);
        }
        assignmentMap.get(a.user_id)!.push(a.site_id);
      });

      const usersWithSites = nonAdminUsers.map(u => ({
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        assignedSites: assignmentMap.get(u.id) || []
      }));

      setUsers(usersWithSites);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !user) return;

    setInviting(true);
    try {
      // Get user's full name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      // Send invitation email (not tied to a specific site)
      const { error: emailError } = await supabase.functions.invoke('send-invitation-email', {
        body: {
          email: inviteEmail.trim().toLowerCase(),
          siteName: "I-Bookin Platform",
          invitedBy: profile?.full_name || user.email || "An administrator",
          customDomain: window.location.origin
        }
      });

      if (emailError) {
        console.error("Email error:", emailError);
        toast.success("User will get access when they sign up! (Email notification may be delayed)");
      } else {
        toast.success("Invitation sent! User will receive an email and automatically get access when they sign up.");
      }

      setInviteEmail("");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to send invitation");
      console.error("Error:", error);
    } finally {
      setInviting(false);
    }
  };

  const handleManageUserSites = (user: UserWithSites) => {
    setSelectedUser(user);
    setSelectedSites([...user.assignedSites]);
  };

  const handleSiteToggle = (siteId: string) => {
    const isCurrentlyAssigned = selectedSites.includes(siteId);
    
    if (!isCurrentlyAssigned && selectedUser) {
      // Check if user is already assigned to another site
      if (selectedUser.assignedSites.length > 0 && !selectedUser.assignedSites.includes(siteId)) {
        setPendingAssignment({ userId: selectedUser.id, siteId });
        setShowConfirmDialog(true);
        return;
      }
    }

    setSelectedSites(prev => 
      isCurrentlyAssigned 
        ? prev.filter(id => id !== siteId)
        : [...prev, siteId]
    );
  };

  const confirmAssignment = () => {
    if (pendingAssignment) {
      setSelectedSites(prev => [...prev, pendingAssignment.siteId]);
      setPendingAssignment(null);
    }
    setShowConfirmDialog(false);
  };

  const handleSaveAssignments = async () => {
    if (!selectedUser) return;

    try {
      // Remove all current assignments
      const { error: deleteError } = await supabase
        .from("user_site_assignments")
        .delete()
        .eq("user_id", selectedUser.id);

      if (deleteError) throw deleteError;

      // Add new assignments
      if (selectedSites.length > 0) {
        const assignments = selectedSites.map(siteId => ({
          user_id: selectedUser.id,
          site_id: siteId
        }));

        const { error: insertError } = await supabase
          .from("user_site_assignments")
          .insert(assignments);

        if (insertError) throw insertError;
      }

      toast.success("Site assignments updated");
      setSelectedUser(null);
      setSelectedSites([]);
      fetchData();
    } catch (error: any) {
      toast.error("Failed to update assignments");
      console.error("Error:", error);
    }
  };

  const getSiteNames = (siteIds: string[]) => {
    return siteIds
      .map(id => sites.find(s => s.id === id)?.name)
      .filter(Boolean)
      .join(", ") || "No sites assigned";
  };

  const handleViewPlots = async (user: UserWithSites) => {
    setViewPlotsUser(user);
    setLoadingPlots(true);
    
    try {
      const { data: plots, error } = await supabase
        .from("plots")
        .select(`
          id,
          plot_number,
          site_id,
          sites (
            name,
            location
          )
        `)
        .eq("assigned_to", user.id)
        .order("site_id")
        .order("plot_number");

      if (error) throw error;

      const plotsWithSite: PlotWithSite[] = plots?.map(p => ({
        id: p.id,
        plot_number: p.plot_number,
        site_id: p.site_id,
        site_name: (p.sites as any)?.name || "Unknown Site",
        site_location: (p.sites as any)?.location || null,
      })) || [];

      setUserPlots(plotsWithSite);
    } catch (error: any) {
      console.error("Error fetching plots:", error);
      toast.error("Failed to load plots");
    } finally {
      setLoadingPlots(false);
    }
  };

  const handlePlotClick = (plot: PlotWithSite) => {
    navigate(`/site/${plot.site_id}?plot=${plot.id}`);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Manage Bricklayers
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="manage" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manage">Manage Assignments</TabsTrigger>
              <TabsTrigger value="invite">Invite Bricklayers</TabsTrigger>
            </TabsList>

            <TabsContent value="invite" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Mail className="h-4 w-4" />
                    Invite New Bricklayer
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email Address</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="bricklayer@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && inviteEmail.trim()) {
                          handleInvite();
                        }
                      }}
                    />
                  </div>
                  <Button 
                    onClick={handleInvite} 
                    className="w-full" 
                    disabled={!inviteEmail.trim() || inviting}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {inviting ? "Sending..." : "Send Invitation"}
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Invited bricklayers won't see any sites until you assign them in the "Manage Assignments" tab.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="manage" className="space-y-4">
              {loading ? (
                <p className="text-center py-8 text-muted-foreground">Loading...</p>
              ) : users.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No bricklayers found. Invite some using the "Invite Bricklayers" tab.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {users.map(user => (
                    <Card key={user.id} className="hover:bg-muted/50 transition-colors">
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="font-medium">{user.full_name || user.email}</p>
                            <div className="flex items-center gap-2 text-sm">
                              <Building2 className="h-3 w-3" />
                              <span className="text-muted-foreground">
                                {user.assignedSites.length > 0 
                                  ? getSiteNames(user.assignedSites)
                                  : "No sites assigned"}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleViewPlots(user)}
                            >
                              View Plots
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleManageUserSites(user)}
                            >
                              Manage Sites
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Manage Sites Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>
              Assign Sites to {selectedUser?.full_name || selectedUser?.email}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {sites.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No sites available</p>
            ) : (
              sites.map(site => (
                <div key={site.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <Checkbox
                    id={`site-${site.id}`}
                    checked={selectedSites.includes(site.id)}
                    onCheckedChange={() => handleSiteToggle(site.id)}
                  />
                  <div className="flex-1 space-y-1 cursor-pointer" onClick={() => handleSiteToggle(site.id)}>
                    <Label 
                      htmlFor={`site-${site.id}`} 
                      className="font-medium cursor-pointer"
                    >
                      {site.name}
                    </Label>
                    {site.location && (
                      <p className="text-sm text-muted-foreground">{site.location}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setSelectedUser(null)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveAssignments}
              className="flex-1"
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Plots Dialog */}
      <Dialog open={!!viewPlotsUser} onOpenChange={(open) => !open && setViewPlotsUser(null)}>
        <DialogContent className="max-w-2xl" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Plots Assigned to {viewPlotsUser?.full_name || viewPlotsUser?.email}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {loadingPlots ? (
              <p className="text-center py-8 text-muted-foreground">Loading plots...</p>
            ) : userPlots.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No plots assigned yet</p>
              </div>
            ) : (
              userPlots.map(plot => (
                <Card 
                  key={plot.id} 
                  className="hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handlePlotClick(plot)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">Plot {plot.plot_number}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Building2 className="h-3 w-3" />
                          <span>{plot.site_name}</span>
                        </div>
                        {plot.site_location && (
                          <p className="text-xs text-muted-foreground">{plot.site_location}</p>
                        )}
                      </div>
                      <Button variant="ghost" size="sm">
                        View →
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Assign to Multiple Sites?</AlertDialogTitle>
            <AlertDialogDescription>
              This bricklayer is already assigned to {selectedUser && selectedUser.assignedSites.length > 0 
                ? getSiteNames(selectedUser.assignedSites)
                : "another site"}. 
              Do you want to add them to this site as well?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingAssignment(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAssignment}>Yes, Add Site</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
