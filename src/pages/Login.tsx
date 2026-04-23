import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ShieldAlert, Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { Button }  from "@/components/ui/button";
import { Input }   from "@/components/ui/input";
import { Label }   from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useAuth }  from "@/hooks/useAuth";
import { validatePassword } from "@/lib/utils";
import { toast } from "sonner";

// ── Schemas ────────────────────────────────────────────────
const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
});

const passwordSchema = z.object({
  password: z.string().min(1, "Password is required."),
});

const setupSchema = z
  .object({
    password:        z.string().min(12, "Password must be at least 12 characters."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type EmailForm    = z.infer<typeof emailSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;
type SetupForm    = z.infer<typeof setupSchema>;

// ── Step types ─────────────────────────────────────────────
type Step = "email" | "password" | "setup";

export default function Login() {
  const navigate = useNavigate();
  const { isAuthenticated, profile, isInitialized } = useAuth();

  const [step,       setStep]       = useState<Step>("email");
  const [email,      setEmail]      = useState("");
  const [showPass,   setShowPass]   = useState(false);
  const [showConf,   setShowConf]   = useState(false);
  const [isLoading,  setIsLoading]  = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Redirect if already authenticated
  useEffect(() => {
    if (isInitialized && isAuthenticated()) {
      const role = profile?.role;
      navigate(role === "training_admin" ? "/dashboard" : "/admin", { replace: true });
    }
  }, [isInitialized, isAuthenticated, profile, navigate]);

  // ── Email step ───────────────────────────────────────────
  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const handleEmailSubmit = async (data: EmailForm) => {
    setIsLoading(true);
    try {
      // Check if the user exists by attempting a password reset
      // We use a lightweight check: look up user via a public RPC or just proceed
      // For UX: always show password step (don't reveal if account exists)
      setEmail(data.email);

      // Check if this is a first-time user (no confirmed email in auth)
      // We'll handle this server-side — for now, go to password step
      // and show "forgot password / first time" link if login fails
      setStep("password");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Password step ────────────────────────────────────────
  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "" },
  });

  const handlePasswordSubmit = async (data: PasswordForm) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: data.password,
      });

      if (error) {
        if (error.message.toLowerCase().includes("invalid")) {
          toast.error("Incorrect password. Please try again.");
        } else if (error.message.toLowerCase().includes("not confirmed")) {
          toast.error("Please check your email to confirm your account first.");
        } else {
          toast.error(error.message);
        }
        return;
      }

      // Auth state change handler (useAuth) will update the store
      // and the useEffect above will redirect
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Setup step (first-time password) ────────────────────
  const setupForm = useForm<SetupForm>({
    resolver: zodResolver(setupSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const handleSetupSubmit = async (data: SetupForm) => {
    const err = validatePassword(data.password);
    if (err) {
      setPasswordError(err);
      return;
    }
    setPasswordError("");
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password: data.password });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Password set! You are now signed in.");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Forgot password ──────────────────────────────────────
  const handleForgotPassword = async () => {
    if (!email) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Check your email for a password reset link.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <ShieldAlert className="h-9 w-9 text-primary" />
        <span className="text-3xl font-bold tracking-tight">
          Phish<span className="text-primary">Rx</span>
        </span>
      </div>

      <Card className="w-full max-w-md shadow-md">
        {/* ── Email Step ── */}
        {step === "email" && (
          <>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Sign In</CardTitle>
              <CardDescription>
                Enter your Medcurity email address to continue.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@organization.com"
                    autoComplete="email"
                    autoFocus
                    {...emailForm.register("email")}
                  />
                  {emailForm.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {emailForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
                </Button>
              </form>
            </CardContent>
          </>
        )}

        {/* ── Password Step ── */}
        {step === "password" && (
          <>
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStep("email")}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <CardTitle className="text-2xl">Enter Password</CardTitle>
              </div>
              <CardDescription className="truncate">{email}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPass ? "text" : "password"}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      autoFocus
                      className="pr-10"
                      {...passwordForm.register("password")}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPass((v) => !v)}
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordForm.formState.errors.password && (
                    <p className="text-sm text-destructive">
                      {passwordForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    className="text-sm text-primary hover:underline"
                    onClick={handleForgotPassword}
                    disabled={isLoading}
                  >
                    Forgot password?
                  </button>
                </div>
              </form>
            </CardContent>
          </>
        )}

        {/* ── First-Time Setup Step ── */}
        {step === "setup" && (
          <>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Create Your Password</CardTitle>
              <CardDescription>
                Welcome to PhishRx. Set a secure password to activate your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={setupForm.handleSubmit(handleSetupSubmit)} className="space-y-4">
                <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
                  Password must be at least 12 characters and include uppercase, lowercase,
                  a number, and a special character.
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPass ? "text" : "password"}
                      placeholder="Create a strong password"
                      autoComplete="new-password"
                      autoFocus
                      className="pr-10"
                      {...setupForm.register("password")}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPass((v) => !v)}
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {setupForm.formState.errors.password && (
                    <p className="text-sm text-destructive">
                      {setupForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConf ? "text" : "password"}
                      placeholder="Confirm your password"
                      autoComplete="new-password"
                      className="pr-10"
                      {...setupForm.register("confirmPassword")}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowConf((v) => !v)}
                    >
                      {showConf ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {setupForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive">
                      {setupForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                  {passwordError && (
                    <p className="text-sm text-destructive">{passwordError}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Activate Account"}
                </Button>
              </form>
            </CardContent>
          </>
        )}
      </Card>

      <p className="mt-6 text-xs text-muted-foreground text-center">
        © {new Date().getFullYear()} Medcurity — PhishRx Platform
      </p>
    </div>
  );
}
