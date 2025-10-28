import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { resetPassword, updatePassword } from "@/lib/supabase";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";

const emailSchema = z.string().email({ message: "Please enter a valid email address" });
const passwordSchema = z.string().min(6, { message: "Password must be at least 6 characters" });

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  
  const isRecoveryMode = searchParams.get('type') === 'recovery';

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      emailSchema.parse(email);

      const { error } = await resetPassword(email.trim());
      
      if (error) {
        toast.error(error.message);
      } else {
        setEmailSent(true);
        toast.success("Password reset email sent! Check your inbox.");
      }
    } catch (error: any) {
      if (error.errors?.[0]?.message) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Please enter a valid email address");
      }
    }
    
    setIsLoading(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      passwordSchema.parse(newPassword);

      const { error } = await updatePassword(newPassword);
      
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Password updated successfully!");
        navigate("/dashboard");
      }
    } catch (error: any) {
      if (error.errors?.[0]?.message) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Invalid password");
      }
    }
    
    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md border shadow-sm">
        <CardHeader className="text-center space-y-4 pb-6">
          <img 
            src={logo} 
            alt="I-Bookin Logo" 
            className="h-20 w-20 mx-auto rounded-2xl"
          />
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">I-Bookin</h1>
            <p className="text-sm font-semibold text-foreground mt-1">Brickwork Manager</p>
          </div>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          {!isRecoveryMode ? (
            <>
              {!emailSent ? (
                <>
                  <h2 className="text-xl font-semibold mb-2">Reset Password</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Enter your email address and we'll send you a link to reset your password.
                  </p>
                  <form onSubmit={handleRequestReset} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-base font-normal">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="h-12"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full h-12 text-base font-medium bg-[#1976D2] hover:bg-[#1565C0] text-white" 
                      disabled={isLoading}
                    >
                      {isLoading ? "Sending..." : "Send Reset Link"}
                    </Button>
                  </form>
                </>
              ) : (
                <div className="text-center space-y-4">
                  <div className="text-green-600 text-5xl mb-4">✓</div>
                  <h2 className="text-xl font-semibold">Check your email</h2>
                  <p className="text-sm text-muted-foreground">
                    We've sent a password reset link to <strong>{email}</strong>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Click the link in the email to reset your password.
                  </p>
                </div>
              )}
              
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => navigate("/auth")}
                  className="text-[#1976D2] hover:underline text-sm inline-flex items-center gap-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Sign In
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold mb-2">Set New Password</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Enter your new password below.
              </p>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-base font-normal">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-base font-normal">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-12"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-medium bg-[#1976D2] hover:bg-[#1565C0] text-white" 
                  disabled={isLoading}
                >
                  {isLoading ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
