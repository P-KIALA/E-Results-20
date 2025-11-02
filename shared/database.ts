export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      doctors: {
        Row: {
          created_at: string | null;
          id: string;
          name: string;
          phone: string;
          specialization: string | null;
          cnom: string | null;
          updated_at: string | null;
          whatsapp_verified: boolean | null;
          whatsapp_verified_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          name: string;
          phone: string;
          specialization?: string | null;
          cnom?: string | null;
          updated_at?: string | null;
          whatsapp_verified?: boolean | null;
          whatsapp_verified_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          name?: string;
          phone?: string;
          specialization?: string | null;
          cnom?: string | null;
          updated_at?: string | null;
          whatsapp_verified?: boolean | null;
          whatsapp_verified_at?: string | null;
        };
      };
      result_files: {
        Row: {
          created_at: string | null;
          file_name: string;
          file_size: number | null;
          file_type: string | null;
          id: string;
          send_log_id: string | null;
          storage_path: string;
        };
        Insert: {
          created_at?: string | null;
          file_name: string;
          file_size?: number | null;
          file_type?: string | null;
          id?: string;
          send_log_id?: string | null;
          storage_path: string;
        };
        Update: {
          created_at?: string | null;
          file_name?: string;
          file_size?: number | null;
          file_type?: string | null;
          id?: string;
          send_log_id?: string | null;
          storage_path?: string;
        };
      };
      send_logs: {
        Row: {
          created_at: string | null;
          custom_message: string | null;
          delivered_at: string | null;
          doctor_id: string;
          error_message: string | null;
          id: string;
          patient_name: string | null;
          patient_site: string | null;
          sender_id: string | null;
          read_at: string | null;
          sent_at: string | null;
          status: string | null;
          provider_message_id: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          custom_message?: string | null;
          delivered_at?: string | null;
          doctor_id: string;
          error_message?: string | null;
          id?: string;
          patient_name?: string | null;
          patient_site?: string | null;
          sender_id?: string | null;
          read_at?: string | null;
          sent_at?: string | null;
          status?: string | null;
          provider_message_id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          custom_message?: string | null;
          delivered_at?: string | null;
          doctor_id?: string;
          error_message?: string | null;
          id?: string;
          patient_name?: string | null;
          patient_site?: string | null;
          sender_id?: string | null;
          read_at?: string | null;
          sent_at?: string | null;
          status?: string | null;
          provider_message_id?: string | null;
          updated_at?: string | null;
        };
      };
      sample_queue: {
        Row: {
          id: string;
          patient_id: string;
          collector_id: string | null;
          status: "waiting" | "assigned" | "in_progress" | "done" | "cancelled";
          eta: string | null;
          notes: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          patient_id: string;
          collector_id?: string | null;
          status?:
            | "waiting"
            | "assigned"
            | "in_progress"
            | "done"
            | "cancelled";
          eta?: string | null;
          notes?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          patient_id?: string;
          collector_id?: string | null;
          status?:
            | "waiting"
            | "assigned"
            | "in_progress"
            | "done"
            | "cancelled";
          eta?: string | null;
          notes?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      patients: {
        Row: {
          id: string;
          name: string;
          phone: string | null;
          dob: string | null;
          site: string | null;
          sex: string | null;
          doctor: string | null;
          patient_ref: string | null;
          analyses:
            | {
                name: string;
                status: string | null;
                validated_at?: string | null;
              }[]
            | null;
          metadata: { [key: string]: any } | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          phone?: string | null;
          dob?: string | null;
          site?: string | null;
          sex?: string | null;
          doctor?: string | null;
          patient_ref?: string | null;
          analyses?:
            | {
                name: string;
                status: string | null;
                validated_at?: string | null;
              }[]
            | null;
          metadata?: { [key: string]: any } | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          phone?: string | null;
          dob?: string | null;
          site?: string | null;
          sex?: string | null;
          doctor?: string | null;
          patient_ref?: string | null;
          analyses?:
            | {
                name: string;
                status: string | null;
                validated_at?: string | null;
              }[]
            | null;
          metadata?: { [key: string]: any } | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      users: {
        Row: {
          id: string;
          email: string;
          password_hash: string;
          role: "admin" | "user" | "prelevement";
          permissions: string[] | null;
          primary_site_id: string | null;
          is_collector: boolean;
          site: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          password_hash: string;
          role?: "admin" | "user" | "prelevement";
          permissions?: string[] | null;
          primary_site_id?: string | null;
          is_collector?: boolean;
          site?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          password_hash?: string;
          role?: "admin" | "user" | "prelevement";
          permissions?: string[] | null;
          primary_site_id?: string | null;
          is_collector?: boolean;
          site?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};
