export type AccountType =
  | "captain"
  | "shop"
  | "governorate_leader"
  | "area_leader";

export type AccountStatus =
  | "pending"
  | "active"
  | "rejected"
  | "suspended"
  | "inactive";

export type AuthUser = {
  id: string;
  role: AccountType;
  name?: string;
  phone?: string;
  email?: string | null;
  status?: AccountStatus | string;
  governorateId?: string | null;
  governorateName?: string | null;
  areaId?: string | null;
  areaName?: string | null;
  areaIds?: string[];
  avatarUrl?: string | null;
};
