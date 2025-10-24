import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import SiteDetail from "./pages/SiteDetail";
import PlotBooking from "./pages/PlotBooking";
import BookingIn from "./pages/BookingIn";
import Admin from "./pages/Admin";
import Sites from "./pages/admin/Sites";
import ProgressTrackerPlaceholder from "./pages/ProgressTrackerPlaceholder";
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
            {/* Landing Page */}
            <Route path="/" element={<Landing />} />
            
            {/* Brickwork Manager Routes */}
            <Route path="/brickwork/auth" element={<Auth />} />
            <Route
              path="/brickwork/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/brickwork/site/:id"
              element={
                <ProtectedRoute>
                  <SiteDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/brickwork/plot/:id/booking"
              element={
                <ProtectedRoute>
                  <PlotBooking />
                </ProtectedRoute>
              }
            />
            <Route
              path="/brickwork/booking-in"
              element={
                <ProtectedRoute>
                  <BookingIn />
                </ProtectedRoute>
              }
            />
            <Route
              path="/brickwork/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <Admin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/brickwork/admin/sites"
              element={
                <ProtectedRoute requireAdmin>
                  <Sites />
                </ProtectedRoute>
              }
            />
            
            {/* Progress Tracker Routes */}
            <Route path="/progress-tracker" element={<ProgressTrackerPlaceholder />} />
            
            {/* Fallback */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
