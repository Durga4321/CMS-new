export const SUPER_ADMIN_EMAIL = "superadmin@gmail.com";

export const ROLE_HOME_PATHS = {
  superadmin: "/dashboard",
  admin: "/admin-dashboard",
  receptionist: "/reception",
  doctor: "/doctor",
};

export const SHARED_APP_PATHS = ["/profile", "/notifications", "/help"];
export const SUPER_ADMIN_PATHS = ["/clinics", "/admins", "/users", "/roles", "/logs"];

export function normalizeRole(value, email = "") {
  const role = String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");
  const normalizedEmail = String(email ?? "")
    .toLowerCase()
    .trim();

  if (
    normalizedEmail === SUPER_ADMIN_EMAIL ||
    role.includes("superadmin") ||
    role.includes("super_admin")
  ) {
    return "superadmin";
  }
  if (role.includes("reception")) return "receptionist";
  if (role.includes("doctor")) return "doctor";
  if (role.includes("patient")) return "patient";
  if (role.includes("admin")) return "admin";
  return "";
}

export function getRoleHomePath(role, email = "") {
  return ROLE_HOME_PATHS[normalizeRole(role, email)] ?? "";
}

export function isSharedAppPath(path) {
  return SHARED_APP_PATHS.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function isSuperAdminPath(path) {
  return SUPER_ADMIN_PATHS.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}
