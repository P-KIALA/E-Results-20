import path from "path";
import { createServer as createBaseServer } from "./index";
import { initializeBuckets } from "./lib/storage";
import * as express from "express";

// Create the server but do NOT listen when this module is imported by a serverless handler.
export function createServer() {
  const app = createBaseServer();

  // Initialize storage buckets in background
  initializeBuckets().catch((error) => {
    console.error("Failed to initialize storage:", error);
  });

  // Only serve the SPA static files when running the build as a standalone process
  // Detect direct execution by comparing import.meta.url to process.argv[1]
  const isDirectExecution =
    typeof process !== "undefined" &&
    typeof import.meta !== "undefined" &&
    import.meta.url === `file://${process.argv[1]}`;

  if (isDirectExecution) {
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const distPath = path.join(__dirname, "../spa");

    // Serve static files
    app.use(express.static(distPath));

    // Handle React Router - serve index.html for all non-API routes
    app.get("*", (req, res) => {
      // Don't serve index.html for API routes
      if (req.path.startsWith("/api/") || req.path.startsWith("/health")) {
        return res.status(404).json({ error: "API endpoint not found" });
      }

      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  return app;
}

// If run directly (node dist/server/node-build.mjs), start the listener
if (
  typeof process !== "undefined" &&
  typeof import.meta !== "undefined" &&
  import.meta.url === `file://${process.argv[1]}`
) {
  const app = createServer();
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`🚀 Fusion Starter server running on port ${port}`);
    console.log(`📱 Frontend: http://localhost:${port}`);
    console.log(`🔧 API: http://localhost:${port}/api`);
  });

  // Graceful shutdown
  process.on("SIGTERM", () => {
    console.log("🛑 Received SIGTERM, shutting down gracefully");
    process.exit(0);
  });

  process.on("SIGINT", () => {
    console.log("🛑 Received SIGINT, shutting down gracefully");
    process.exit(0);
  });
}
