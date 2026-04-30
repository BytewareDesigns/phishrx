// supabase/functions/invite-user/index.ts
// Authenticated endpoint — platform admins (master_admin, global_admin) can
// invite a new training_admin user to a specific organization.
//
// POST /invite-user
// Headers: Authorization: Bearer <user_jwt>
// Body: {
//   email:           string,
//   first_name:      string,
//   last_name:       string,
//   organization_id: string,
// }
//
// Behavior:
//   1. Verify caller is master_admin or global_admin (via user_profiles).
//   2. Use Admin API to invite user by email — Supabase sends the magic link.
//   3. Pass first_name/last_name/role in raw_user_meta_data; the
//      handle_new_user trigger copies them into user_profiles on accept.
//   4. Pre-create the user_organization_assignment row so the invitee is
//      ready to land in the right org the moment they accept.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders, errorResponse, handleCors, jsonResponse,
} from "../_shared/cors.ts";

interface InvitePayload {
  email:           string;
  first_name:      string;
  last_name:       string;
  organization_id: string;
}

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse("Unauthorized", 401);
    }
    const userJwt = authHeader.slice(7);

    const payload = (await req.json()) as Partial<InvitePayload>;
    if (
      !payload.email ||
      !payload.first_name ||
      !payload.last_name ||
      !payload.organization_id
    ) {
      return errorResponse("Missing required fields");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey     = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1. Verify caller is a platform admin (use user-context client → reads
    //    user_profiles via RLS, which only allows the user to read their own
    //    row, so we get exactly the caller's role).
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${userJwt}` } },
      auth:   { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return errorResponse("Could not verify caller", 401);
    }

    const { data: callerProfile } = await userClient
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      !callerProfile ||
      (callerProfile.role !== "master_admin" && callerProfile.role !== "global_admin")
    ) {
      return errorResponse("Only platform admins can invite users", 403);
    }

    // 2. Admin client for the privileged invite + assignment
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 3. Send the invite. Supabase emails a magic link; on accept, the user
    //    sets their password and the handle_new_user trigger creates their
    //    user_profiles row populated from raw_user_meta_data.
    const redirectTo = Deno.env.get("APP_URL")
      ? `${Deno.env.get("APP_URL")}/login`
      : undefined;

    const { data: inviteData, error: inviteErr } =
      await admin.auth.admin.inviteUserByEmail(payload.email, {
        data: {
          first_name: payload.first_name,
          last_name:  payload.last_name,
          role:       "training_admin",
        },
        ...(redirectTo && { redirectTo }),
      });

    if (inviteErr || !inviteData.user) {
      console.error("invite-user: invite failed", inviteErr);
      return errorResponse(
        inviteErr?.message ?? "Could not send invite",
        400,
      );
    }

    const newUserId = inviteData.user.id;

    // 4. Pre-create the org assignment so the user is wired up the moment
    //    they accept. ON CONFLICT in case of retries.
    const { error: assignErr } = await admin
      .from("user_organization_assignments")
      .upsert(
        {
          user_id:         newUserId,
          organization_id: payload.organization_id,
          role:            "training_admin",
          is_active:       true,
        },
        { onConflict: "user_id,organization_id" },
      );

    if (assignErr) {
      console.error("invite-user: assignment failed", assignErr);
      // Don't fail the whole invite — the user is invited, the assignment
      // can be retried via the regular Assign User dialog.
    }

    return jsonResponse({
      success: true,
      user_id: newUserId,
      email:   payload.email,
    });
  } catch (err) {
    console.error("invite-user unhandled:", err);
    return errorResponse("Internal server error", 500);
  }
});
