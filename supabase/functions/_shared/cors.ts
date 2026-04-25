/**
 * Shared CORS configuration for Supabase Edge Functions.
 * 
 * IMPORTANT: In production, set CORS_ALLOWED_ORIGINS environment variable
 * to your specific domains (e.g., "https://muhimat.vercel.app,https://admin.muhimat.com")
 * 
 * Default allows common local development ports.
 */

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5000",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5000",
];

function getAllowedOrigins(): string[] {
  const envOrigins = Deno.env.get("CORS_ALLOWED_ORIGINS");
  if (envOrigins) {
    return envOrigins.split(",").map(o => o.trim()).filter(Boolean);
  }
  return DEFAULT_ALLOWED_ORIGINS;
}

function isOriginAllowed(origin: string): boolean {
  const allowed = getAllowedOrigins();
  // In production, require exact match
  if (Deno.env.get("SUPABASE_ENV") === "production") {
    return allowed.includes(origin);
  }
  // In development, allow localhost patterns
  if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
    return true;
  }
  return allowed.includes(origin);
}

export function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const allowedOrigins = getAllowedOrigins();
  
  // Only reflect the origin if it's allowed
  const origin = requestOrigin && isOriginAllowed(requestOrigin) 
    ? requestOrigin 
    : allowedOrigins[0] || "http://localhost:5173";

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-requested-with",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Max-Age": "600",
    "Access-Control-Allow-Credentials": "true",
  };
}

export function handleCorsPreflight(requestOrigin: string | null): Response {
  const headers = getCorsHeaders(requestOrigin);
  return new Response("ok", { 
    headers,
    status: 200 
  });
}

// Re-export for backward compatibility during migration
export const corsHeaders = getCorsHeaders(null);
