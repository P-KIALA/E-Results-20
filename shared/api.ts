export interface DemoResponse {
  message: string;
}

export interface Doctor {
  id: string;
  phone: string;
  name: string;
  specialization?: string;
  whatsapp_verified: boolean;
  whatsapp_verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AddDoctorRequest {
  phone: string;
  name: string;
  specialization?: string;
}

export interface SendLogEntry {
  id: string;
  doctor_id: string;
  status: "pending" | "sent" | "delivered" | "read" | "failed";
  custom_message?: string;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  error_message?: string;
  twilio_message_sid?: string;
  created_at: string;
  updated_at: string;
}

export interface SendResultsRequest {
  doctor_ids: string[];
  custom_message: string;
  file_ids: string[];
  patient_name?: string;
  patient_site?: string;
}

export interface UploadFileResponse {
  file_id: string;
  file_name: string;
  file_size: number;
  storage_path: string;
}

export interface SendLogsResponse {
  logs: SendLogEntry[];
  total: number;
}

export interface VerifyPhoneResponse {
  is_valid: boolean;
  is_whatsapp: boolean;
  formatted_phone: string;
}

export type UserRole = "admin" | "user";

export type Permission = "manage_doctors" | "view_reports" | "manage_users" | "access_all_sites";

export interface Site {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  primary_site_id?: string | null;
  primary_site?: Site | null;
  site?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  expiresIn: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  role?: UserRole;
  permissions?: Permission[];
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: number;
}

export interface LogoutResponse {
  success: boolean;
}
