/**
 * Server-side Council proxy.
 * Credentials come only from the host environment:
 *   SKYCASTLE_LLM_URL  (default https://skycastle.ai/api/capabilities/llm)
 *   SKYCASTLE_LLM_TOKEN (platform-managed; never commit)
 * GitHub Pages has no Node runtime, so this file is unused there.
 */
export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "content-type");
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: true }));
    return;
  }
  const token = process.env.SKYCASTLE_LLM_TOKEN;
  const url = process.env.SKYCASTLE_LLM_URL || "https://skycastle.ai/api/capabilities/llm";
  if (!token) {
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: true }));
    return;
  }
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  const upstream = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ messages: body?.messages ?? [] }),
  });
  const text = await upstream.text();
  res.statusCode = upstream.status;
  res.setHeader("Content-Type", "application/json");
  res.end(text);
}
