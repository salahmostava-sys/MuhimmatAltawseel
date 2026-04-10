import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': '"test"',
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [path.resolve(__dirname, "./vitest.setup.ts")],
    include: [
      "app/**/*.{test,spec}.{ts,tsx}",
      "modules/**/*.{test,spec}.{ts,tsx}",
      "shared/**/*.{test,spec}.{ts,tsx}",
      "services/**/*.{test,spec}.{ts,tsx}",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary", "lcov"],
      reportsDirectory: "./coverage",
      include: [
        "app/**/*.{ts,tsx}",
        "modules/**/*.{ts,tsx}",
        "shared/**/*.{ts,tsx}",
        "services/**/*.{ts,tsx}",
      ],
      exclude: [
        "**/*.test.{ts,tsx}",
        "**/*.spec.{ts,tsx}",
        "shared/test/**",
        "services/supabase/types.ts",
        "app/main.tsx",
        "app/vite-env.d.ts",
        "**/components/ui/**",
        "**/pages/**",
        "**/providers/**",
        "**/layout/**",
        "shared/types/**",
        "**/*.types.ts",
        "app/App.tsx",
        "app/components/**",
        "app/i18n/**",
        "modules/ai-dashboard/**",
      ],
      /** في CI مع Sonar نولّد lcov دون إيقاف السير بسبب العتبات المنخفضة حالياً */
      thresholds: process.env.SONAR_CI
        ? undefined
        : {
            lines: 2,
            functions: 12,
            branches: 20,
            statements: 2,
          },
    },
  },
  resolve: {
    alias: {
      "@app": path.resolve(__dirname, "./app"),
      "@services": path.resolve(__dirname, "./services"),
      "@modules": path.resolve(__dirname, "./modules"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
});
