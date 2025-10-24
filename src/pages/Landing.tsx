import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";
import { ArrowRight, Building2, FileText, Users } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/30">
      {/* Hero Section */}
      <div className="container flex flex-col items-center justify-center min-h-screen text-center px-4">
        <img 
          src={logo} 
          alt="E-Build Logo" 
          className="h-32 w-32 mb-8 animate-fade-in"
        />
        
        <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          E-Build
        </h1>
        
        <p className="text-2xl text-muted-foreground mb-12">
          Brickwork Manager
        </p>
        
        <p className="text-xl text-muted-foreground max-w-2xl mb-12">
          Professional construction payment management system for tracking lifts, managing bookings, and streamlining payments for building projects.
        </p>

        <div className="flex gap-4 mb-16">
          <Button 
            size="lg" 
            onClick={() => navigate("/auth")}
            className="text-lg px-8"
          >
            Get Started
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            onClick={() => navigate("/auth")}
            className="text-lg px-8"
          >
            Sign In
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl w-full">
          <div className="p-6 bg-card rounded-lg border shadow-sm">
            <Building2 className="h-12 w-12 text-primary mb-4 mx-auto" />
            <h3 className="text-lg font-semibold mb-2">Site Management</h3>
            <p className="text-sm text-muted-foreground">
              Manage multiple construction sites and track progress across all your projects
            </p>
          </div>

          <div className="p-6 bg-card rounded-lg border shadow-sm">
            <FileText className="h-12 w-12 text-primary mb-4 mx-auto" />
            <h3 className="text-lg font-semibold mb-2">Invoice Tracking</h3>
            <p className="text-sm text-muted-foreground">
              Create and track invoices with automated gang division and payment allocation
            </p>
          </div>

          <div className="p-6 bg-card rounded-lg border shadow-sm">
            <Users className="h-12 w-12 text-primary mb-4 mx-auto" />
            <h3 className="text-lg font-semibold mb-2">Team Collaboration</h3>
            <p className="text-sm text-muted-foreground">
              Assign plots to team members and collaborate on project completion
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;
