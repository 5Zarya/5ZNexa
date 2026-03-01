// src/types.ts

// 🎯 Representasi data User
export type User = {
  id: string;
  email: string;
  name?: string;
  roles?: string[];
  avatarUrl?: string;
  managerName?: string;

  // Profil tambahan
  phone?: string;
  jobTitle?: string;
  department?: string;
  joinDate?: string;

  // Security
  twoFAEnabled?: boolean;

  // Preferences
  language?: string;
  notifications?: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };

  // Status
  lastLogin?: string;
  active?: boolean;
};

// 🎯 Data absensi
export type AttendanceRecord = {
  id: string
  userId: string
  timestamp: string
  method: "nfc" | "fingerprint" | "web" | "manual"
  deviceId?: string
  location?: {
    lat: number
    lng: number
  } | null
  notes?: string
}

// 🎯 Data Course / LMS
export type Course = {
  id: string;
  title: string;
  description?: string;
  progress?: number; // persentase 0-100
  completed?: boolean;
};

// 🎯 Data Notifikasi
export type Notification = {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  read: boolean;
  createdAt: string;
};

// 🎯 Response API standar
export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data?: T;
};
