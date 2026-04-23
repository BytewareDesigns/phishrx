import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function NotFound() {
  const { isPlatformAdmin, isAuthenticated } = useAuth();
  const homeHref = !isAuthenticated()
    ? "/login"
    : isPlatformAdmin()
    ? "/admin"
    : "/dashboard";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background px-4">
      <ShieldAlert className="h-16 w-16 text-muted-foreground/40" />
      <div className="text-center space-y-2">
        <h1 className="text-5xl font-bold text-foreground">404</h1>
        <p className="text-xl text-muted-foreground">Page not found</p>
        <p className="text-sm text-muted-foreground">
          The page you're looking for doesn't exist or you don't have access to it.
        </p>
      </div>
      <Button asChild>
        <Link to={homeHref}>Back to Home</Link>
      </Button>
    </div>
  );
}
