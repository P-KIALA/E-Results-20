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
import { sendResults, getSendLogs, getSendLogFiles } from "./routes/send";
import { debugInfo, sendTest, uploadPublic } from "./routes/debug";
import { proxyHandler } from "./routes/proxy";
import { uploadFiles, getFileUrl } from "./routes/upload";
import { twilioSendHandler } from "./routes/twilio_send";
import { twilioStatusWebhook } from "./routes/twilio_webhook";
import { deleteSendLog } from "./routes/delete_send_log";
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
import { setTemplateContentSid } from "./routes/settings";
import { authMiddleware, requireAuth } from "./lib/middleware";

export function createServer() {
  const app = express();

  // Instrument route registration to log each registered path (helps detect malformed routes)
  const methodsToWrap = ["get", "post", "put", "delete", "all", "patch"];
  methodsToWrap.forEach((m) => {
    // @ts-ignore
    const orig = app[m];
    // @ts-ignore
    app[m] = function (path: any, ...args: any[]) {
      try {
        console.log(`[ROUTE REGISTER] ${m.toUpperCase()} ${String(path)}`);
      } catch (e) {
        // ignore logging errors
      }
      try {
        // Call the original registration and surface any errors with context
        // @ts-ignore
        return orig.call(this, path, ...args);
      } catch (err) {
        console.error(`Error registering route ${m.toUpperCase()} ${String(path)}:`, err && err.stack ? err.stack : err);
        throw err;
      }
    } as any;
  });

  // Middleware
  // Configure CORS to explicitly allow requests from the app base URL and common embed/origin hosts
  // For development/embed environments (Builder.io), accept builder origins as well.
  app.use(
    cors({
      origin: (origin, callback) => {
        try {
          // If no origin (server-to-server or curl), allow
          if (!origin) return callback(null, true);

          const allowed = [
            process.env.APP_BASE_URL,
            "https://app.builder.io",
            "https://builder.io",
            "https://preview.builder.io",
          ].filter(Boolean) as string[];

          // If origin matches one of the allowed patterns, is a subdomain of the app base or builder.io, allow it
          const hostname = (() => {
            try {
              return new URL(origin).hostname;
            } catch (_) {
              return null;
            }
          })();

          const appBaseHost = (() => {
            try {
              return process.env.APP_BASE_URL
                ? new URL(process.env.APP_BASE_URL).hostname
                : null;
            } catch (_) {
              return null;
            }
          })();

          const isAllowed =
            allowed.some((allowedOrigin) => origin === allowedOrigin) ||
            (hostname &&
              appBaseHost &&
              (hostname === appBaseHost ||
                hostname.endsWith("." + appBaseHost))) ||
            /(^|\.)builder\.io$/.test(hostname || "") ||
            // Allow Builder project hostnames (projects.builder.* like projects.builder.my / projects.builder.codes)
            (hostname && /projects\.builder\./.test(hostname)) ||
            // Broad builder subdomain match (e.g. ce33...-main.projects.builder.codes)
            (hostname && /(^|\.)builder\./.test(hostname)) ||
            // Allow Netlify hosted sites and subdomains (e.g. my-site.netlify.app, my-site.netlify.app)
            (hostname && /(^|\.)netlify\.app$/.test(hostname));

          if (isAllowed) return callback(null, true);

          // Otherwise deny CORS with an explanatory message
          console.warn(`CORS: rejecting origin ${origin}`);
          return callback(new Error(`Origin not allowed by CORS: ${origin}`));
        } catch (e) {
          // Fallback to allow if something goes wrong parsing origin
          return callback(null, true);
        }
      },
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      credentials: true,
      optionsSuccessStatus: 204,
      preflightContinue: false,
      exposedHeaders: ["Authorization"],
    }),
  );

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));
  app.use(authMiddleware); // Optional auth middleware (token verification)

  // Simple request logger to help debug network failures and missing auth
  app.use((req, _res, next) => {
    try {
      const auth = Boolean(req.headers.authorization);
      const origin = req.headers.origin || req.headers.referer || "<no-origin>";
      const authHeader = req.headers.authorization ? "present" : "missing";
      // log method, path, origin and whether auth header is present (do not log token value)
      console.log(
        `[HTTP] ${req.method} ${req.path} auth=${authHeader} origin=${origin}`,
      );
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

  // File proxy endpoint that streams files with Content-Disposition so external services (e.g. Twilio)
  // preserve the original filename when downloading.
  app.get("/api/file/:id/download", requireAuth, (req, res) => {
    // lazy import to avoid top-level server bundle issues
    return require("./routes/file_proxy").fileProxyDownload(req, res);
  });
  app.get("/api/file/proxy", requireAuth, (req, res) => {
    return require("./routes/file_proxy").fileProxyDownload(req, res);
  });

  // Send results (protected)
  app.post("/api/send-results", requireAuth, sendResults);
  app.get("/api/send-logs", requireAuth, getSendLogs);
  app.get("/api/send-logs/:id/files", requireAuth, getSendLogFiles);

  // Delete a send_log (soft-delete + attempt to delete provider message)
  app.post("/api/send-logs/:id/delete", requireAuth, deleteSendLog);

  // Settings (admin) - allows updating runtime settings such as the WhatsApp template Content SID
  app.post(
    "/api/settings/template-content-sid",
    requireAuth,
    setTemplateContentSid,
  );

  // Debug endpoints (public in dev only)
  app.get("/api/debug", debugInfo);
  // Debug: simulate sending a result without external provider (useful for testing)
  app.post("/api/debug/send-test", sendTest);
  // Public upload endpoint for testing (dev only)
  app.post("/api/debug/upload-public", uploadPublic);

  // Twilio webhook for status callbacks
  app.post("/api/webhook/twilio", twilioStatusWebhook);

  // Twilio debug send endpoint (public, dev only). Sends a simple WhatsApp text message.
  app.post("/api/debug/twilio-send-public", twilioSendHandler);

  // Debug: validate Twilio credentials and account resources
  app.get("/api/debug/twilio-validate", (req, res) => {
    try {
      return require("./routes/twilio_validate").twilioValidate(req, res);
    } catch (e) {
      console.error("Failed to route twilio-validate", e);
      res.status(500).json({ ok: false, error: String(e) });
    }
  });

  // Server-side proxy to forward requests from embedded clients (iframes) to the app base URL.
  // Example: client calls /api/proxy/send-logs -> server forwards to APP_BASE_URL/api/send-logs
  // Use app.use for proxy to avoid path-to-regexp complications with wildcards
  app.use("/api/proxy", requireAuth, (req: any, res: any, next: any) => {
    // proxyHandler returns a Promise; ensure errors are forwarded to next
    Promise.resolve(proxyHandler(req, res)).catch(next);
  });

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
