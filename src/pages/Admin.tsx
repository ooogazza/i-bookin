import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Building2 } from "lucide-react";

const Admin = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-secondary/30">
      <Header showBackButton />
      
      <main className="container py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
          <p className="text-muted-foreground">
            Manage construction sites
          </p>
        </div>

        <div className="max-w-md">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/brickwork/admin/sites")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Manage Sites
              </CardTitle>
              <CardDescription>
                Create and edit construction sites
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                Go to Sites
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Admin;
