import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { Loader2, ShieldAlert } from "lucide-react";

import { queryClient } from "@/lib/queryClient";
import { useAuthProvider, useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";

// ── Lazy-loaded pages (each becomes its own chunk) ───────────
// Auth
const Login       = lazy(() => import("@/pages/Login"));
const SsoCallback = lazy(() => import("@/pages/SsoCallback"));
const NotFound    = lazy(() => import("@/pages/NotFound"));

// Admin
const AdminDashboard    = lazy(() => import("@/pages/admin/Dashboard"));
const AdminOrganizations = lazy(() => import("@/pages/admin/Organizations"));
const OrganizationDetail = lazy(() => import("@/pages/admin/OrganizationDetail"));

// Training admin
const TrainingDashboard = lazy(() => import("@/pages/dashboard/Dashboard"));
const Employees         = lazy(() => import("@/pages/dashboard/Employees"));
const Campaigns         = lazy(() => import("@/pages/dashboard/Campaigns"));
const CampaignNew       = lazy(() => import("@/pages/dashboard/CampaignNew"));
const CampaignDetail    = lazy(() => import("@/pages/dashboard/CampaignDetail"));
const Templates         = lazy(() => import("@/pages/dashboard/Templates"));
const Reports           = lazy(() => import("@/pages/dashboard/Reports"));

// ── Page-level loading fallback ──────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

// ── Coming soon placeholder ──────────────────────────────────
function ComingSoon({ title }: { title: string }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-muted-foreground mt-1">Coming soon</p>
    </div>
  );
}

// ── Auth bootstrap ───────────────────────────────────────────
function AuthBootstrap({ children }: { children: React.ReactNode }) {
  useAuthProvider();
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
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes */}
              <Route path="/login"        element={<Login />} />
              <Route path="/sso-callback" element={<SsoCallback />} />

              {/* Root redirect */}
              <Route path="/" element={<RootRedirect />} />

              {/* ── Platform admin routes ── */}
              <Route element={<ProtectedRoute allowedRoles={["master_admin", "global_admin"]} />}>
                <Route element={<AppLayout />}>
                  <Route path="/admin"                    element={<AdminDashboard />} />
                  <Route path="/admin/organizations"      element={<AdminOrganizations />} />
                  <Route path="/admin/organizations/:id"  element={<OrganizationDetail />} />
                  <Route path="/admin/users"              element={<ComingSoon title="Users" />} />
                  <Route path="/admin/campaigns"          element={<ComingSoon title="All Campaigns" />} />
                  <Route path="/admin/settings"           element={<ComingSoon title="Platform Settings" />} />
                </Route>
              </Route>

              {/* ── Training admin routes ── */}
              <Route element={<ProtectedRoute allowedRoles={["training_admin"]} />}>
                <Route element={<AppLayout />}>
                  <Route path="/dashboard"                element={<TrainingDashboard />} />
                  <Route path="/dashboard/campaigns"      element={<Campaigns />} />
                  <Route path="/dashboard/campaigns/new"  element={<CampaignNew />} />
                  <Route path="/dashboard/campaigns/:id"  element={<CampaignDetail />} />
                  <Route path="/dashboard/employees"      element={<Employees />} />
                  <Route path="/dashboard/templates"      element={<Templates />} />
                  <Route path="/dashboard/reports"        element={<Reports />} />
                  <Route path="/dashboard/settings"       element={<ComingSoon title="Organization Settings" />} />
                </Route>
              </Route>

              {/* Shared profile route */}
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/profile" element={<ComingSoon title="My Profile" />} />
                </Route>
              </Route>

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthBootstrap>
      </BrowserRouter>

      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  );
}
