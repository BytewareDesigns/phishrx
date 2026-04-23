import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ShieldAlert, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function SsoCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      toast.error("Invalid SSO link.");
      navigate("/login");
      return;
    }

    const handleSso = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("sso-login", {
          body: { token },
        });

        if (error || !data?.success) {
          toast.error(
            data?.message ?? "SSO authentication failed. Please try again from app.medcurity.com."
          );
          navigate("/login");
          return;
        }

        const { error: sessionError } = await supabase.auth.setSession({
          access_token:  data.access_token,
          refresh_token: data.refresh_token,
        });

        if (sessionError) {
          toast.error("Failed to establish session. Please try again.");
          navigate("/login");
          return;
        }

        const role: string = data.user?.role ?? "";
        if (role === "training_admin") {
          navigate("/dashboard", { replace: true });
        } else if (role === "global_admin" || role === "master_admin") {
          navigate("/admin", { replace: true });
        } else {
          navigate("/login", { replace: true });
        }
      } catch {
        toast.error("An unexpected error occurred during SSO. Please try again.");
        navigate("/login");
      }
    };

    handleSso();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-8 w-8 text-primary" />
        <span className="text-2xl font-bold">Phish<span className="text-primary">Rx</span></span>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Authenticating…</span>
      </div>
    </div>
  );
}
