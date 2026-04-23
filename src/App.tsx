import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { Loader2, ShieldAlert } from "lucide-react";

import { queryClient } from "@/lib/queryClient";
import { useAuthProvider, useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";

// Pages
import Login         from "@/pages/Login";
import SsoCallback   from "@/pages/SsoCallback";
import NotFound      from "@/pages/NotFound";
import AdminDashboard          from "@/pages/admin/Dashboard";
import TrainingAdminDashboard  from "@/pages/dashboard/Dashboard";

// ── Auth bootstrap ───────────────────────────────────────────
function AuthBootstrap({ children }: { children: React.ReactNode }) {
  useAuthProvider(); // initializes session listener
  const { isInitialized } = useAuth();

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold">
            Phish<span className="text-primary">Rx</span>
          </span>
        </div>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}

// ── Root redirect ────────────────────────────────────────────
function RootRedirect() {
  const { isAuthenticated, profile } = useAuth();
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  return <Navigate to={profile?.role === "training_admin" ? "/dashboard" : "/admin"} replace />;
}

// ── App ──────────────────────────────────────────────────────
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthBootstrap>
          <Routes>
            {/* Public routes */}
            <Route path="/login"        element={<Login />} />
            <Route path="/sso-callback" element={<SsoCallback />} />

            {/* Root redirect */}
            <Route path="/" element={<RootRedirect />} />

            {/* ── Platform admin routes (master_admin + global_admin) ── */}
            <Route element={<ProtectedRoute allowedRoles={["master_admin", "global_admin"]} />}>
              <Route element={<AppLayout />}>
                <Route path="/admin"                element={<AdminDashboard />} />
                <Route path="/admin/organizations"  element={<div className="p-6"><h1 className="text-2xl font-semibold">Organizations</h1><p className="text-muted-foreground mt-1">Coming soon</p></div>} />
                <Route path="/admin/users"          element={<div className="p-6"><h1 className="text-2xl font-semibold">Users</h1><p className="text-muted-foreground mt-1">Coming soon</p></div>} />
                <Route path="/admin/campaigns"      element={<div className="p-6"><h1 className="text-2xl font-semibold">All Campaigns</h1><p className="text-muted-foreground mt-1">Coming soon</p></div>} />
                <Route path="/admin/settings"       element={<div className="p-6"><h1 className="text-2xl font-semibold">Platform Settings</h1><p className="text-muted-foreground mt-1">Coming soon</p></div>} />
              </Route>
            </Route>

            {/* ── Training admin routes ── */}
            <Route element={<ProtectedRoute allowedRoles={["training_admin"]} />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard"                element={<TrainingAdminDashboard />} />
                <Route path="/dashboard/campaigns"      element={<div className="p-6"><h1 className="text-2xl font-semibold">Campaigns</h1><p className="text-muted-foreground mt-1">Coming soon</p></div>} />
                <Route path="/dashboard/employees"      element={<div className="p-6"><h1 className="text-2xl font-semibold">Employees</h1><p className="text-muted-foreground mt-1">Coming soon</p></div>} />
                <Route path="/dashboard/templates"      element={<div className="p-6"><h1 className="text-2xl font-semibold">Templates</h1><p className="text-muted-foreground mt-1">Coming soon</p></div>} />
                <Route path="/dashboard/reports"        element={<div className="p-6"><h1 className="text-2xl font-semibold">Reports</h1><p className="text-muted-foreground mt-1">Coming soon</p></div>} />
                <Route path="/dashboard/settings"       element={<div className="p-6"><h1 className="text-2xl font-semibold">Organization Settings</h1><p className="text-muted-foreground mt-1">Coming soon</p></div>} />
              </Route>
            </Route>

            {/* Shared profile route */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/profile" element={<div className="p-6"><h1 className="text-2xl font-semibold">My Profile</h1><p className="text-muted-foreground mt-1">Coming soon</p></div>} />
              </Route>
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthBootstrap>
      </BrowserRouter>

      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  );
}
