import { RequestHandler } from "express";
import { supabase } from "../lib/supabase";
import * as fs from "fs";
import * as path from "path";

// Simplified file upload (in production, use multer middleware)
export const uploadFiles: RequestHandler = async (req, res) => {
  try {
    // For now, we'll accept base64 encoded files from the frontend
    // In production, use multer middleware to handle multipart/form-data

    const { files } = req.body;

    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ error: "files array is required" });
    }

    const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16 MB
    const uploadedFiles: any[] = [];

    for (const file of files) {
      const { name, data, type, send_log_id } = file;

      if (!name || !data || !type) {
        return res.status(400).json({
          error: "Each file must have name, data (base64), and type",
        });
      }

      // Validate file size (rough estimate from base64)
      const sizeBytes = Buffer.byteLength(data, "base64");
      if (sizeBytes > MAX_FILE_SIZE) {
        return res.status(400).json({
          error: `File ${name} exceeds 16 MB limit`,
        });
      }

      try {
        // Generate unique filename
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 8);
        const ext = path.extname(name);
        const storagePath = `results/${timestamp}_${randomId}${ext}`;

        // Convert base64 to buffer
        const buffer = Buffer.from(data, "base64");

        // Upload to Supabase Storage
        const { data: storageData, error: storageError } =
          await supabase.storage.from("results").upload(storagePath, buffer, {
            contentType: type,
            upsert: false,
          });

        if (storageError) {
          throw storageError;
        }

        // Store file metadata in database
        let resultFileData: any = {
          file_name: name,
          file_type: type,
          file_size: sizeBytes,
          storage_path: storagePath,
        };

        // If send_log_id is provided, associate with send log
        if (send_log_id) {
          resultFileData.send_log_id = send_log_id;
        }

        const { data: fileRecord, error: dbError } = await supabase
          .from("result_files")
          .insert(resultFileData)
          .select()
          .single();

        if (dbError) {
          // Try to delete the uploaded file if DB insert fails
          await supabase.storage.from("results").remove([storagePath]);
          throw dbError;
        }

        uploadedFiles.push(fileRecord);
      } catch (error) {
        console.error(`Error uploading file ${name}:`, error);
        return res.status(500).json({
          error: `Failed to upload file ${name}: ${String(error)}`,
        });
      }
    }

    res.status(201).json({ files: uploadedFiles });
  } catch (error) {
    console.error("Error in upload handler:", error);
    res.status(500).json({ error: "Failed to process upload" });
  }
};

// Get signed URL for file download
export const getFileUrl: RequestHandler = async (req, res) => {
  try {
    const { storage_path } = req.query;

    if (!storage_path) {
      return res.status(400).json({ error: "storage_path is required" });
    }

    const { data, error } = supabase.storage
      .from("results")
      .getPublicUrl(String(storage_path));

    if (error) throw error;

    res.json({ url: data.publicUrl });
  } catch (error) {
    console.error("Error getting file URL:", error);
    res.status(500).json({ error: "Failed to get file URL" });
  }
};
