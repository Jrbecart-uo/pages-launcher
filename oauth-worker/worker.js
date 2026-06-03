/**
 * Pages Launcher — GitHub OAuth token-exchange worker (Cloudflare Workers).
 *
 * The static page (index.html) can't hold the OAuth client secret, so this tiny
 * worker performs the one server-side step: trade the temporary ?code= that
 * GitHub hands back for a real access token. Nothing else lives here.
 *
 * Endpoints:
 *   POST /exchange   { "code": "..." }  ->  { "access_token": "...", "scope": "...", "token_type": "..." }
 *   GET  /           health check
 *
 * Secrets / vars (set with wrangler — see wrangler.toml):
 *   GITHUB_CLIENT_ID       OAuth App client ID      (var, public)
 *   GITHUB_CLIENT_SECRET   OAuth App client secret  (secret, NEVER commit)
 *   ALLOWED_ORIGINS        comma-separated allowlist of page origins (var)
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const allow = parseOrigins(env.ALLOWED_ORIGINS);
    const allowed = allow.length === 0 || allow.includes(origin);
    const cors = corsHeaders(allowed ? origin : "null");

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (url.pathname === "/exchange" && request.method === "POST") {
      if (!allowed) return json({ error: "origin_not_allowed" }, 403, cors);

      let code;
      try { ({ code } = await request.json()); }
      catch { return json({ error: "invalid_json" }, 400, cors); }
      if (!code) return json({ error: "missing_code" }, 400, cors);

      const ghRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });
      const data = await ghRes.json();

      if (data.error) {
        return json({ error: data.error_description || data.error }, 400, cors);
      }
      return json({
        access_token: data.access_token,
        token_type: data.token_type,
        scope: data.scope,
      }, 200, cors);
    }

    // health check
    return new Response("Pages Launcher OAuth worker — POST /exchange", {
      status: 200,
      headers: { ...cors, "Content-Type": "text/plain" },
    });
  },
};

function parseOrigins(v) {
  return (v || "").split(",").map(s => s.trim()).filter(Boolean);
}
function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}
function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
