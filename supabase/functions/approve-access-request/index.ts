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

    const APPROVAL_TOKEN = Deno.env.get("APPROVAL_TOKEN");

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

    let request_id: unknown = null;
    let redirect_to: unknown = null;
    let action: unknown = null;
    let token: unknown = null;

    if (req.method === 'GET') {
      const url = new URL(req.url);
      request_id = url.searchParams.get('request_id');
      redirect_to = url.searchParams.get('redirect_to');
      action = url.searchParams.get('action');
      token = url.searchParams.get('token');
    } else {
      const body = await req.json().catch(() => ({}));
      request_id = (body as any)?.request_id;
      redirect_to = (body as any)?.redirect_to;
      action = (body as any)?.action;
      token = (body as any)?.token;
    }

    if (APPROVAL_TOKEN) {
      const supplied = typeof token === 'string' ? token : '';
      if (!supplied || supplied !== APPROVAL_TOKEN) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Unauthorized' }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const rid = typeof request_id === 'number' ? request_id : Number(request_id);
    if (!rid || Number.isNaN(rid)) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing/invalid request_id" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const safeRedirectTo = typeof redirect_to === 'string' && redirect_to.trim().length > 0
      ? redirect_to.trim()
      : undefined;

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: reqRow, error: reqErr } = await admin
      .from('access_requests')
      .select('id, full_name, official_email, department, designation, employee_id, purpose, role, status')
      .eq('id', rid)
      .maybeSingle();

    if (reqErr) {
      return new Response(
        JSON.stringify({ ok: false, error: reqErr.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!reqRow) {
      return new Response(
        JSON.stringify({ ok: false, error: "Request not found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const act = typeof action === 'string' ? action.trim().toLowerCase() : 'approve';
    if (act === 'reject') {
      const { error: rejErr } = await admin
        .from('access_requests')
        .update({
          status: 'rejected',
          verified: false,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', rid);

      if (rejErr) {
        return new Response(
          JSON.stringify({ ok: false, error: rejErr.message }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ ok: true, rejected: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (reqRow.status === 'approved') {
      return new Response(
        JSON.stringify({ ok: true, alreadyApproved: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const email = String(reqRow.official_email || '').trim().toLowerCase();
    if (!email) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing official_email on request" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const requestedRole = String(reqRow.role || '').trim().toLowerCase();
    if (requestedRole !== 'officer' && requestedRole !== 'admin') {
      return new Response(
        JSON.stringify({ ok: false, error: `Invalid role on request: ${requestedRole}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: inviteData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      ...(safeRedirectTo ? { redirectTo: safeRedirectTo } : {}),
      data: {
        role: requestedRole,
        full_name: reqRow.full_name,
        department: reqRow.department,
      },
    });

    if (inviteErr) {
      return new Response(
        JSON.stringify({ ok: false, error: inviteErr.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userId = inviteData?.user?.id;
    if (!userId) {
      return new Response(
        JSON.stringify({ ok: false, error: "Invite succeeded but no user id returned" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { error: profErr } = await admin
      .from('profiles')
      .upsert({
        id: userId,
        full_name: reqRow.full_name,
        role: requestedRole,
        department: reqRow.department,
      });

    if (profErr) {
      return new Response(
        JSON.stringify({ ok: false, error: profErr.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { error: updErr } = await admin
      .from('access_requests')
      .update({
        status: 'approved',
        verified: true,
        reviewed_at: new Date().toISOString(),
        requester_user_id: userId,
      })
      .eq('id', rid);

    if (updErr) {
      return new Response(
        JSON.stringify({ ok: false, error: updErr.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, invited: true, user_id: userId }),
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
