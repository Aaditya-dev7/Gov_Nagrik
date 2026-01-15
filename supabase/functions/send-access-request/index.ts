/// <reference path="../types.d.ts" />

/**
 * Supabase Edge Function: send-access-request
 * Sends email to admins + confirmation to user using SendGrid
 *
 * REQUIRED SECRETS (Supabase Vault):
 *  - SENDGRID_API_KEY
 *  - FROM_EMAIL   (must be a VERIFIED SendGrid Single Sender)
 *  - FROM_NAME
 */

const corsHeaders = (req: Request) => ({
  "Access-Control-Allow-Origin": req.headers.get("origin") ?? "*",
  "Access-Control-Allow-Headers":
    req.headers.get("access-control-request-headers") ??
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Max-Age": "86400",
});

Deno.serve(async (req: Request) => {
  const headers = corsHeaders(req);

  // ✅ CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  try {
    // ✅ Read secrets (NO fallback)
    const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
    const FROM_EMAIL = Deno.env.get("FROM_EMAIL");
    const FROM_NAME = Deno.env.get("FROM_NAME") ?? "NagrikGPT";

    console.log("FROM_EMAIL USED BY FUNCTION:", FROM_EMAIL);

    if (!SENDGRID_API_KEY) {
      throw new Error("SENDGRID_API_KEY is not set in Supabase Vault");
    }
    if (!FROM_EMAIL) {
      throw new Error("FROM_EMAIL is not set in Supabase Vault");
    }

    // ✅ Parse request body
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
    } = await req.json();

    // ✅ SendGrid helper
    const sendEmail = async (to: string, subject: string, html: string) => {
      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: FROM_EMAIL, name: FROM_NAME },
          subject,
          content: [{ type: "text/html", value: html }],
        }),
      });

      return {
        status: res.status,
        body: res.status !== 202 ? await res.text() : undefined,
      };
    };

    // ✅ Admin email list
    const adminList: string[] =
      Array.isArray(admin_to_emails) && admin_to_emails.length
        ? admin_to_emails
        : admin_to_email
        ? [admin_to_email]
        : [];

    const adminHtml = `
      <p>
        <b>Name:</b> ${full_name}<br/>
        <b>Email:</b> ${official_email}<br/>
        <b>Department:</b> ${department}<br/>
        <b>Designation:</b> ${designation}<br/>
        <b>Employee ID:</b> ${employee_id || "N/A"}<br/>
        <b>Role:</b> ${role}<br/>
        <b>Submitted:</b> ${submitted_at}<br/>
        <b>Purpose:</b> ${purpose}
      </p>
    `;

    const results: any[] = [];

    // ✅ Send to admins
    for (const admin of adminList) {
      const res = await sendEmail(
        admin,
        `New access request: ${full_name}`,
        adminHtml
      );
      results.push({ to: admin, type: "admin", ...res });
    }

    // ✅ Send confirmation to user
    if (user_to_email) {
      const res = await sendEmail(
        user_to_email,
        "Your access request was received",
        `
          <p>
            Hi ${full_name},<br/><br/>
            Your request was successfully submitted.<br/><br/>
            Set your password here:<br/>
            <a href="${set_password_link}">
              ${set_password_link}
            </a>
          </p>
        `
      );
      results.push({ to: user_to_email, type: "user", ...res });
    }

    console.log("send-access-request results:", results);

    return new Response(
      JSON.stringify({ ok: true, results }),
      {
        status: 200,
        headers: { ...headers, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("send-access-request ERROR:", err);

    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      }
    );
  }
});

export {};
