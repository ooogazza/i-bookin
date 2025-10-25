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
  actions?: ReactNode;
  hideTitle?: boolean;
}

export const Header = ({ 
  showBackButton = false,
  showLogout = false,
  actions,
  hideTitle = false
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
          <img 
            src={logo} 
            alt="I-Book Logo" 
            className={`h-10 w-10 rounded-lg ${showBackButton ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
            onClick={showBackButton ? () => navigate("/dashboard") : undefined}
            title={showBackButton ? "Back to Dashboard" : undefined}
          />
          {!hideTitle && (
            <div className="hidden sm:flex flex-col">
              <h1 className="text-2xl font-bold leading-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">I-Book</h1>
              <p className="text-xs text-muted-foreground leading-tight">Brickwork Manager</p>
            </div>
          )}
        </div>
        
        <nav className="flex items-center gap-2 flex-wrap">
          {actions}
          {showLogout && (
            <Button variant="outline" onClick={handleLogout} size="sm" className="whitespace-nowrap">
              <LogOut className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
};
