import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
      protocol: 'ws',
      host: '167.71.94.65',
      port: 8080,
      clientPort: 8080,
    },
    watch: {
      usePolling: false,
    },
    fs: {
      strict: true,
    },
    // Increase timeout to prevent incomplete chunked encoding errors
    headers: {
      'Cache-Control': 'no-store',
    },
    // Improve connection stability
    cors: true,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    // Reduce concurrent pre-bundling to prevent timeouts
    esbuildOptions: {
      target: 'esnext',
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
    // Improve chunking for large files
    target: 'esnext',
    minify: 'esbuild',
  },
  // Improve dev server stability
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
}));
