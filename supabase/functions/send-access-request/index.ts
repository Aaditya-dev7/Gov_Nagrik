/// <reference path="../types.d.ts" />
// supabase/functions/send-access-request/index.ts
// Edge Function to email admin and user when an access request is submitted
// Uses SendGrid HTTP API. Configure secrets in Supabase:
//  - SENDGRID_API_KEY
//  - FROM_EMAIL (e.g., noreply@yourdomain)
//  - FROM_NAME  (e.g., NagrikGPT)

const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get("origin") ?? "*";
  const reqHeaders = req.headers.get("access-control-request-headers") ?? "authorization, x-client-info, apikey, content-type";
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
  try {
    const corsHeaders = getCorsHeaders(req);
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }
    const body = await req.json();
    const {
      admin_to_email,
      admin_to_emails,
      user_to_email,
      full_name,
      official_email,
      department,
      designation,
      employee_id,
      purpose,
      role,
      submitted_at,
      set_password_link,
    } = body as Record<string, any>;

    const API = Deno.env.get("SENDGRID_API_KEY");
    const FROM = Deno.env.get("FROM_EMAIL") ?? "noreply@yourdomain";
    const FROM_NAME = Deno.env.get("FROM_NAME") ?? "NagrikGPT";

    if (!API) {
      return new Response(JSON.stringify({ error: "Missing SENDGRID_API_KEY" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const send = async (to: string, subject: string, html: string) =>
      fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: FROM, name: FROM_NAME },
          subject,
          content: [{ type: "text/html", value: html }],
        }),
      });

    // Admin notifications (support single or multiple)
    const adminList: string[] = Array.isArray(admin_to_emails) && admin_to_emails.length
      ? admin_to_emails
      : (admin_to_email ? [String(admin_to_email)] : []);

    const adminHtml = `<p><b>Name:</b> ${full_name}<br/>
         <b>Email:</b> ${official_email}<br/>
         <b>Dept:</b> ${department}<br/>
         <b>Designation:</b> ${designation}<br/>
         <b>Employee ID:</b> ${employee_id || "N/A"}<br/>
         <b>Role:</b> ${role}<br/>
         <b>Submitted:</b> ${submitted_at}<br/>
         <b>Purpose:</b> ${purpose}</p>`;

    const results: Array<{ to: string; type: string; status?: number; body?: string; error?: string }> = [];

    for (const to of adminList) {
      try {
        const res = await send(to, `New access request: ${full_name}`, adminHtml);
        const status = res.status;
        const body = status !== 202 ? await res.text() : "";
        results.push({ to, type: "admin", status, ...(body ? { body } : {}) });
      } catch (err) {
        results.push({ to, type: "admin", error: String(err) });
      }
    }

    // User confirmation
    try {
      const res = await send(
        user_to_email,
        "Your access request was received",
        `<p>Hi ${full_name},<br/>
           Your request was received. Set your password here:<br/>
           <a href="${set_password_link}">${set_password_link}</a></p>`
      );
      const status = res.status;
      const body = status !== 202 ? await res.text() : "";
      results.push({ to: user_to_email, type: "user", status, ...(body ? { body } : {}) });
    } catch (err) {
      results.push({ to: user_to_email, type: "user", error: String(err) });
    }

    try { console.log("send-access-request results", results); } catch {}

    return new Response(JSON.stringify({ ok: true, results }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    // Never fail the client. Log only in function logs.
    const corsHeaders = getCorsHeaders(req);
    return new Response(JSON.stringify({ error: String(e) }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

export {};
