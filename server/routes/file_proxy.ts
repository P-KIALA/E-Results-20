import { RequestHandler } from "express";
import { supabase } from "../lib/supabase";

export const fileProxyDownload: RequestHandler = async (req, res) => {
  try {
    const id = req.params.id || req.query.id;
    const storage_path = req.query.storage_path as string | undefined;

    let fileRecord: any = null;
    if (id) {
      const { data, error } = await supabase
        .from("result_files")
        .select("id, file_name, file_type, storage_path")
        .eq("id", String(id))
        .single();
      if (error) throw error;
      fileRecord = data;
    } else if (storage_path) {
      const { data, error } = await supabase
        .from("result_files")
        .select("id, file_name, file_type, storage_path")
        .eq("storage_path", String(storage_path))
        .single();
      if (error) throw error;
      fileRecord = data;
    } else {
      return res.status(400).send("id or storage_path is required");
    }

    if (!fileRecord) return res.status(404).send("file not found");

    // Download file from Supabase storage as a Buffer
    const { data, error } = await supabase.storage
      .from("results")
      .download(fileRecord.storage_path);

    if (error || !data) {
      console.error("fileProxyDownload: storage download error", error);
      return res.status(502).send("Failed to download file");
    }

    // Stream the data back with Content-Disposition header so consumers (Twilio) get original filename
    res.setHeader(
      "Content-Type",
      fileRecord.file_type || "application/octet-stream",
    );
    // Ensure filename is ASCII-safe
    const filename = (fileRecord.file_name || "file").replace(
      /[^\x20-\x7E]/g,
      "_",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );

    // Pipe the ReadableStream/Blob to response
    if (typeof (data as any).arrayBuffer === "function") {
      const ab = await (data as any).arrayBuffer();
      res.send(Buffer.from(ab));
      return;
    }

    // fallback: stream
    const stream = (data as any).stream();
    stream.pipe(res);
  } catch (err) {
    console.error("fileProxyDownload error:", err);
    res.status(500).send("Failed to proxy file");
  }
};
