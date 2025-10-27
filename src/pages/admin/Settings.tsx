import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2, FileText } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Settings = () => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [activeLogo, setActiveLogo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveLogo();
  }, []);

  const fetchActiveLogo = async () => {
    try {
      const { data, error } = await supabase
        .from("letterhead_settings")
        .select("*")
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      setActiveLogo(data);
    } catch (error) {
      console.error("Error fetching letterhead:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!["image/png", "application/pdf"].includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PNG or PDF file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Deactivate current active letterhead
      if (activeLogo) {
        await supabase
          .from("letterhead_settings")
          .update({ is_active: false })
          .eq("id", activeLogo.id);

        // Delete old file
        const oldPath = activeLogo.file_url.split("/").pop();
        await supabase.storage.from("letterheads").remove([oldPath]);
      }

      // Upload new file
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("letterheads")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("letterheads")
        .getPublicUrl(fileName);

      // Save to database
      const { error: dbError } = await supabase
        .from("letterhead_settings")
        .insert({
          file_url: publicUrl,
          file_name: file.name,
          file_type: file.type,
          uploaded_by: user.id,
          is_active: true,
        });

      if (dbError) throw dbError;

      toast({
        title: "Letterhead uploaded",
        description: "Your business letterhead has been set successfully",
      });

      fetchActiveLogo();
    } catch (error: any) {
      console.error("Error uploading letterhead:", error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleRemove = async () => {
    if (!activeLogo) return;

    try {
      // Delete from storage
      const filePath = activeLogo.file_url.split("/").pop();
      await supabase.storage.from("letterheads").remove([filePath]);

      // Delete from database
      const { error } = await supabase
        .from("letterhead_settings")
        .delete()
        .eq("id", activeLogo.id);

      if (error) throw error;

      toast({
        title: "Letterhead removed",
        description: "Business letterhead has been removed",
      });

      setActiveLogo(null);
    } catch (error: any) {
      console.error("Error removing letterhead:", error);
      toast({
        title: "Removal failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <Header showBackButton />
      
      <main className="container py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">
            Manage business letterhead for PDF invoices
          </p>
        </div>

        <div className="max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Business Letterhead
              </CardTitle>
              <CardDescription>
                Upload a letterhead (PNG or PDF) that will be used as background for all PDF invoices
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <>
                  <Alert>
                    <AlertDescription>
                      <strong>Recommendation:</strong> Use high-resolution images (300 DPI) for PNG files or single-page PDF templates. Maximum file size: 5MB.
                    </AlertDescription>
                  </Alert>

                  {activeLogo ? (
                    <div className="space-y-4">
                      <div className="p-4 border rounded-lg bg-muted/50">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-medium">{activeLogo.file_name}</p>
                            <p className="text-sm text-muted-foreground">
                              Uploaded {new Date(activeLogo.uploaded_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleRemove}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove
                          </Button>
                        </div>
                        {activeLogo.file_type === "image/png" && (
                          <div className="mt-4 border rounded-lg overflow-hidden">
                            <img 
                              src={activeLogo.file_url} 
                              alt="Letterhead preview" 
                              className="w-full h-auto"
                            />
                          </div>
                        )}
                        {activeLogo.file_type === "application/pdf" && (
                          <div className="mt-4 p-8 border rounded-lg bg-background text-center">
                            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">PDF Letterhead Active</p>
                          </div>
                        )}
                      </div>

                      <div className="text-sm text-muted-foreground">
                        <p>To replace the current letterhead, upload a new file below.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 border-2 border-dashed rounded-lg">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No letterhead uploaded yet</p>
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <Input
                      type="file"
                      accept=".png,.pdf"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      className="flex-1"
                      id="letterhead-upload"
                    />
                    <label htmlFor="letterhead-upload">
                      <Button disabled={uploading} asChild>
                        <span>
                          <Upload className="h-4 w-4 mr-2" />
                          {uploading ? "Uploading..." : "Upload"}
                        </span>
                      </Button>
                    </label>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Settings;
