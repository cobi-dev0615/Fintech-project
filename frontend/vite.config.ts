import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Conditionally import lovable-tagger only if it's available
function getLovableTagger() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { componentTagger } = require("lovable-tagger");
    return componentTagger;
  } catch (error) {
    // lovable-tagger is optional, continue without it
    return null;
  }
}

// Plugin to block system file requests and handle malformed URIs
function securityMiddleware() {
  return {
    name: 'security-middleware',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Block requests to system paths
        if (
          req.url?.startsWith('/proc/') ||
          req.url?.startsWith('/sys/') ||
          req.url?.startsWith('/dev/') ||
          req.url?.startsWith('/etc/') ||
          req.url?.includes('..') ||
          req.url?.includes('environ')
        ) {
          res.writeHead(403, { 'Content-Type': 'text/plain' });
          res.end('Forbidden: Access to system files is not allowed');
          return;
        }
        
        // Validate URL is properly encoded
        try {
          if (req.url) {
            decodeURIComponent(req.url);
          }
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Bad Request: Malformed URI');
          return;
        }
        
        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const componentTagger = mode === "development" ? getLovableTagger() : null;
  
  return {
  server: {
    host: "::",
    port: 8080,
    allowedHosts: [
      'www.zurt.com.br',
      'zurt.com.br',
    ],
    hmr: false, // Disable HMR to prevent SSL errors when accessed via HTTPS
    // Note: HMR requires WebSocket support through reverse proxy
    // If you need HMR over HTTPS, configure nginx to proxy WebSocket connections
    // For now, disable to avoid ERR_SSL_PROTOCOL_ERROR
    watch: {
      usePolling: false,
    },
    fs: {
      strict: true,
      // Allow access to project directory only
      allow: [path.resolve(__dirname)],
    },
    // Increase timeout to prevent incomplete chunked encoding errors
    headers: {
      'Cache-Control': 'no-store',
    },
    // Improve connection stability
    cors: true,
    // Improve file serving stability
    middlewareMode: false,
    // Increase chunk size limit to prevent content length mismatches
    chunkSizeWarningLimit: 2000,
  },
  plugins: [
    react(),
    securityMiddleware(),
    componentTagger && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'recharts',
      'date-fns',
      'react-day-picker',
      'lucide-react',
    ],
    // Force re-bundling to fix content length mismatch errors
    force: true,
    // Exclude problematic dependencies from pre-bundling
    exclude: [
      '@swc/core',
      '@swc/wasm',
      '@swc/core-linux-x64-gnu',
      '@swc/core-linux-x64-musl',
      'lovable-tagger',
    ],
    // Reduce concurrent pre-bundling to prevent timeouts
    esbuildOptions: {
      target: 'esnext',
      // Increase memory limit for large dependencies
      logOverride: { 'this-is-undefined-in-esm': 'silent' },
      // Exclude native bindings from bundling
      external: ['@swc/wasm'],
    },
    // Handle recharts specifically
    entries: [
      'src/main.tsx',
      'src/pages/**/*.tsx',
    ],
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      external: (id) => {
        // Exclude SWC native bindings and problematic packages from bundling
        if (
          id.includes('@swc/wasm') ||
          id.includes('@swc/core-linux') ||
          id.includes('@swc/core-darwin') ||
          id.includes('@swc/core-win32') ||
          id.endsWith('.node')
        ) {
          return true;
        }
        return false;
      },
      output: {
        // Optimize code splitting for better performance
        manualChunks: (id) => {
          // Exclude SWC and native bindings from chunking
          if (
            id.includes('@swc/') ||
            id.includes('lovable-tagger') ||
            id.endsWith('.node')
          ) {
            return null;
          }
          
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
  };
});
