export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "";

const TOKEN_KEY = "clinic_command_center_token";
const USER_KEY = "clinic_command_center_user";

export function getAuthToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(TOKEN_KEY) ?? "";
}

export function setAuthToken(token) {
  if (typeof window === "undefined" || !token) return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function getAuthUser() {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(USER_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function setAuthUser(user) {
  if (typeof window === "undefined" || !user) return;
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export function getPayload(response) {
  if (response && typeof response === "object") {
    return response.data ?? response.payload ?? response.result ?? response;
  }
  return response;
}

export function toArray(response) {
  const value = getPayload(response);
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.rows)) return value.rows;
  return [];
}

export function readToken(response) {
  return (
    response?.token ??
    response?.accessToken ??
    response?.access_token ??
    response?.data?.token ??
    response?.data?.accessToken ??
    response?.data?.access_token ??
    ""
  );
}

export function readUser(response) {
  const payload = getPayload(response);
  return (
    payload?.user ??
    payload?.account ??
    payload?.profile ??
    response?.user ??
    response?.data?.user ??
    response?.data?.account ??
    response?.data?.profile ??
    null
  );
}

export function readTokenPayload(token) {
  if (!token || typeof token !== "string") return null;
  const [, payload] = token.split(".");
  if (!payload) return null;
  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    const json =
      typeof window === "undefined"
        ? Buffer.from(padded, "base64").toString("utf8")
        : window.atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function readRole(response, fallbackToken = "") {
  const directRole = findRoleValue(response);
  if (directRole) return directRole;
  const tokenRole = findRoleValue(readTokenPayload(readToken(response) || fallbackToken));
  return tokenRole || "";
}

function findRoleValue(value, depth = 0) {
  if (!value || depth > 5) return "";
  if (typeof value === "string") {
    return normalizeRoleValue(value);
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const role = findRoleValue(item, depth + 1);
      if (role) return role;
    }
    return "";
  }
  if (typeof value !== "object") return "";

  const roleKeys = [
    "role",
    "roleName",
    "role_name",
    "userRole",
    "user_role",
    "type",
    "userType",
    "user_type",
  ];
  for (const key of roleKeys) {
    const role = findRoleValue(value[key], depth + 1);
    if (role) return role;
  }

  for (const item of Object.values(value)) {
    const role = findRoleValue(item, depth + 1);
    if (role) return role;
  }
  return "";
}

function normalizeRoleValue(value) {
  const role = value.toLowerCase().trim().replace(/\s+/g, "_");
  if (role.includes("reception")) return "receptionist";
  if (role.includes("doctor")) return "doctor";
  if (role.includes("patient")) return "patient";
  if (role.includes("admin")) return "admin";
  return "";
}

export async function apiRequest(path, options = {}) {
  const { body, headers, auth = true, ...init } = options;
  const token = auth ? getAuthToken() : "";
  const requestHeaders = {
    Accept: "application/json",
    "ngrok-skip-browser-warning": "true",
    ...headers,
  };

  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders["Content-Type"] = "application/json";
  }

  if (token) requestHeaders.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: requestHeaders,
    body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const data = text ? parseResponse(text) : null;

  if (!response.ok) {
    const message = data?.message ?? data?.error ?? `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

function parseResponse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

const byId = (path, id) => `${path}/${encodeURIComponent(id)}`;
const json = (method, body) => ({ method, body });

export const api = {
  admins: {
    list: () => apiRequest("/api/admins"),
    create: (data) => apiRequest("/api/admins", json("POST", data)),
    get: (id) => apiRequest(byId("/api/admins", id)),
    update: (id, data) => apiRequest(byId("/api/admins", id), json("PUT", data)),
    remove: (id) => apiRequest(byId("/api/admins", id), { method: "DELETE" }),
  },
  auth: {
    superAdminLogin: (data) =>
      apiRequest("/api/auth/super-admin-login", { ...json("POST", data), auth: false }),
    register: (data) => apiRequest("/api/auth/register", { ...json("POST", data), auth: false }),
    login: (data) => apiRequest("/api/auth/login", { ...json("POST", data), auth: false }),
    forgotPassword: (data) =>
      apiRequest("/api/auth/forgot-password", { ...json("POST", data), auth: false }),
    resetPassword: (data) =>
      apiRequest("/api/auth/reset-password", { ...json("POST", data), auth: false }),
  },
  clinics: {
    list: () => apiRequest("/api/clinics"),
    create: (data) => apiRequest("/api/clinics", json("POST", data)),
    get: (id) => apiRequest(byId("/api/clinics", id)),
    update: (id, data) => apiRequest(byId("/api/clinics", id), json("PUT", data)),
    remove: (id) => apiRequest(byId("/api/clinics", id), { method: "DELETE" }),
  },
  dashboard: {
    summary: () => apiRequest("/api/dashboard/summary"),
    revenueOverview: () => apiRequest("/api/dashboard/revenue-overview"),
    activities: () => apiRequest("/api/dashboard/activities"),
  },
  logs: {
    audit: () => apiRequest("/api/logs/audit"),
    loginHistory: () => apiRequest("/api/logs/login-history"),
  },
  notifications: {
    list: () => apiRequest("/api/notifications"),
    create: (data) => apiRequest("/api/notifications", json("POST", data)),
  },
  reports: {
    revenue: () => apiRequest("/api/revenue"),
    revenueReport: () => apiRequest("/api/reports/revenue"),
    activity: () => apiRequest("/api/activity"),
    activityReport: () => apiRequest("/api/reports/activity"),
  },
  roles: {
    list: () => apiRequest("/api/roles"),
    create: (data) => apiRequest("/api/roles", json("POST", data)),
    get: (id) => apiRequest(byId("/api/roles", id)),
    update: (id, data) => apiRequest(byId("/api/roles", id), json("PUT", data)),
    remove: (id) => apiRequest(byId("/api/roles", id), { method: "DELETE" }),
    updatePermissions: (id, data) =>
      apiRequest(`${byId("/api/roles", id)}/permissions`, json("PUT", data)),
  },
  settings: {
    get: () => apiRequest("/api/settings"),
    updateGeneral: (data) => apiRequest("/api/settings/general", json("PUT", data)),
    updateEmail: (data) => apiRequest("/api/settings/email", json("PUT", data)),
    updateSms: (data) => apiRequest("/api/settings/sms", json("PUT", data)),
    updatePayment: (data) => apiRequest("/api/settings/payment", json("PUT", data)),
  },
  users: {
    list: () => apiRequest("/api/users"),
    create: (data) => apiRequest("/api/users", json("POST", data)),
    get: (id) => apiRequest(byId("/api/users", id)),
    update: (id, data) => apiRequest(byId("/api/users", id), json("PUT", data)),
    remove: (id) => apiRequest(byId("/api/users", id), { method: "DELETE" }),
    updateStatus: (id, data) => apiRequest(`${byId("/api/users", id)}/status`, json("PUT", data)),
  },
};
