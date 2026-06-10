const MAX_TEXT = 1200;
const ALLOWED_ORIGINS = new Set([
  "https://uskoritel-web.github.io",
  "https://komplectaciapublish.vercel.app"
]);

module.exports = async function handler(req, res) {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return res.status(500).json({ ok: false, error: "Feedback endpoint is not configured" });
  }

  const body = typeof req.body === "object" && req.body ? req.body : {};
  const payload = normalizePayload(body);

  if (!payload.event || !payload.title) {
    return res.status(400).json({ ok: false, error: "Invalid payload" });
  }

  const text = formatMessage(payload, req);
  const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true
    })
  });

  const telegramPayload = await telegramResponse.json();
  if (!telegramPayload.ok) {
    return res.status(502).json({ ok: false, error: "Telegram send failed" });
  }

  return res.status(200).json({ ok: true });
};

function setCors(req, res) {
  const origin = req.headers.origin || "";
  if (ALLOWED_ORIGINS.has(origin) || origin.endsWith(".vercel.app")) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function normalizePayload(body) {
  return {
    event: clip(body.event),
    section: clip(body.section),
    title: clip(body.title),
    value: clip(body.value),
    comment: clip(body.comment, MAX_TEXT),
    partnerName: clip(body.partnerName),
    pilotReady: clip(body.pilotReady),
    riskComment: clip(body.riskComment, MAX_TEXT),
    sessionId: clip(body.sessionId),
    pageUrl: clip(body.pageUrl)
  };
}

function clip(value, limit = 300) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, limit);
}

function formatMessage(payload, req) {
  const lines = [
    "Новая обратная связь по Контур Комплектации",
    "",
    `Тип: ${payload.event}`,
    `Блок: ${payload.title}`,
    payload.value ? `Ответ: ${payload.value}` : "",
    payload.comment ? `Комментарий: ${payload.comment}` : "",
    payload.partnerName ? `Имя / город: ${payload.partnerName}` : "",
    payload.pilotReady ? `Пилот: ${payload.pilotReady}` : "",
    payload.riskComment ? `Риски: ${payload.riskComment}` : "",
    payload.sessionId ? `Сессия: ${payload.sessionId}` : "",
    `Время: ${new Date().toISOString()}`,
    payload.pageUrl ? `Страница: ${payload.pageUrl}` : "",
    req.headers["x-forwarded-for"] ? `IP: ${String(req.headers["x-forwarded-for"]).split(",")[0]}` : ""
  ];

  return lines.filter(Boolean).join("\n");
}
