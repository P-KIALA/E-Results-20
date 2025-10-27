import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { getDoctors, addDoctor, updateDoctor, deleteDoctor, verifyDoctor } from "./routes/doctors";
import { sendResults, getSendLogs, webhookTwilio } from "./routes/send";
import { uploadFiles, getFileUrl } from "./routes/upload";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Doctors management
  app.get("/api/doctors", getDoctors);
  app.post("/api/doctors", addDoctor);
  app.put("/api/doctors/:id", updateDoctor);
  app.delete("/api/doctors/:id", deleteDoctor);
  app.post("/api/doctors/:id/verify", verifyDoctor);

  // File upload
  app.post("/api/upload-files", uploadFiles);
  app.get("/api/file-url", getFileUrl);

  // Send results
  app.post("/api/send-results", sendResults);
  app.get("/api/send-logs", getSendLogs);

  // Twilio webhook
  app.post("/api/webhook/twilio", webhookTwilio);

  return app;
}
