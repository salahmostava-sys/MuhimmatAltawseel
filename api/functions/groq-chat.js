const { requireAuth, ensurePostRequest, getErrorMessage, logError, logInfo, GROQ_API_KEY, GROQ_BASE_URL, DEFAULT_GROQ_MODEL } = require('../_lib');

module.exports = async function handler(req, res) {
  if (!ensurePostRequest(req, res)) return;

  const requestId = crypto.randomUUID();
  try {
    if (!GROQ_API_KEY) {
      logError('GROQ_API_KEY not configured', { request_id: requestId });
      return res.status(500).json({ error: 'AI service is not configured on the server' });
    }

    const auth = await requireAuth(req, res);
    if (!auth) return;
    const { user: callerUser } = auth;

    const { messages, model, temperature, max_tokens } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages must be a non-empty array' });
    }

    logInfo('groq-chat request accepted', { request_id: requestId, user_id: callerUser.id, message_count: messages.length });

    const groqResponse = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: typeof model === 'string' ? model : DEFAULT_GROQ_MODEL,
        messages,
        temperature: typeof temperature === 'number' ? temperature : 0.7,
        max_tokens: typeof max_tokens === 'number' ? max_tokens : 1024,
        stream: false,
      }),
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      logError('Groq API error', { request_id: requestId, status: groqResponse.status, body: errText });
      return res.status(502).json({ error: `AI service error (${groqResponse.status})` });
    }

    const data = await groqResponse.json();
    const message = data.choices?.[0]?.message?.content ?? '';
    return res.json({ message });
  } catch (err) {
    const message = getErrorMessage(err);
    logError('groq-chat unhandled error', { request_id: requestId, error: message });
    return res.status(500).json({ error: 'Internal server error' });
  }
};
