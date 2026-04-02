import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "../src/styles/index.css";
import { ErrorBoundary } from "@shared/components/ErrorBoundary";
import { installGlobalErrorMonitoring } from "@shared/lib/logger";
import { isLikelyStaleChunkReason, reloadOnceForStaleChunk } from "@shared/lib/chunkLoadRecovery";

Sentry.init({
  dsn: "https://5aff3d20b4886b8ce4d0e1160740dac6@o4511125432107008.ingest.de.sentry.io/4511125438857296",
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
  integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
  tracesSampleRate: 1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
});

const SentryFallback = () => (
  <div dir="rtl" className="min-h-screen w-full bg-background px-4">
    <div className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center">
      <div className="w-full rounded-2xl border border-border bg-card p-6 text-center shadow-card">
        <p className="text-base font-semibold text-foreground">
          عذراً، حدث خطأ غير متوقع. تم إرسال تقرير للمطورين جاري العمل على حله.
        </p>
        <button
          type="button"
          onClick={() => globalThis.location.reload()}
          className="mt-5 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          تحديث الصفحة
        </button>
      </div>
    </div>
  </div>
);

globalThis.addEventListener("vite:preloadError", () => {
  reloadOnceForStaleChunk();
});

globalThis.addEventListener("unhandledrejection", (event) => {
  if (isLikelyStaleChunkReason(event.reason)) {
    event.preventDefault();
    reloadOnceForStaleChunk();
  }
});

globalThis.addEventListener(
  "error",
  (event) => {
    const msg = event.message || "";
    if (msg && isLikelyStaleChunkReason(msg)) {
      event.preventDefault();
      reloadOnceForStaleChunk();
    }
  },
  true,
);

installGlobalErrorMonitoring();

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <ErrorBoundary>
    <Sentry.ErrorBoundary fallback={<SentryFallback />}>
      <App />
    </Sentry.ErrorBoundary>
  </ErrorBoundary>
);
