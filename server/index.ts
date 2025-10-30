import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import {
  getDoctors,
  addDoctor,
  updateDoctor,
  deleteDoctor,
  verifyDoctor,
} from "./routes/doctors";
import { sendResults, getSendLogs, webhookTwilio, webhookInfobip } from "./routes/send";
import { uploadFiles, getFileUrl } from "./routes/upload";
import {
  login,
  register,
  logout,
  getMe,
  getAllUsers,
  deleteUser,
  updateUser,
} from "./routes/auth";
import {
  getSites,
  createSite,
  getUserAccessibleSites,
  deleteSite,
} from "./routes/sites";
import { exportReport } from "./routes/reports";
import { createInitialAdmin } from "./routes/seed";
import { authMiddleware, requireAuth } from "./lib/middleware";

export function createServer() {
  const app = express();

  // Middleware
  app.use(
    cors({
      origin: true,
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));
  app.use(authMiddleware); // Optional auth middleware (token verification)

  // Simple request logger to help debug network failures and missing auth
  app.use((req, _res, next) => {
    try {
      const auth = Boolean(req.headers.authorization);
      console.log(`[HTTP] ${req.method} ${req.path} auth=${auth}`);
    } catch (e) {
      // ignore logging errors
    }
    next();
  });

  // Auth routes (public)
  app.post("/api/auth/login", login);
  app.post("/api/auth/register", register);
  app.post("/api/auth/logout", logout);
  app.get("/api/auth/me", requireAuth, getMe);

  // Seed endpoint (create initial admin)
  app.post("/api/seed/create-initial-admin", createInitialAdmin);

  // Admin routes
  app.get("/api/users", requireAuth, getAllUsers);
  app.put("/api/users/:id", requireAuth, updateUser);
  app.delete("/api/users/:id", requireAuth, deleteUser);

  // Sites management
  app.get("/api/sites", requireAuth, getSites);
  app.post("/api/sites", requireAuth, createSite);
  app.delete("/api/sites/:id", requireAuth, deleteSite);
  app.get(
    "/api/users/:id/accessible-sites",
    requireAuth,
    getUserAccessibleSites,
  );

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Reports export
  app.post("/api/reports/export", requireAuth, exportReport);
  app.get("/api/reports/export", requireAuth, exportReport);

  // Doctors management (protected)
  app.get("/api/doctors", requireAuth, getDoctors);
  app.post("/api/doctors", requireAuth, addDoctor);
  app.put("/api/doctors/:id", requireAuth, updateDoctor);
  app.delete("/api/doctors/:id", requireAuth, deleteDoctor);
  app.post("/api/doctors/:id/verify", requireAuth, verifyDoctor);

  // File upload (protected)
  app.post("/api/upload-files", requireAuth, uploadFiles);
  app.get("/api/file-url", requireAuth, getFileUrl);

  // Send results (protected)
  app.post("/api/send-results", requireAuth, sendResults);
  app.get("/api/send-logs", requireAuth, getSendLogs);

  // Twilio webhook (public)
  app.post("/api/webhook/twilio", webhookTwilio);
  // Infobip webhook (public)
  app.post("/api/webhook/infobip", webhookInfobip);

  // Global error handler to ensure consistent JSON errors and avoid response stream issues
  // This will catch errors passed to next(err) or thrown in async route handlers
  // and ensure we send a single JSON response.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, _req: any, res: any, _next: any) => {
    try {
      console.error("Unhandled server error:", err);
      if (res.headersSent) {
        // If headers already sent, delegate to default Express handler
        return;
      }
      const status = err && err.status ? err.status : 500;
      const message =
        err && (err.message || err.error)
          ? err.message || err.error
          : "internal";
      res.status(status).json({ error: String(message) });
    } catch (e) {
      console.error("Error in global error handler", e);
      try {
        if (!res.headersSent) res.status(500).json({ error: "internal" });
      } catch (_) {}
    }
  });

  return app;
}
