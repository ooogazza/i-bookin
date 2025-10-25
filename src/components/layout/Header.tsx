import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, ArrowLeft } from "lucide-react";
import logo from "@/assets/logo.png";
import { ReactNode } from "react";

interface HeaderProps {
  showBackButton?: boolean;
  showLogout?: boolean;
  developerLogo?: string;
  developerName?: string;
  actions?: ReactNode;
}

export const Header = ({ 
  showBackButton = false,
  showLogout = false,
  developerLogo,
  developerName,
  actions
}: HeaderProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error("Error logging out");
    } else {
      toast.success("Logged out successfully");
      navigate("/auth");
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          {showBackButton && (
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <img src={logo} alt="I-Book Logo" className="h-10 w-10 rounded-lg" />
          {developerLogo ? (
            <img src={developerLogo} alt={developerName || "Developer"} className="h-10 w-auto object-contain rounded-lg" />
          ) : (
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold leading-tight">I-Book</h1>
              <p className="text-xs text-muted-foreground leading-tight">Brickwork Manager</p>
            </div>
          )}
        </div>
        
        <nav className="flex items-center gap-4">
          {actions}
          {showLogout && (
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
};
