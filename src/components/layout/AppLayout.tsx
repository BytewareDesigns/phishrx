import { Outlet } from "react-router-dom";
import { AppHeader } from "./AppHeader";
import { AppFooter } from "./AppFooter";
import { InactivityDialog } from "@/components/auth/InactivityDialog";
import { useInactivityTimer } from "@/hooks/useInactivityTimer";

export function AppLayout() {
  const { showWarning, secondsLeft, onStayLoggedIn, onLogout } =
    useInactivityTimer();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />

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
