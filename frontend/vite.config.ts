import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import path from "path";

const isAnalyze = process.env.ANALYZE === 'true';

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 5000,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/ai": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ai/, ""),
        // Inject the shared internal key so the AI backend can verify requests
        // originated from our proxy and not from the public internet.
        headers: {
          "X-Internal-Key": process.env.AI_INTERNAL_KEY ?? "",
        },
      },
    },
  },
  plugins: [
    react(),
    ...(isAnalyze
      ? [
          visualizer({
            open: true,
            gzipSize: true,
            brotliSize: true,
            filename: 'dist/stats.html',
          }),
        ]
      : []),
  ],
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "@app": path.resolve(__dirname, "./app"),
      "@services": path.resolve(__dirname, "./services"),
      "@modules": path.resolve(__dirname, "./modules"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts')) return 'vendor-charts';
            if (id.includes('@e965/xlsx')) return 'vendor-xlsx';
            if (id.includes('html2canvas')) return 'vendor-html2canvas';
            if (id.includes('jspdf') || id.includes('jspdf-autotable')) return 'vendor-jspdf';
            if (id.includes('jszip')) return 'vendor-jszip';
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('@tanstack')) return 'vendor-query';
            if (id.includes('react')) return 'vendor-react';
          }
          return undefined;
        },
      },
    },
  },
});
