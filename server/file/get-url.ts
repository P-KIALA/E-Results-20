import { supabase } from "../lib/supabase";

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ error: "Method not allowed" });
    }

    const storage_path = req.query.storage_path || req.query.storagePath;

    if (!storage_path) {
      return res.status(400).json({ error: "storage_path is required" });
    }

    // If bucket is public, construct public URL
    // Otherwise, create a signed URL for download
    const bucket = "results";
    const pathStr = String(storage_path);

    try {
      // Attempt to create a public URL (works if bucket public)
      const { data: publicUrl } = await supabase.storage.from(bucket).getPublicUrl(pathStr);
      if (publicUrl && publicUrl.publicUrl) {
        // For nicer filename handling, the frontend can proxy or set download attr.
        return res.json({ url: publicUrl.publicUrl });
      }
    } catch (e) {
      // ignore and fallback to signed URL
    }

    // Fallback: create a signed URL (default expiry 1 hour)
    const expiresIn = 60 * 60; // seconds
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(pathStr, expiresIn);
    if (error || !data) {
      console.error("Failed to create signed URL:", error);
      return res.status(500).json({ error: "Failed to create signed URL" });
    }

    res.json({ url: data.signedUrl });
  } catch (error) {
    console.error("Error getting file URL:", error);
    res.status(500).json({ error: "Failed to get file URL" });
  }
}
