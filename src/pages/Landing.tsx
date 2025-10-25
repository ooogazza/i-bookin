import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";
import { ArrowRight } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/30">
      {/* Hero Section */}
      <div className="container flex flex-col items-center justify-center min-h-screen text-center px-4">
        <img 
          src={logo} 
          alt="I-Book Logo" 
          className="h-32 w-32 mb-8 animate-fade-in"
        />
        
        <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          I-Book
        </h1>
        
        <p className="text-2xl text-muted-foreground mb-12">
          Brickwork Manager
        </p>
        
        <p className="text-xl text-muted-foreground max-w-2xl mb-12">
          Professional construction payment management system for tracking lifts, managing bookings, and streamlining payments for building projects.
        </p>

        <div className="flex gap-4">
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
      </div>
    </div>
  );
};

export default Landing;
