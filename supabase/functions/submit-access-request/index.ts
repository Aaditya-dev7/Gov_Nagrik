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

    const SUPABASE_URL = Deno.env.get("PROJECT_URL") || Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev";

    if (!SUPABASE_URL) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing PROJECT_URL or SUPABASE_URL" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing SERVICE_ROLE_KEY" }),
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

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
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

    // NOTE: Some Edge runtimes don't expose `getUserByEmail`, so use `listUsers`.
    const { data: listData, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listErr) {
      return new Response(
        JSON.stringify({ ok: false, error: listErr.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const existing = (listData?.users || []).find((u: any) => String(u?.email || '').toLowerCase() === official_email);
    if (existing?.id) {
      user_id = existing.id;
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
        console.error("Invite user error:", inviteErr);
        return new Response(
          JSON.stringify({ ok: false, error: `Failed to invite user: ${inviteErr.message}` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      user_id = inviteData?.user?.id ?? null;
      invited = true;

      // Send welcome email via Resend with set password link
      if (RESEND_API_KEY && user_id) {
        try {
          // Generate magic link for password reset
          const { data: magicLinkData, error: magicError } = await admin.auth.admin.generateLink({
            type: 'recovery',
            email: official_email,
            options: {
              redirectTo: safeRedirectTo || `${SUPABASE_URL}/login`,
            },
          });

          if (!magicError && magicLinkData?.properties?.action_link) {
            const actionLink = magicLinkData.properties.action_link;
            
            // Send email via Resend
            const emailRes = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: FROM_EMAIL,
                to: official_email,
                subject: 'Welcome to NagrikGPT - Set Your Password',
                html: `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #1a56db;">Welcome to NagrikGPT Government Portal</h2>
                    <p>Hello ${full_name},</p>
                    <p>Your ${role} account has been created for the <strong>${department}</strong> department.</p>
                    <p>Please click the button below to set your password and activate your account:</p>
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${actionLink}" 
                         style="background: #1a56db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                        Set Your Password
                      </a>
                    </div>
                    <p style="color: #666; font-size: 14px;">This link will expire in 1 hour. If you didn't request this, please ignore this email.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                    <p style="color: #999; font-size: 12px;">NagrikGPT Government Portal</p>
                  </div>
                `,
              }),
            });

            if (!emailRes.ok) {
              console.error('Resend email error:', await emailRes.text());
            } else {
              console.log('Welcome email sent via Resend to:', official_email);
            }
          }
        } catch (emailErr) {
          console.error('Failed to send welcome email:', emailErr);
          // Don't fail the request if email fails
        }
      }
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
