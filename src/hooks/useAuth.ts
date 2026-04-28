import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import type { UserProfile } from "@/types";

export function useAuthProvider() {
  const { setSession, setUser, setProfile, setLoading, setInitialized, reset } =
    useAuthStore();

  useEffect(() => {
    // Get initial session — always call setInitialized(true), even on error,
    // so the app never gets stuck on the loading spinner.
    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchProfile(session.user.id);
        }

        setLoading(false);
        setInitialized(true);
      })
      .catch((err) => {
        console.error("Auth getSession error:", err);
        setLoading(false);
        setInitialized(true);
      });

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (event === "SIGNED_IN" && session?.user) {
        await fetchProfile(session.user.id);
      } else if (event === "USER_UPDATED" && session?.user) {
        // Password / email changed — re-fetch profile so store stays current.
        await fetchProfile(session.user.id);
      } else if (event === "TOKEN_REFRESHED" && session?.user) {
        // Refresh token rotated — keep session in sync, no profile re-fetch needed.
        // setSession / setUser already called above.
      } else if (event === "SIGNED_OUT") {
        reset();
        setInitialized(true);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchProfile(userId: string) {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error.message);
      setProfile(null);
    } else {
      setProfile(data as UserProfile);
    }
  }
}

/** Hook to access auth state anywhere */
export function useAuth() {
  return useAuthStore();
}
