import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/index.css";
import { ErrorBoundary } from "@shared/components/ErrorBoundary";
import { installGlobalErrorMonitoring } from "@shared/lib/logger";
import { isLikelyStaleChunkReason, reloadOnceForStaleChunk } from "@shared/lib/chunkLoadRecovery";

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    // Setting this option to true will send default PII data to Sentry.
    // For example, automatic IP address collection on events
    sendDefaultPii: false,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // This app renders employee, salary, and banking data in the DOM.
        // Keep Replay masked by default unless a future screen is explicitly unmasked.
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 0,
    environment: import.meta.env.MODE,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1,
  });
}

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
