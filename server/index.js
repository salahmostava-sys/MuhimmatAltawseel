import express from 'express';
import cors from 'cors';
import { salaryEngineHandler, adminUpdateUserHandler, groqChatHandler, aiChatHandler } from './lib/handlers.js';

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const AI_INTERNAL_KEY = process.env.AI_INTERNAL_KEY;

// Allowed CORS origins — comma-separated list via env var
const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5000,http://localhost:3000'
)
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server calls (no Origin header) and listed origins
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin '${origin}' not in ALLOWED_ORIGINS`));
  },
  credentials: true,
  allowedHeaders: ['Authorization', 'Content-Type', 'x-client-info', 'apikey'],
}));
app.use(express.json({ limit: '2mb' }));

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ── Salary Engine (replaces salary-engine edge function) ─────────────────────
app.post('/api/functions/salary-engine', salaryEngineHandler);

// ── Admin Update User (replaces admin-update-user edge function) ──────────────
app.post('/api/functions/admin-update-user', adminUpdateUserHandler);

// ── Groq Chat (replaces groq-chat edge function) ──────────────────────────────
app.post('/api/functions/groq-chat', groqChatHandler);

// ── AI Chat (replaces ai-chat edge function) ──────────────────────────────────
app.post('/api/functions/ai-chat', aiChatHandler);

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// ── Startup checks ────────────────────────────────────────────────────────────
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[server] FATAL: SUPABASE_URL and SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY) must be set.');
  process.exit(1);
}
if (IS_PRODUCTION && !AI_INTERNAL_KEY) {
  console.error('[server] FATAL: AI_INTERNAL_KEY must be set in production.');
  console.error('[server] Generate one with: openssl rand -hex 32');
  process.exit(1);
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] Muhimmat API server running on port ${PORT}`);
  console.log(`[server] CORS allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
  if (!SUPABASE_SERVICE_ROLE_KEY) console.warn('[server] WARNING: SUPABASE_SERVICE_ROLE_KEY not set — admin actions will fail');
  if (!process.env.GROQ_API_KEY) console.warn('[server] WARNING: GROQ_API_KEY not set — AI features disabled');
  if (!AI_INTERNAL_KEY) console.warn('[server] WARNING: AI_INTERNAL_KEY not set — set in production via env');
});
