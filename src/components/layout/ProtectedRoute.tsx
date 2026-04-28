import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { UserRole } from "@/types";

interface ProtectedRouteProps {
  /** If provided, user must have one of these roles */
  allowedRoles?: UserRole[];
  /** Where to redirect if not authenticated (default: /login) */
  redirectTo?: string;
}

export function ProtectedRoute({
  allowedRoles,
  redirectTo = "/login",
}: ProtectedRouteProps) {
  const { isInitialized, isAuthenticated, getRole } = useAuth();

  // Still loading auth state — show nothing (App handles global loading)
  if (!isInitialized) return null;

  // Not logged in
  if (!isAuthenticated()) return <Navigate to={redirectTo} replace />;

  // Role check — uses effective role so practitioner view toggles access correctly
  const effectiveRole = getRole();
  if (allowedRoles && effectiveRole && !allowedRoles.includes(effectiveRole)) {
    const fallback = effectiveRole === "training_admin" ? "/dashboard" : "/admin";
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
}
