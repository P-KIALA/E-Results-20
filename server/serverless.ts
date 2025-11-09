import serverless from "serverless-http";

let handler: any = null;

async function initHandler() {
  if (handler) return handler;

  let appModule: any = null;
  try {
    appModule = await import("./index");
  } catch (e) {
    console.warn(
      "Could not import ./index, trying built bundle: dist/server/node-build.mjs",
      e?.message || e,
    );
    try {
      appModule = await import("../dist/server/node-build.mjs");
    } catch (e2) {
      console.error(
        "Failed to import server module from built bundle:",
        e2?.message || e2,
      );
      throw e2;
    }
  }

  let app: any = null;
  if (appModule) {
    if (typeof appModule.createServer === "function") {
      app = appModule.createServer();
    } else if (typeof appModule.default === "function") {
      app = appModule.default();
    } else if (
      appModule &&
      typeof appModule.server === "object" &&
      typeof appModule.server.createServer === "function"
    ) {
      app = appModule.server.createServer();
    } else {
      throw new Error("Could not find createServer() in server module");
    }
  }

  handler = serverless(app as any);
  return handler;
}

export default async function (req: any, res: any) {
  try {
    const h = await initHandler();
    return await h(req, res);
  } catch (err: any) {
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
