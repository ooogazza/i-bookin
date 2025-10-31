import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import DeveloperDetail from "./pages/DeveloperDetail";
import SiteDetail from "./pages/SiteDetail";
import PlotBooking from "./pages/PlotBooking";
import BookingIn from "./pages/BookingIn";
import Admin from "./pages/Admin";
import Sites from "./pages/admin/Sites";
import Settings from "./pages/admin/Settings";
import Install from "./pages/Install";
import ResetPassword from "./pages/ResetPassword";
import Presentation from "./pages/Presentation";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/developer/:developerId"
              element={
                <ProtectedRoute>
                  <DeveloperDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/site/:id"
              element={
                <ProtectedRoute>
                  <SiteDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/plot/:id/booking"
              element={
                <ProtectedRoute>
                  <PlotBooking />
                </ProtectedRoute>
              }
            />
            <Route
              path="/booking-in"
              element={
                <ProtectedRoute>
                  <BookingIn />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <Admin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/sites"
              element={
                <ProtectedRoute requireAdmin>
                  <Sites />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute requireAdmin>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route path="/install" element={<Install />} />
            <Route path="/presentation" element={<Presentation />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
