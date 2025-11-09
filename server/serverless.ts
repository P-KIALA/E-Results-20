import serverless from "serverless-http";
import { createServer } from "./index";

const app = createServer();

const handler = serverless(app as any);

export default async function (req: any, res: any) {
  try {
    return await handler(req, res);
  } catch (err: any) {
    // Ensure we always return JSON on unhandled errors (avoid HTML error pages)
    try {
      console.error("Unhandled serverless handler error:", err?.stack || err);
      if (!res.headersSent) {
        res.statusCode = err && err.status ? err.status : 500;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({ error: String(err?.message || err || "internal") }),
        );
      }
    } catch (e) {
      console.error("Error while sending error response:", e);
    }
  }
}
