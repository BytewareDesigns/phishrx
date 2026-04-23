import { useState } from "react";
import { User, Lock, ShieldAlert, Eye, EyeOff, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useUpdateProfile, useChangePassword } from "@/hooks/useUsers";
import { formatDate } from "@/lib/utils";

// ── Schemas ───────────────────────────────────────────────────
const profileSchema = z.object({
  first_name: z.string().min(1, "Required"),
  last_name:  z.string().min(1, "Required"),
  phone:      z.string().optional(),
  title:      z.string().optional(),
});
type ProfileForm = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Required"),
    newPassword:     z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string().min(1, "Required"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path:    ["confirmPassword"],
  });
type PasswordForm = z.infer<typeof passwordSchema>;

const ROLE_LABELS: Record<string, string> = {
  master_admin:   "Master Admin",
  global_admin:   "Global Admin",
  training_admin: "Training Admin",
};

// ── Component ─────────────────────────────────────────────────
export default function Profile() {
  const { profile, user } = useAuth();
  const updateProfile  = useUpdateProfile();
  const changePassword = useChangePassword();

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: {
      first_name: profile?.first_name ?? "",
      last_name:  profile?.last_name  ?? "",
      phone:      profile?.phone      ?? "",
      title:      profile?.title      ?? "",
    },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const handleProfileSave = async (data: ProfileForm) => {
    if (!profile?.id) return;
    await updateProfile.mutateAsync({
      id:         profile.id,
      first_name: data.first_name,
      last_name:  data.last_name,
      phone:      data.phone || null,
      title:      data.title || null,
    });
  };

  const handlePasswordChange = async (data: PasswordForm) => {
    if (!user?.email) return;
    await changePassword.mutateAsync({
      email:           user.email,
      currentPassword: data.currentPassword,
      newPassword:     data.newPassword,
    });
    passwordForm.reset();
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">My Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your personal information and account security
        </p>
      </div>

      {/* Account info (read-only) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Account</CardTitle>
          </div>
          <CardDescription>Your platform account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{user?.email ?? "—"}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Role</span>
            <Badge variant="secondary">
              {ROLE_LABELS[profile?.role ?? ""] ?? profile?.role ?? "—"}
            </Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Member since</span>
            <span>{profile?.created_at ? formatDate(profile.created_at) : "—"}</span>
          </div>
        </CardContent>
      </Card>

      {/* Profile details form */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Personal Information</CardTitle>
          </div>
          <CardDescription>Update your display name, title, and phone number</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={profileForm.handleSubmit(handleProfileSave)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input {...profileForm.register("first_name")} />
                {profileForm.formState.errors.first_name && (
                  <p className="text-xs text-destructive">
                    {profileForm.formState.errors.first_name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input {...profileForm.register("last_name")} />
                {profileForm.formState.errors.last_name && (
                  <p className="text-xs text-destructive">
                    {profileForm.formState.errors.last_name.message}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Job Title</Label>
              <Input placeholder="e.g. Security Administrator" {...profileForm.register("title")} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input placeholder="555-123-4567" {...profileForm.register("phone")} />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={updateProfile.isPending}>
                {updateProfile.isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</>
                  : "Save Changes"
                }
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Change password form */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Change Password</CardTitle>
          </div>
          <CardDescription>
            Your current password is required to set a new one
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={passwordForm.handleSubmit(handlePasswordChange)} className="space-y-4">
            <div className="space-y-2">
              <Label>Current Password</Label>
              <div className="relative">
                <Input
                  type={showCurrent ? "text" : "password"}
                  className="pr-10"
                  {...passwordForm.register("currentPassword")}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowCurrent(v => !v)}
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordForm.formState.errors.currentPassword && (
                <p className="text-xs text-destructive">
                  {passwordForm.formState.errors.currentPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>New Password</Label>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  className="pr-10"
                  {...passwordForm.register("newPassword")}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowNew(v => !v)}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordForm.formState.errors.newPassword && (
                <p className="text-xs text-destructive">
                  {passwordForm.formState.errors.newPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Confirm New Password</Label>
              <div className="relative">
                <Input
                  type={showConfirm ? "text" : "password"}
                  className="pr-10"
                  {...passwordForm.register("confirmPassword")}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowConfirm(v => !v)}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordForm.formState.errors.confirmPassword && (
                <p className="text-xs text-destructive">
                  {passwordForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={changePassword.isPending}>
                {changePassword.isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Changing…</>
                  : "Change Password"
                }
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
