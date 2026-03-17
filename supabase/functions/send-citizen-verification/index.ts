/// <reference path="./types.d.ts" />

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

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev";

    const body = await req.json().catch(() => ({}));
    const email = String((body as any)?.email || "").trim().toLowerCase();
    const name = String((body as any)?.name || "").trim();
    const redirectUrl = String((body as any)?.redirect_url || "").trim();

    if (!email || !email.includes("@")) {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid email" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing RESEND_API_KEY" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Send verification email via Resend
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: email,
        subject: 'Welcome to NagrikGPT - Verify Your Email',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a56db;">Welcome to NagrikGPT</h2>
            <p>Hello ${name || 'Citizen'},</p>
            <p>Thank you for registering with NagrikGPT. Please verify your email to complete registration.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${redirectUrl}" 
                 style="background: #1a56db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Verify Email & Login
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">If you didn't register, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">NagrikGPT - Empowering Governance</p>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error('Resend email error:', errText);
      return new Response(
        JSON.stringify({ ok: false, error: `Email failed: ${errText}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, message: "Verification email sent" }),
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
