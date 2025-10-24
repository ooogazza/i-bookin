import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, TrendingUp } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <div className="max-w-6xl w-full space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold tracking-tight">I-Build</h1>
          <p className="text-xl text-muted-foreground">
            Comprehensive Construction Management Platform
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-12">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/brickwork/dashboard')}>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-lg bg-primary/10">
                  <ClipboardList className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Brickwork Manager</CardTitle>
              </div>
              <CardDescription className="text-base">
                Manage construction sites, track bookings, and coordinate gang divisions. 
                Perfect for site managers and construction teams handling multiple plots and lifts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" size="lg">
                Open Brickwork Manager
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/progress-tracker')}>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-lg bg-primary/10">
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Progress Tracker</CardTitle>
              </div>
              <CardDescription className="text-base">
                Track construction progress across multiple sites with visual completion tracking 
                for each plot and phase. Monitor project milestones in real-time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" size="lg">
                Open Progress Tracker
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center text-sm text-muted-foreground mt-8">
          Sponsored by Lench Group
        </div>
      </div>
    </div>
  );
};

export default Landing;
