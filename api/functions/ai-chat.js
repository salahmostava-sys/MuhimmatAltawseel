const {
  requireAuth, ensurePostRequest, getErrorMessage, logError,
  GROQ_API_KEY, GROQ_BASE_URL,
  AI_CHAT_TOOLS, AI_CHAT_SYSTEM_PROMPT, executeAiTool, callGroqChat,
} = require('../_lib');

module.exports = async function handler(req, res) {
  if (!ensurePostRequest(req, res)) return;

  const requestId = crypto.randomUUID();
  try {
    if (!GROQ_API_KEY) return res.status(500).json({ error: 'GROQ_API_KEY not configured' });

    const auth = await requireAuth(req, res);
    if (!auth) return;
    const { callerClient } = auth;

    let userRole = null;
    try { const { data: role } = await callerClient.rpc('get_my_role'); userRole = role ?? null; } catch { /* non-blocking */ }

    const { messages: clientMessages } = req.body;
    if (!Array.isArray(clientMessages) || clientMessages.length === 0) {
      return res.status(400).json({ error: 'messages array required' });
    }

    const conversation = [
      { role: 'system', content: AI_CHAT_SYSTEM_PROMPT },
      ...clientMessages.map(m => ({ role: m.role, content: m.content })),
    ];

    const responseMessage = await callGroqChat(GROQ_API_KEY, GROQ_BASE_URL, conversation, AI_CHAT_TOOLS);

    if (responseMessage.tool_calls?.length > 0) {
      conversation.push(responseMessage);
      for (const toolCall of responseMessage.tool_calls) {
        let fnArgs = {};
        try { fnArgs = JSON.parse(toolCall.function.arguments || '{}'); } catch { /* ignore parse errors */ }
        let result = {};
        try { result = await executeAiTool(callerClient, userRole, toolCall.function.name, fnArgs); }
        catch (e) { result = { error: `Tool error: ${e.message}` }; }
        conversation.push({ role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(result) });
      }
      const finalResponse = await callGroqChat(GROQ_API_KEY, GROQ_BASE_URL, conversation);
      return res.json({ message: finalResponse.content ?? '' });
    }

    return res.json({ message: responseMessage.content ?? '' });
  } catch (e) {
    const message = getErrorMessage(e);
    logError('[ai-chat] error', { request_id: requestId, error: message });
    return res.status(500).json({ error: message || 'Internal server error' });
  }
};
