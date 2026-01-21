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
    include: ['react', 'react-dom', 'react-router-dom', 'recharts', 'date-fns'],
    // Force re-bundling to fix content length mismatch errors
    force: true,
    // Reduce concurrent pre-bundling to prevent timeouts
    esbuildOptions: {
      target: 'esnext',
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Optimize code splitting for better performance
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules')) {
            // React and core libraries
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            // Radix UI components (large library)
            if (id.includes('@radix-ui')) {
              return 'vendor-radix';
            }
            // Chart library (recharts is heavy)
            if (id.includes('recharts')) {
              return 'vendor-charts';
            }
            // Date utilities
            if (id.includes('date-fns')) {
              return 'vendor-dates';
            }
            // Form libraries
            if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod')) {
              return 'vendor-forms';
            }
            // Query library
            if (id.includes('@tanstack/react-query')) {
              return 'vendor-query';
            }
            // Other vendor libraries
            return 'vendor-other';
          }
          // Split large page components
          if (id.includes('/pages/admin/')) {
            return 'pages-admin';
          }
          if (id.includes('/pages/consultant/')) {
            return 'pages-consultant';
          }
          if (id.includes('/pages/calculators/')) {
            return 'pages-calculators';
          }
        },
        // Optimize chunk file names
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    // Improve chunking for large files
    target: 'esnext',
    minify: 'esbuild',
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Optimize asset inlining threshold (inline small assets)
    assetsInlineLimit: 4096, // 4kb
    // Source maps for production (can disable for smaller bundles)
    sourcemap: false,
  },
  // Improve dev server stability
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
}));
