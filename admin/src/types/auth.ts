export interface AdminUser {
  id: string;
  fullName: string;
  email: string | null;
  phone: string;
  role: string;
  status: string;
  avatarUrl: string | null;
  permissions?: string[];
}

export interface AuthResponse {
  success: boolean;
  user: AdminUser;
  message?: string;
}


export type AdminRole =
  | "super_admin"
  | "admin"
  | "governorate_leader"
  | "area_leader"
  | "captain"
  | "shop"
  | "customer";
