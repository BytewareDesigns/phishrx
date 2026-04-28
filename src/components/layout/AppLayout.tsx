import { Outlet, useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { AppHeader } from "./AppHeader";
import { AppFooter } from "./AppFooter";
import { InactivityDialog } from "@/components/auth/InactivityDialog";
import { useInactivityTimer } from "@/hooks/useInactivityTimer";
import { useAuth } from "@/hooks/useAuth";

export function AppLayout() {
  const { showWarning, secondsLeft, onStayLoggedIn, onLogout } =
    useInactivityTimer();
  const { viewingAsPractitioner, impersonatingOrgName, exitImpersonation, setViewingAsPractitioner } = useAuth();
  const navigate = useNavigate();

  const handleExitView = () => {
    if (impersonatingOrgName) {
      exitImpersonation();
    } else {
      setViewingAsPractitioner(false);
    }
    navigate("/admin");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />

      {/* Practitioner / impersonation banner */}
      {viewingAsPractitioner && (
        <div className="sticky top-16 z-30 flex items-center justify-between gap-3 bg-amber-50 border-b border-amber-200 px-6 py-2 text-sm text-amber-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            {impersonatingOrgName ? (
              <span>
                <span className="font-semibold">Impersonating:</span>
                {" "}{impersonatingOrgName}
                <span className="text-amber-600 ml-2 text-xs">(admin view — changes are real)</span>
              </span>
            ) : (
              <span>
                <span className="font-semibold">Practitioner view</span>
                {" — "}previewing the Training Admin dashboard. Select an organization to impersonate.
              </span>
            )}
          </div>
          <button
            onClick={handleExitView}
            className="shrink-0 rounded-md bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-200 transition-colors"
          >
            Exit to Admin
          </button>
        </div>
      )}

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      <AppFooter />

      <InactivityDialog
        open={showWarning}
        secondsLeft={secondsLeft}
        onStayLoggedIn={onStayLoggedIn}
        onLogout={onLogout}
      />
    </div>
  );
}
