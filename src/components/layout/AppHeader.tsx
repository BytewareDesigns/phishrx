import { Link, useNavigate } from "react-router-dom";
import {
  LogOut,
  User,
  Settings,
  ChevronDown,
  ShieldAlert,
  Building2,
  LayoutDashboard,
  ShieldCheck,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { getInitials } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const ROLE_LABELS: Record<string, string> = {
  master_admin:   "Master Admin",
  global_admin:   "Global Admin",
  training_admin: "Training Admin",
};

const ROLE_BADGE_CLASS: Record<string, string> = {
  master_admin:   "bg-rose-100 text-rose-700",
  global_admin:   "bg-purple-100 text-purple-700",
  training_admin: "bg-blue-100 text-blue-700",
};

export function AppHeader() {
  const {
    profile, isPlatformAdmin, isMasterAdmin,
    viewingAsPractitioner, impersonatingOrgName,
    setViewingAsPractitioner, exitImpersonation,
  } = useAuth();
  const navigate = useNavigate();

  const initials    = getInitials(profile?.first_name, profile?.last_name);
  const fullName    = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "User";
  const role        = profile?.role ?? "training_admin";
  const roleLabel   = ROLE_LABELS[role] ?? role;
  const roleBadge   = ROLE_BADGE_CLASS[role] ?? "";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("You have been signed out.");
    navigate("/login");
  };

  const handleTogglePractitionerView = () => {
    if (viewingAsPractitioner) {
      // Exit — clean up impersonation too if active
      if (impersonatingOrgName) exitImpersonation();
      else setViewingAsPractitioner(false);
      navigate("/admin");
    } else {
      setViewingAsPractitioner(true);
      navigate("/dashboard");
    }
  };

  const dashboardHref = isPlatformAdmin() ? "/admin" : "/dashboard";

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center border-b bg-white px-6 shadow-sm">
      {/* Logo */}
      <Link to={dashboardHref} className="flex items-center gap-2 mr-8">
        <ShieldAlert className="h-7 w-7 text-primary" />
        <span className="text-xl font-bold text-foreground tracking-tight">
          Phish<span className="text-primary">Rx</span>
        </span>
      </Link>

      {/* Nav links */}
      <nav className="hidden md:flex items-center gap-6 flex-1">
        {isPlatformAdmin() ? (
          <>
            <Link to="/admin"               className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link>
            <Link to="/admin/organizations" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Organizations</Link>
            <Link to="/admin/users"         className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Users</Link>
            <Link to="/admin/campaigns"     className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Campaigns</Link>
            <Link to="/admin/templates"     className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Templates</Link>
          </>
        ) : (
          <>
            <Link to="/dashboard"            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link>
            <Link to="/dashboard/campaigns"  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Campaigns</Link>
            <Link to="/dashboard/employees"  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Employees</Link>
            <Link to="/dashboard/templates"  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Templates</Link>
            <Link to="/dashboard/reports"    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Reports</Link>
          </>
        )}
      </nav>

      {/* Avatar dropdown — matches EduBuilder pattern */}
      <div className="ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="text-sm">{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden md:block text-sm font-medium max-w-[140px] truncate">
                {fullName}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-60">
            {/* User info header */}
            <DropdownMenuLabel className="font-normal pb-2">
              <div className="flex flex-col gap-1">
                <p className="font-semibold text-sm truncate">{fullName}</p>
                <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
                <span className={`mt-1 inline-flex self-start items-center rounded-full px-2 py-0.5 text-xs font-medium ${roleBadge}`}>
                  {roleLabel}
                </span>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                <User className="h-4 w-4" />
                My Profile
              </Link>
            </DropdownMenuItem>

            {isPlatformAdmin() && (
              <DropdownMenuItem asChild>
                <Link to="/admin/settings" className="flex items-center gap-2 cursor-pointer">
                  <Settings className="h-4 w-4" />
                  Platform Settings
                </Link>
              </DropdownMenuItem>
            )}

            {!isPlatformAdmin() && (
              <DropdownMenuItem asChild>
                <Link to="/dashboard/settings" className="flex items-center gap-2 cursor-pointer">
                  <Building2 className="h-4 w-4" />
                  Organization Settings
                </Link>
              </DropdownMenuItem>
            )}

            {/* Practitioner view toggle — master_admin only */}
            {isMasterAdmin() && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={handleTogglePractitionerView}
                >
                  {viewingAsPractitioner ? (
                    <>
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <span>Back to Admin View</span>
                    </>
                  ) : (
                    <>
                      <LayoutDashboard className="h-4 w-4" />
                      <span>View as Practitioner</span>
                    </>
                  )}
                </DropdownMenuItem>
              </>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
