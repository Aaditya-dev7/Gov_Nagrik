/// <reference path="../types.d.ts" />
// supabase/functions/send-access-request/index.ts
// Edge Function to email admin and user when an access request is submitted
// Uses SendGrid HTTP API. Configure secrets in Supabase:
//  - SENDGRID_API_KEY
//  - FROM_EMAIL (e.g., noreply@yourdomain)
//  - FROM_NAME  (e.g., NagrikGPT)

Deno.serve(async (req: Request) => {
  try {
    const {
      admin_to_email,
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

    const API = Deno.env.get("SENDGRID_API_KEY");
    const FROM = Deno.env.get("FROM_EMAIL") ?? "noreply@yourdomain";
    const FROM_NAME = Deno.env.get("FROM_NAME") ?? "NagrikGPT";

    if (!API) {
      return new Response("Missing SENDGRID_API_KEY", { status: 200 });
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

    // Admin notification
    await send(
      admin_to_email,
      `New access request: ${full_name}`,
      `<p><b>Name:</b> ${full_name}<br/>
         <b>Email:</b> ${official_email}<br/>
         <b>Dept:</b> ${department}<br/>
         <b>Designation:</b> ${designation}<br/>
         <b>Employee ID:</b> ${employee_id || "N/A"}<br/>
         <b>Role:</b> ${role}<br/>
         <b>Submitted:</b> ${submitted_at}<br/>
         <b>Purpose:</b> ${purpose}</p>`
    );

    // User confirmation
    await send(
      user_to_email,
      "Your access request was received",
      `<p>Hi ${full_name},<br/>
         Your request was received. Set your password here:<br/>
         <a href="${set_password_link}">${set_password_link}</a></p>`
    );

    return new Response("OK", { status: 200 });
  } catch (e) {
    // Never fail the client. Log only in function logs.
    return new Response(`ERR ${e}`, { status: 200 });
  }
});

export {};
