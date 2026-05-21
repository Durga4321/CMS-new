export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

const TOKEN_KEY = "clinic_command_center_token";
const USER_KEY = "clinic_command_center_user";
const USER_ACTIVITY_KEY = "clinic_command_center_user_activity";

export function getAuthToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(TOKEN_KEY) ?? window.sessionStorage.getItem(TOKEN_KEY) ?? "";
}

export function hasAuthSession() {
  return Boolean(getAuthToken() || getAuthUser());
}

export function setAuthToken(token, remember = true) {
  if (typeof window === "undefined" || !token) return;
  const storage = remember ? window.localStorage : window.sessionStorage;
  const otherStorage = remember ? window.sessionStorage : window.localStorage;
  storage.setItem(TOKEN_KEY, token);
  otherStorage.removeItem(TOKEN_KEY);
}

export function getAuthUser() {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(USER_KEY) ?? window.sessionStorage.getItem(USER_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function setAuthUser(user, remember = true) {
  if (typeof window === "undefined" || !user) return;
  const storage = remember ? window.localStorage : window.sessionStorage;
  const otherStorage = remember ? window.sessionStorage : window.localStorage;
  storage.setItem(USER_KEY, JSON.stringify(user));
  otherStorage.removeItem(USER_KEY);
}

export function markUserActive(user, timestamp = new Date()) {
  if (typeof window === "undefined") return;
  const email = readField(user, ["email", "Email", "username", "Username"]).toLowerCase();
  if (!email) return;
  try {
    const activity = JSON.parse(window.localStorage.getItem(USER_ACTIVITY_KEY) ?? "{}");
    activity[email] = timestamp.toISOString();
    window.localStorage.setItem(USER_ACTIVITY_KEY, JSON.stringify(activity));
  } catch {
    window.localStorage.setItem(USER_ACTIVITY_KEY, JSON.stringify({ [email]: timestamp.toISOString() }));
  }
}

export function getStoredUserActivity(email) {
  if (typeof window === "undefined") return "";
  const key = String(email ?? "").trim().toLowerCase();
  if (!key) return "";
  try {
    const activity = JSON.parse(window.localStorage.getItem(USER_ACTIVITY_KEY) ?? "{}");
    return activity[key] ? formatActivityTime(activity[key]) : "";
  } catch {
    return "";
  }
}

export function clearAuthToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  window.sessionStorage.removeItem(TOKEN_KEY);
  window.sessionStorage.removeItem(USER_KEY);
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
    response?.authToken ??
    response?.auth_token ??
    response?.jwt ??
    response?.jwtToken ??
    response?.bearerToken ??
    response?.data?.token ??
    response?.data?.accessToken ??
    response?.data?.access_token ??
    response?.data?.authToken ??
    response?.data?.auth_token ??
    response?.data?.jwt ??
    response?.data?.jwtToken ??
    response?.data?.bearerToken ??
    response?.result?.token ??
    response?.result?.accessToken ??
    response?.result?.access_token ??
    ""
  );
}

export function readUser(response) {
  const payload = getPayload(response);
  return (
    payload?.user ??
    payload?.account ??
    payload?.profile ??
    payload?.superAdmin ??
    payload?.SuperAdmin ??
    payload?.super_admin ??
    response?.user ??
    response?.data?.user ??
    response?.data?.account ??
    response?.data?.profile ??
    response?.data?.superAdmin ??
    response?.data?.SuperAdmin ??
    response?.data?.super_admin ??
    null
  );
}

export function readField(source, keys, fallback = "") {
  if (!source || typeof source !== "object") return fallback;
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return fallback;
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
  if (role.includes("superadmin") || role.includes("super_admin")) return "superadmin";
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

function formatActivityTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const byId = (path, id) => `${path}/${encodeURIComponent(id)}`;
const json = (method, body) => ({ method, body });
const withQuery = (path, params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      query.set(key, value);
    }
  });
  const text = query.toString();
  return text ? `${path}?${text}` : path;
};

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
    verifyOtp: (data) =>
      apiRequest("/api/auth/verify-otp", { ...json("POST", data), auth: false }),
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
  patients: {
    list: () => apiRequest("/api/patients"),
    create: (data) => apiRequest("/api/patients", json("POST", data)),
    get: (id) => apiRequest(byId("/api/patients", id)),
    update: (id, data) => apiRequest(byId("/api/patients", id), json("PUT", data)),
    remove: (id) => apiRequest(byId("/api/patients", id), { method: "DELETE" }),
  },
  appointments: {
    list: () => apiRequest("/api/appointments"),
    create: (data) => apiRequest("/api/appointments", json("POST", data)),
    get: (id) => apiRequest(byId("/api/appointments", id)),
    today: () => apiRequest("/api/appointments/today"),
    slots: (params) => apiRequest(withQuery("/api/appointments/slots", params)),
    lockSlot: (data) => apiRequest("/api/appointments/lock-slot", json("POST", data)),
    confirm: (id, data = {}) =>
      apiRequest(`${byId("/api/appointments", id)}/confirm`, json("POST", data)),
    complete: (id, data = {}) =>
      apiRequest(`${byId("/api/appointments", id)}/complete`, json("PUT", data)),
    noShow: (id, data = {}) =>
      apiRequest(`${byId("/api/appointments", id)}/no-show`, json("PUT", data)),
  },
  billing: {
    list: () => apiRequest("/api/billing"),
    create: (data) => apiRequest("/api/billing", json("POST", data)),
    get: (id) => apiRequest(byId("/api/billing", id)),
    byAppointment: (appointmentId) =>
      apiRequest(`${byId("/api/billing/by-appointment", appointmentId)}`),
  },
  receptionDashboard: {
    summary: () => apiRequest("/api/reception-dashboard/summary"),
    appointments: () => apiRequest("/api/reception-dashboard/appointments"),
    queue: () => apiRequest("/api/reception-dashboard/queue"),
    quickActions: () => apiRequest("/api/reception-dashboard/quick-actions"),
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
