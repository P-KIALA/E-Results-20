import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// Server imports are loaded lazily inside the express plugin to avoid importing server-only code during build time
// (avoids exposing service role keys or other privileged server code at build)

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    fs: {
      allow: ["./client", "./shared"],
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "server/**"],
    },
  },
  build: {
    outDir: "dist/spa",
    // Increase warning limit to reduce noisy warnings and improve build stability on Vercel
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          // Extract common vendor libs into a vendor chunk
          vendor: ["react", "react-dom", "@supabase/supabase-js"]
        }
      }
    }
  },
  plugins: [react(), expressPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
}));

function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve", // Only apply during development (serve mode)
    async configureServer(server) {
      // Lazy-load server creation and storage initialization only in dev server runtime
      let app;
      try {
        const serverMod = await import("./server");
        app = serverMod.createServer();
      } catch (e) {
        console.error("Could not load server module in dev plugin:", e);
      }

      try {
        const storageMod = await import("./server/lib/storage");
        if (storageMod && typeof storageMod.initializeBuckets === "function") {
          storageMod.initializeBuckets().catch((error: any) => {
            console.error("Failed to initialize storage:", error);
          });
        }
      } catch (e) {
        console.warn("Could not initialize storage buckets (dev):", e);
      }

      // Add Express app as middleware to Vite dev server if available
      if (app && server.middlewares) {
        server.middlewares.use(app);
      }
    },
  };
}
