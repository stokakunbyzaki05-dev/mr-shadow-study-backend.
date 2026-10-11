
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === "/" && request.method === "GET") {
      return json({
        status: "online",
        name: "MR.SHADOW Study AI",
        endpoint: "/api/chat"
      });
    }

    if (url.pathname !== "/api/chat" || request.method !== "POST") {
      return json({ error: "Endpoint tidak ditemukan" }, 404);
    }

    if (!env.OPENROUTER_API_KEY) {
      return json({ error: "API key belum dikonfigurasi di Cloudflare" }, 500);
    }

    try {
      const body = await request.json();
      const messages = body.messages;

      if (!Array.isArray(messages) || messages.length === 0) {
        return json({
          error: "Kirim percakapan dalam format messages berupa array"
        }, 400);
      }

      const upstream = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": url.origin,
            "X-Title": "MR.SHADOW Study AI"
          },
          body: JSON.stringify({
            model: env.OPENROUTER_MODEL || "openrouter/free",
            messages
          })
        }
      );

      const result = await upstream.json();

      if (!upstream.ok) {
        return json({
          error: "OpenRouter gagal memproses permintaan",
          details: result.error?.message || "Terjadi kesalahan pada layanan AI"
        }, upstream.status >= 400 && upstream.status < 600
          ? upstream.status
          : 502);
      }

      return json(result);
    } catch (error) {
      return json({
        error: "Permintaan gagal diproses",
        details: "Pastikan body permintaan berupa JSON yang valid"
      }, 400);
    }
  }
};
    
