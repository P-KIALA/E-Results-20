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
import { sendResults, getSendLogs, webhookTwilio } from "./routes/send";
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
import { createInitialAdmin } from "./routes/seed";
import { getPatients, addPatient, updatePatient, deletePatient } from "./routes/patients";
import { authMiddleware, requireAuth } from "./lib/middleware";
import {
  createQueueItem,
  listQueue,
  assignQueue,
  claimQueue,
  releaseQueue,
  completeQueue,
  getCollectors,
} from "./routes/queue";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));
  app.use(authMiddleware); // Optional auth middleware (token verification)

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

  // Queue management
  app.post("/api/queue", requireAuth, createQueueItem);
  app.get("/api/queue", requireAuth, listQueue);
  app.post("/api/queue/:id/assign", requireAuth, assignQueue); // admin assigns
  app.post("/api/queue/:id/claim", requireAuth, claimQueue); // collector claims
  app.post("/api/queue/:id/release", requireAuth, releaseQueue);
  app.post("/api/queue/:id/complete", requireAuth, completeQueue);
  app.get("/api/collectors", requireAuth, getCollectors);

  return app;
}
