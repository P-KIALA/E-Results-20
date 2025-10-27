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
          read_at: string | null;
          sent_at: string | null;
          status: string | null;
          twilio_message_sid: string | null;
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
          read_at?: string | null;
          sent_at?: string | null;
          status?: string | null;
          twilio_message_sid?: string | null;
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
          read_at?: string | null;
          sent_at?: string | null;
          status?: string | null;
          twilio_message_sid?: string | null;
          updated_at?: string | null;
        };
      };
      users: {
        Row: {
          id: string;
          email: string;
          password_hash: string;
          role: "admin" | "user";
          permissions: string[];
          site: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          password_hash: string;
          role?: "admin" | "user";
          permissions?: string[];
          site?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          password_hash?: string;
          role?: "admin" | "user";
          permissions?: string[];
          site?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};
