import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Settings, ArrowLeft } from "lucide-react";
import logo from "@/assets/logo.png";

interface HeaderProps {
  showBackButton?: boolean;
}

export const Header = ({ showBackButton = false }: HeaderProps) => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

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
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <img src={logo} alt="E-Build Logo" className="h-10 w-10" />
          <div className="flex flex-col">
            <h1 className="text-xl font-bold leading-tight">E-Build</h1>
            <p className="text-xs text-muted-foreground leading-tight">Brickwork Manager</p>
          </div>
        </div>
        
        <nav className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            Sites
          </Button>
          <Button variant="ghost" onClick={() => navigate("/booking-in")}>
            Booking In
          </Button>
          {isAdmin && (
            <Button variant="ghost" onClick={() => navigate("/admin")}>
              <Settings className="mr-2 h-4 w-4" />
              Admin
            </Button>
          )}
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </nav>
      </div>
    </header>
  );
};
