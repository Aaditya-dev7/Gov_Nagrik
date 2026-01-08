/// <reference path="../types.d.ts" />
// supabase/functions/send-alert/index.ts
// Edge Function to email alerts when a new High/Urgent report is created
// Configure secrets:
//  - SENDGRID_API_KEY
//  - FROM_EMAIL (e.g., noreply@yourdomain)
//  - FROM_NAME  (e.g., NagrikGPT)

Deno.serve(async (req: Request) => {
  try {
    const {
      to_email,
      report_id,
      priority,
      category,
      location_text,
      description,
      submitted_at,
    } = await req.json();

    const API = Deno.env.get("SENDGRID_API_KEY");
    const FROM = Deno.env.get("FROM_EMAIL") ?? "noreply@yourdomain";
    const FROM_NAME = Deno.env.get("FROM_NAME") ?? "NagrikGPT";
    if (!API) return new Response("Missing SENDGRID_API_KEY", { status: 200 });

    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to_email }] }],
        from: { email: FROM, name: FROM_NAME },
        subject: `[${priority}] New report ${report_id}`,
        content: [
          {
            type: "text/html",
            value: `<p><b>Report:</b> ${report_id}<br/>
                    <b>Priority:</b> ${priority}<br/>
                    <b>Category:</b> ${category}<br/>
                    <b>Location:</b> ${location_text}<br/>
                    <b>When:</b> ${submitted_at}<br/>
                    <b>Description:</b> ${description}</p>`,
          },
        ],
      }),
    });

    return new Response(String(res.status), { status: 200 });
  } catch (e) {
    return new Response(`ERR ${e}`, { status: 200 });
  }
});

export {};
