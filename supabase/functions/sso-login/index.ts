// supabase/functions/sso-login/index.ts
// Verifies a Medcurity SSO JWT and returns a Supabase session.
//
// Called by SsoCallback.tsx:  supabase.functions.invoke("sso-login", { body: { token } })
// Returns: { success, access_token, refresh_token, user: { role } }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders,
  errorResponse,
  handleCors,
  jsonResponse,
} from "../_shared/cors.ts";

// ── Types ─────────────────────────────────────────────────────
interface SsoPayload {
  medcurity_user_id: string;
  email: string;
  company_id: string;
  role: "training_admin" | "global_admin";
  iat: number;
  exp: number;
  nonce: string;
}

// ── JWT Verification (HS256 via Web Crypto — no deps) ─────────
function base64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function verifyJwt(token: string, secret: string): Promise<SsoPayload> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Malformed JWT");

  const [headerB64, payloadB64, sigB64] = parts;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const sigBytes = base64urlDecode(sigB64);
  const msgBytes = new TextEncoder().encode(`${headerB64}.${payloadB64}`);

  const valid = await crypto.subtle.verify("HMAC", key, sigBytes, msgBytes);
  if (!valid) throw new Error("Invalid JWT signature");

  const payload: SsoPayload = JSON.parse(
    new TextDecoder().decode(base64urlDecode(payloadB64)),
  );

  if (!payload.exp || payload.exp < Date.now() / 1000) {
    throw new Error("JWT has expired");
  }

  return payload;
}

// ── Handler ───────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { token } = await req.json() as { token?: string };
    if (!token) return errorResponse("Missing token");

    const secret = Deno.env.get("SSO_JWT_SECRET");
    if (!secret) return errorResponse("SSO not configured", 500);

    // 1. Verify JWT
    let payload: SsoPayload;
    try {
      payload = await verifyJwt(token, secret);
    } catch (e) {
      return errorResponse(`Authentication failed: ${(e as Error).message}`, 401);
    }

    // 2. Validate required fields
    if (!payload.medcurity_user_id || !payload.email || !payload.nonce) {
      return errorResponse("Invalid SSO payload", 401);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // 3. Replay-attack protection: check nonce
    const { data: existingNonce } = await admin
      .from("sso_nonces")
      .select("nonce")
      .eq("nonce", payload.nonce)
      .maybeSingle();

    if (existingNonce) {
      return errorResponse("SSO token already used", 401);
    }

    // 4. Record nonce (TTL enforced by pg_cron once enabled)
    await admin.from("sso_nonces").insert({ nonce: payload.nonce });

    // 5. Look up user by medcurity_user_id
    const { data: profile } = await admin
      .from("user_profiles")
      .select("id, email, role, is_archived")
      .eq("medcurity_user_id", payload.medcurity_user_id)
      .maybeSingle();

    if (profile?.is_archived) {
      return errorResponse("Account is deactivated. Contact your administrator.", 403);
    }

    let authUserId: string;

    if (profile) {
      authUserId = profile.id;

      // Update email if it changed in Medcurity
      if (profile.email !== payload.email) {
        await admin.auth.admin.updateUserById(authUserId, { email: payload.email });
        await admin.from("user_profiles")
          .update({ email: payload.email })
          .eq("id", authUserId);
      }
    } else {
      // 6. First-time SSO: create the Supabase auth user
      const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        email: payload.email,
        email_confirm: true,
        user_metadata: {
          medcurity_user_id: payload.medcurity_user_id,
          role: payload.role,
        },
      });

      if (createError || !newUser.user) {
        console.error("createUser error:", createError);
        return errorResponse("Failed to provision user", 500);
      }

      authUserId = newUser.user.id;

      // The handle_new_user trigger creates user_profiles; set medcurity_user_id + role
      await admin.from("user_profiles")
        .update({
          medcurity_user_id: payload.medcurity_user_id,
          role: payload.role,
        })
        .eq("id", authUserId);
    }

    // 7. Generate a one-time magic-link token (no email sent)
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: payload.email,
    });

    if (linkError || !linkData.properties) {
      console.error("generateLink error:", linkError);
      return errorResponse("Failed to create session", 500);
    }

    // 8. Exchange the token hash for a real session
    //    We use a fresh anonymous client (no service-role) so the session is
    //    scoped to the user (not the admin key).
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: sessionData, error: sessionError } = await anonClient.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: "email",
    });

    if (sessionError || !sessionData.session) {
      console.error("verifyOtp error:", sessionError);
      return errorResponse("Failed to establish session", 500);
    }

    // 9. Fetch the latest role for the response
    const { data: freshProfile } = await admin
      .from("user_profiles")
      .select("role")
      .eq("id", authUserId)
      .single();

    return jsonResponse({
      success: true,
      access_token:  sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
      user: {
        id:   authUserId,
        role: freshProfile?.role ?? payload.role,
      },
    });
  } catch (err) {
    console.error("sso-login unhandled:", err);
    return errorResponse("Internal server error", 500);
  }
});
