import serverless from "serverless-http";

let handler: any = null;

async function initHandler() {
  if (handler) return handler;

  let appModule: any = null;
  // Try multiple candidate paths to support various Vercel/build layouts
  const candidates = [
    "./index",
    "./index.js",
    "./index.mjs",
    "../dist/server/node-build.mjs",
    "../dist/server/node-build.js",
    "../dist/server/node-build.cjs",
    "../dist/server/index.mjs",
    "../dist/server/index.js",
  ];

  let lastError: any = null;
  for (const candidate of candidates) {
    try {
      console.log("Attempting to import server module from:", candidate);
      // dynamic import relative to this file
      appModule = await import(candidate as any);
      console.log("Successfully imported server module from:", candidate);
      break;
    } catch (err: any) {
      lastError = err;
      console.warn(`Failed to import from ${candidate}:`, err && err.message ? err.message : err);
    }
  }

  if (!appModule) {
    console.error("Could not import any server module. Last error:", lastError && lastError.message ? lastError.message : lastError);
    throw lastError || new Error("No server module found");
  }

  let app: any = null;
  if (appModule) {
    try {
      console.log("Loaded server module exports:", Object.keys(appModule));
    } catch (_) {}
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
      try {
        console.error(
          "Server module did not export createServer - keys:",
          Object.keys(appModule),
        );
      } catch (_) {}
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
