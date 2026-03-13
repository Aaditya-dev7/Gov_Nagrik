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

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ ok: false, error: 'Method not allowed' }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const SUPABASE_URL = Deno.env.get("PROJECT_URL") || Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY");
    const ADMIN_BOOTSTRAP_TOKEN = Deno.env.get("ADMIN_BOOTSTRAP_TOKEN");

    if (!SUPABASE_URL) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing PROJECT_URL or SUPABASE_URL' }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing SERVICE_ROLE_KEY' }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => ({} as any));
    const token = typeof body?.token === 'string' ? body.token : '';

    if (ADMIN_BOOTSTRAP_TOKEN) {
      if (!token || token !== ADMIN_BOOTSTRAP_TOKEN) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Unauthorized' }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '').trim();
    const full_name = typeof body?.full_name === 'string' ? body.full_name : 'Admin';
    const department = typeof body?.department === 'string' ? body.department : 'All Departments';

    if (!email || !email.includes('@')) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing/invalid email' }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!password || password.length < 8) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Password must be at least 8 characters' }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // If user already exists, do not recreate. We'll just update profile.
    const { data: listData, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listErr) {
      return new Response(
        JSON.stringify({ ok: false, error: listErr.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const existing = (listData?.users || []).find((u: any) => String(u?.email || '').toLowerCase() === email);

    let userId: string | null = existing?.id ?? null;

    if (!userId) {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          role: 'admin',
          department,
          full_name,
        },
      });

      if (createErr) {
        return new Response(
          JSON.stringify({ ok: false, error: createErr.message }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      userId = created?.user?.id ?? null;
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Failed to create/find user id' }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { error: profErr } = await admin.from('profiles').upsert({
      id: userId,
      full_name,
      role: 'admin',
      department,
    });

    if (profErr) {
      return new Response(
        JSON.stringify({ ok: false, error: profErr.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, user_id: userId, existed: Boolean(existing) }),
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
