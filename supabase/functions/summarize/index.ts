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

    const { text, image_url } = await req.json().catch(() => ({ text: "", image_url: "" }));
    const cleanText = typeof text === "string" ? text : "";
    const cleanImageUrl = typeof image_url === 'string' ? image_url : '';

    const SUMMARIZER_URL = Deno.env.get("SUMMARIZER_URL");
    if (!SUMMARIZER_URL) {
      console.error("Missing SUMMARIZER_URL environment variable");
      return new Response(
        JSON.stringify({ ok: false, error: "Missing SUMMARIZER_URL" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("Calling upstream:", `${SUMMARIZER_URL.replace(/\/$/, "")}/summarize`);
    
    const upstream = await fetch(`${SUMMARIZER_URL.replace(/\/$/, "")}/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ text: cleanText, image_url: cleanImageUrl }),
    });

    console.log("Upstream status:", upstream.status);

    if (!upstream.ok) {
      const errorText = await upstream.text().catch(() => "");
      console.error("Upstream error:", errorText);
      return new Response(
        JSON.stringify({ ok: false, error: "Failed to validate report. Please try again." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await upstream.json().catch(() => null) as any;
    console.log("Upstream data:", JSON.stringify(data));
    
    if (!data) {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid response from validation service." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Forward all fields from the upstream response
    return new Response(
      JSON.stringify({
        ok: data.ok ?? true,
        summary: data.summary ?? "",
        category: data.category,
        location: data.location,
        report_score: data.report_score,
        status: data.status,
        ...(data.error ? { error: data.error } : {}),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("Edge function error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: "Service temporarily unavailable. Please try again." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

export {};
