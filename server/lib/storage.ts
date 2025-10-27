import { supabase } from "./supabase";

export async function initializeBuckets() {
  try {
    // Check if results bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();

    const resultsBucketExists = buckets?.some((b) => b.name === "results");

    if (!resultsBucketExists) {
      console.log("Creating 'results' bucket...");
      const { data, error } = await supabase.storage.createBucket("results", {
        public: true,
      });

      if (error) {
        console.error("Error creating results bucket:", error);
        throw error;
      }

      console.log("✓ Bucket 'results' created successfully");
    } else {
      console.log("✓ Bucket 'results' already exists");
    }
  } catch (error) {
    console.error("Failed to initialize storage buckets:", error);
    // Don't throw - app can continue but uploads will fail
  }
}
