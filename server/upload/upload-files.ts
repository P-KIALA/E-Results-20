import { supabase } from "../lib/supabase";
import * as path from "path";

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { files } = req.body || {};

    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ error: "files array is required" });
    }

    const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16 MB
    const uploadedFiles: any[] = [];

    for (const file of files) {
      const { name, data, type, send_log_id } = file;

      if (!name || !data || !type) {
        return res
          .status(400)
          .json({ error: "Each file must have name, data (base64), and type" });
      }

      // Validate file size (rough estimate from base64)
      const sizeBytes = Buffer.byteLength(data, "base64");
      if (sizeBytes > MAX_FILE_SIZE) {
        return res
          .status(400)
          .json({ error: `File ${name} exceeds 16 MB limit` });
      }

      try {
        const originalBase = path.basename(name);
        const sanitizedBase = originalBase
          .replace(/[^a-zA-Z0-9._-]/g, "_")
          .slice(0, 200);

        const timestamp = Date.now();
        const storagePath = `results/${timestamp}_${sanitizedBase}`;

        const buffer = Buffer.from(data, "base64");

        const uploadResult = await supabase.storage
          .from("results")
          .upload(storagePath, buffer, {
            contentType: type,
            upsert: false,
          });

        const storageData = uploadResult.data;
        const storageError = uploadResult.error;

        if (storageError) {
          const msg = String(
            storageError?.message || storageError?.msg || storageError,
          );
          throw new Error(msg);
        }

        let resultFileData: any = {
          file_name: name,
          file_type: type,
          file_size: sizeBytes,
          storage_path: storagePath,
        };

        if (send_log_id) {
          resultFileData.send_log_id = send_log_id;
        }

        const { data: fileRecord, error: dbError } = await supabase
          .from("result_files")
          .insert(resultFileData)
          .select()
          .single();

        if (dbError) {
          await supabase.storage.from("results").remove([storagePath]);
          throw dbError;
        }

        uploadedFiles.push(fileRecord);
      } catch (error) {
        console.error(`Error uploading file ${name}:`, error);
        const msg =
          (error && (error.message || error.error || String(error))) ||
          "Unknown upload error";
        return res
          .status(500)
          .json({ error: `Failed to upload file ${name}: ${msg}` });
      }
    }

    res.status(201).json({ files: uploadedFiles });
  } catch (error) {
    console.error("Error in upload handler:", error);
    const msg =
      (error && (error.message || error.error || String(error))) ||
      "Failed to process upload";
    res.status(500).json({ error: msg });
  }
}
