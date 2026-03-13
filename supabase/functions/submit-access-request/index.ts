/// <reference path="../types.d.ts" />

const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get("origin") ?? "*";
  const reqHeaders =
    req.headers.get("access-control-request-headers") ??
    "authorization, x-client-info, apikey, content-type";
  return {
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin",
    "Access-Control-Allow-Headers": reqHeaders,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  } as Record<string, string>;
};

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing SUPABASE_URL" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => ({}));

    const full_name = String((body as any)?.full_name || "").trim();
    const official_email = String((body as any)?.official_email || "").trim().toLowerCase();
    const department = String((body as any)?.department || "").trim();
    const designation = String((body as any)?.designation || "").trim();
    const employee_id = String((body as any)?.employee_id || "").trim();
    const purpose = String((body as any)?.purpose || "").trim();
    const role = String((body as any)?.role || "").trim().toLowerCase();
    const submitted_at = String((body as any)?.submitted_at || new Date().toISOString());
    const redirect_to = String((body as any)?.redirect_to || "").trim();
    const reports_to_officer_id = (body as any)?.reports_to_officer_id || null;
    const reports_to_officer_name = (body as any)?.reports_to_officer_name || null;

    if (!full_name || full_name.length < 2) {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid full_name" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!official_email || !official_email.includes("@")) {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid official_email" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!department) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing department" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!designation || designation.length < 2) {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid designation" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!employee_id || employee_id.length < 3) {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid employee_id" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!purpose || purpose.length < 20) {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid purpose" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (role !== "officer" && role !== "admin" && role !== "staff") {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid role" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Staff must have reports_to_officer_id
    if (role === "staff" && !reports_to_officer_id) {
      return new Response(
        JSON.stringify({ ok: false, error: "Staff must select an officer to report to" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: inserted, error: insErr } = await admin
      .from("access_requests")
      .insert({
        full_name,
        official_email,
        department,
        designation,
        employee_id,
        purpose,
        role,
        submitted_at,
        status: "pending_verification",
        verified: false,
        reports_to_officer_id,
        reports_to_officer_name,
      })
      .select("id")
      .maybeSingle();

    if (insErr) {
      return new Response(
        JSON.stringify({ ok: false, error: insErr.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const request_id = inserted?.id;

    const safeRedirectTo = redirect_to.length > 0 ? redirect_to : undefined;

    let user_id: string | null = null;
    let invited = false;

    const { data: existing, error: existingErr } = await admin.auth.admin.getUserByEmail(official_email);
    if (existingErr) {
      return new Response(
        JSON.stringify({ ok: false, error: existingErr.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (existing?.user?.id) {
      user_id = existing.user.id;
    } else {
      const { data: inviteData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(official_email, {
        ...(safeRedirectTo ? { redirectTo: safeRedirectTo } : {}),
        data: {
          requested_role: role,
          full_name,
          department,
        },
      });

      if (inviteErr) {
        return new Response(
          JSON.stringify({ ok: false, error: inviteErr.message }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      user_id = inviteData?.user?.id ?? null;
      invited = true;
    }

    // Profile will be created on approval, not on submit
    // Just link the request to the user id if we have it
    if (request_id != null && user_id) {
      const { error: updErr } = await admin
        .from("access_requests")
        .update({ requester_user_id: user_id })
        .eq("id", request_id);

      if (updErr) {
        // Non-fatal: log but continue
        console.error("Failed to link request to user:", updErr.message);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, request_id, user_id, invited }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

export {};
