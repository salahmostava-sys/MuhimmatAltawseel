const { createClient } = require('@supabase/supabase-js');
const aiTools = require('./_aiTools');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    '[api/_lib] Missing required Supabase environment variables. ' +
    'Set SUPABASE_URL and SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY) in your Vercel project settings.'
  );
}

function getCallerClient(authHeader) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
}

function getAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

async function requireAuth(req, res) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    res.status(401).json({ error: 'No authorization header' });
    return null;
  }
  const callerClient = getCallerClient(authHeader);
  const { data: { user }, error } = await callerClient.auth.getUser();
  if (error || !user) {
    res.status(401).json({ error: 'Not authenticated' });
    return null;
  }
  return { user, callerClient };
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
}

function ensurePostRequest(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return false;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return false;
  }
  return true;
}

function getErrorMessage(err) {
  return err instanceof Error ? err.message : String(err);
}

const isUuid = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const isValidMonth = (v) => /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
const VALID_ROLES = new Set(['admin', 'hr', 'finance', 'operations', 'viewer']);
const logError = (msg, meta = {}) => console.error(JSON.stringify({ level: 'error', message: msg, ...meta, ts: new Date().toISOString() }));
const logInfo = (msg, meta = {}) => console.log(JSON.stringify({ level: 'info', message: msg, ...meta, ts: new Date().toISOString() }));

module.exports = {
  getCallerClient, getAdminClient, requireAuth, setCors,
  ensurePostRequest, getErrorMessage,
  isUuid, isValidMonth, VALID_ROLES, logError, logInfo,
  SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  GROQ_BASE_URL: 'https://api.groq.com/openai/v1',
  DEFAULT_GROQ_MODEL: process.env.GROQ_MODEL || 'llama3-8b-8192',
  ...aiTools,
};
