export type AdminRole =
  | "super_admin"
  | "admin"
  | "governorate_leader"
  | "area_leader"
  | "captain"
  | "shop"
  | "customer";

export function isSuperAdmin(role?: string) {
  return role === "super_admin";
}

export function isAdmin(role?: string) {
  return (
    role === "admin" ||
    role === "super_admin"
  );
}

export function canManageUsers(role?: string) {
  return role === "super_admin";
}

export function canManageCaptains(role?: string) {
  return (
    role === "super_admin" ||
    role === "admin"
  );
}

export function canManageLeaders(role?: string) {
  return (
    role === "super_admin" ||
    role === "admin"
  );
}

export function canManageLocations(role?: string) {
  return (
    role === "super_admin" ||
    role === "admin"
  );
}

export function canManageEstablishments(role?: string) {
  return (
    role === "super_admin" ||
    role === "admin"
  );
}

export function canManageProducts(role?: string) {
  return (
    role === "super_admin" ||
    role === "admin"
  );
}

export function canManageOrders(role?: string) {
  return (
    role === "super_admin" ||
    role === "admin"
  );
}
