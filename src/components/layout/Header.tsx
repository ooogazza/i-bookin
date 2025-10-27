import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/supabase";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Plus, FileText } from "lucide-react";
import logo from "@/assets/logo.png";
import { ReactNode, useState } from "react";
import { NonPlotInvoiceDialog } from "@/components/NonPlotInvoiceDialog";
import { useIsMobile } from "@/hooks/use-mobile";

interface HeaderProps {
  showBackButton?: boolean;
  showLogout?: boolean;
  actions?: ReactNode;
  hideTitle?: boolean;
  leftContent?: ReactNode;
}

export const Header = ({
  showBackButton = false,
  showLogout = false,
  actions,
  hideTitle = false,
  leftContent,
}: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin } = useAuth();
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [currentInvoiceId, setCurrentInvoiceId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const isSiteDetailPage = location.pathname.startsWith("/site/");

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) toast.error("Error logging out");
    else {
      toast.success("Logged out successfully");
      navigate("/auth");
    }
  };

  // Opens the invoice dialog with a unique ID for the invoice
  const openInvoiceDialog = (invoiceId: string) => {
    setCurrentInvoiceId(invoiceId);
    setInvoiceDialogOpen(true);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={logo}
            alt="I-Bookin Logo"
            className={`h-10 w-10 rounded-lg ${showBackButton ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}
            onClick={showBackButton ? () => navigate("/dashboard") : undefined}
            title={showBackButton ? "Back to Dashboard" : undefined}
          />
          {!hideTitle && (
            <div className="hidden sm:flex flex-col">
              <h1 className="text-2xl font-bold leading-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                I-Bookin
              </h1>
              <p className="text-xs text-muted-foreground leading-tight">Brickwork Manager</p>
            </div>
          )}
          {leftContent}
        </div>

        <nav className="flex items-center gap-2 flex-wrap">
          {actions}

          {!isAdmin && user && location.pathname === "/dashboard" && (
            <Button
              variant="default"
              onClick={() => navigate("/booking-in")}
              size="sm"
              className="whitespace-nowrap"
            >
              <FileText className="md:mr-2 h-4 w-4" />
              <span className="hidden md:inline">Invoices</span>
            </Button>
          )}

          {!isAdmin && user && isSiteDetailPage && (
            <Button
              variant="default"
              onClick={() => openInvoiceDialog(`NPINV-${Date.now()}`)} // unique invoice ID
              size="sm"
              className="whitespace-nowrap"
            >
              {isMobile ? (
                <>
                  <FileText className="h-4 w-4" />
                  <Plus className="h-4 w-4 -ml-1" />
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  <span>Create Invoice</span>
                </>
              )}
            </Button>
          )}

          {showLogout && (
            <Button variant="outline" onClick={handleLogout} size="sm" className="whitespace-nowrap">
              <LogOut className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          )}
        </nav>
      </div>

      <NonPlotInvoiceDialog
        open={invoiceDialogOpen}
        onOpenChange={setInvoiceDialogOpen}
      />
    </header>
  );
};
