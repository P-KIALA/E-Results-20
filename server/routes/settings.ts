import { RequestHandler } from "express";
import fs from "fs";
import path from "path";

export const setTemplateContentSid: RequestHandler = async (req, res) => {
  try {
    const newSid = (req.body as any)?.template_content_sid;
    if (!newSid || typeof newSid !== "string") {
      return res.status(400).json({ error: "template_content_sid is required" });
    }

    const envPath = path.resolve(process.cwd(), ".env");

    // Read existing .env (if present)
    let envText = "";
    try {
      if (fs.existsSync(envPath)) envText = fs.readFileSync(envPath, "utf8");
    } catch (e) {
      // proceed with empty envText
      envText = "";
    }

    const key = "WHATSAPP_TEMPLATE_CONTENT_SID";
    const line = `${key}="${newSid}"`;
    const regex = new RegExp(`^${key}=.*$`, "m");

    if (regex.test(envText)) {
      envText = envText.replace(regex, line);
    } else {
      if (envText.length > 0 && !envText.endsWith("\n")) envText += "\n";
      envText += line + "\n";
    }

    try {
      fs.writeFileSync(envPath, envText, "utf8");
    } catch (writeErr) {
      return res
        .status(500)
        .json({ error: "Failed to write .env file", details: String(writeErr) });
    }

    // Update runtime env as well so changes take effect immediately
    try {
      process.env.WHATSAPP_TEMPLATE_CONTENT_SID = newSid;
    } catch (e) {
      // ignore
    }

    return res.json({ success: true, template_content_sid: newSid });
  } catch (err: any) {
    console.error("setTemplateContentSid error:", err);
    return res.status(500).json({ error: String(err) });
  }
};
