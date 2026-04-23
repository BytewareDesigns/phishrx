import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Check your .env file."
  );
}

// Using untyped client — hooks provide type safety via explicit casts.
// Re-run `supabase gen types typescript --project-id zkbrrlbwwckgqepeozjd`
// and re-add the Database generic once the schema stabilises.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: "phishrx-auth",
  },
});
