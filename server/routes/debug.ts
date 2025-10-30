import { RequestHandler } from "express";

// Generic debug endpoint — Twilio-specific debug removed
export const debugInfo: RequestHandler = async (_req, res) => {
  try {
    res.json({
      success: true,
      message: "Debug endpoints active. Twilio integration removed.",
    });
  } catch (error: any) {
    console.error("debugInfo error:", error);
    res
      .status(500)
      .json({ success: false, error: error?.message || String(error) });
  }
};
