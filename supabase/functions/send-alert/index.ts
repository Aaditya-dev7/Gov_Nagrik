/// <reference path="../types.d.ts" />
// supabase/functions/send-alert/index.ts
// Edge Function to email alerts when a new High/Urgent report is created
// Configure secrets:
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
  const corsHeaders = getCorsHeaders(req);
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

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
    if (!API) return new Response(JSON.stringify({ error: "Missing SENDGRID_API_KEY" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

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

    return new Response(JSON.stringify({ status: res.status }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

export {};
