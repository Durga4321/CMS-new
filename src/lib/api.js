export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() || "";
export const AUTH_API_BASE_URL = API_BASE_URL;
const NEW_API_BASE_URL = "https://posological-bea-subacademically.ngrok-free.dev";
export const APPOINTMENT_API_BASE_URL =
  import.meta.env.VITE_APPOINTMENT_API_BASE_URL?.trim() || NEW_API_BASE_URL;
export const PATIENT_API_BASE_URL =
  import.meta.env.VITE_PATIENT_API_BASE_URL?.trim() || NEW_API_BASE_URL;
export const DOCTOR_API_BASE_URL =
  import.meta.env.VITE_DOCTOR_API_BASE_URL?.trim() || NEW_API_BASE_URL;
export const RECEPTION_API_BASE_URL =
  import.meta.env.VITE_RECEPTION_API_BASE_URL?.trim() || NEW_API_BASE_URL;

const TOKEN_KEY = "clinic_command_center_token";
const USER_KEY = "clinic_command_center_user";
const USER_ACTIVITY_KEY = "clinic_command_center_user_activity";
const USER_DIRECTORY_KEY = "clinic_command_center_user_directory";
const USER_LOGIN_HISTORY_KEY = "clinic_command_center_login_history";
const SYSTEM_LOG_KEY = "clinic_command_center_system_logs";

export function getAuthToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(TOKEN_KEY) ?? window.sessionStorage.getItem(TOKEN_KEY) ?? "";
}

export function hasAuthSession() {
  return Boolean(getAuthToken());
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
    window.localStorage.setItem(
      USER_ACTIVITY_KEY,
      JSON.stringify({ [email]: timestamp.toISOString() }),
    );
  }
}

export function getStoredUserActivity(email) {
  if (typeof window === "undefined") return "";
  const key = String(email ?? "")
    .trim()
    .toLowerCase();
  if (!key) return "";
  try {
    const activity = JSON.parse(window.localStorage.getItem(USER_ACTIVITY_KEY) ?? "{}");
    return activity[key] ? formatActivityTime(activity[key]) : "";
  } catch {
    return "";
  }
}

export function rememberUserDirectoryEntry(user, source = "system") {
  if (typeof window === "undefined" || !user) return;
  const email = readField(user, ["email", "Email", "username", "Username"]).toLowerCase();
  if (!email) return;
  const entry = normalizeDirectoryUser(user, source);
  try {
    const users = JSON.parse(window.localStorage.getItem(USER_DIRECTORY_KEY) ?? "{}");
    users[email] = { ...(users[email] ?? {}), ...entry };
    window.localStorage.setItem(USER_DIRECTORY_KEY, JSON.stringify(users));
  } catch {
    window.localStorage.setItem(USER_DIRECTORY_KEY, JSON.stringify({ [email]: entry }));
  }
}

export function getStoredUserDirectory() {
  if (typeof window === "undefined") return [];
  try {
    return Object.values(JSON.parse(window.localStorage.getItem(USER_DIRECTORY_KEY) ?? "{}"));
  } catch {
    return [];
  }
}

export function getRegisteredUsers() {
  if (typeof window === "undefined") return [];
  try {
    return Object.values(
      JSON.parse(window.localStorage.getItem("clinic_registered_users") ?? "{}"),
    );
  } catch {
    return [];
  }
}

export function recordLoginHistory(user, details = {}) {
  if (typeof window === "undefined" || !user) return;
  const entry = normalizeLoginEntry(user, details);
  rememberUserDirectoryEntry(user, "login");
  appendStoredRow(USER_LOGIN_HISTORY_KEY, entry);
  recordSystemLog({
    user: entry.name,
    email: entry.email,
    role: entry.role,
    action: "Login",
    module: "Auth",
    time: entry.time,
    ip: entry.ip,
  });
}

export function recordSystemLog(log) {
  if (typeof window === "undefined" || !log) return;
  appendStoredRow(SYSTEM_LOG_KEY, {
    id: log.id ?? `local-log-${Date.now()}`,
    user: log.user ?? log.name ?? log.email ?? "System",
    email: log.email ?? "",
    role: log.role ?? "",
    action: log.action ?? "Updated",
    module: log.module ?? "System",
    time: log.time ?? new Date().toISOString(),
    ip: log.ip ?? "",
  });
}

export function getStoredLoginHistory() {
  return readStoredRows(USER_LOGIN_HISTORY_KEY);
}

export function getStoredSystemLogs() {
  return readStoredRows(SYSTEM_LOG_KEY);
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

  const url = /^https?:\/\//i.test(path) ? path : `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
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

function normalizeDirectoryUser(user, source) {
  const firstLast = [user.firstName ?? user.first_name, user.lastName ?? user.last_name]
    .filter(Boolean)
    .join(" ");
  const name = readField(
    user,
    ["name", "Name", "fullName", "FullName", "displayName", "username", "Username"],
    firstLast,
  );
  return {
    id: readField(user, ["id", "_id", "userId", "doctorId", "staffId", "adminId"], ""),
    name: name || readField(user, ["email", "Email"], "User"),
    email: readField(user, ["email", "Email", "username", "Username"], ""),
    role: readField(user, ["role", "roleName", "userRole", "type"], "User"),
    phone: readField(user, ["phone", "mobile", "phoneNumber", "mobileNumber"], ""),
    clinic: readField(user, ["clinic", "clinicName", "assignedClinic"], ""),
    memberSince: readField(
      user,
      ["memberSince", "createdAt", "created_at"],
      new Date().toISOString(),
    ),
    lastActive: readField(user, ["lastActive", "lastLoginAt"], ""),
    status: readField(user, ["status"], "active"),
    source,
  };
}

function normalizeLoginEntry(user, details) {
  const directoryUser = normalizeDirectoryUser(user, "login");
  return {
    id: details.id ?? `login-${Date.now()}`,
    name: directoryUser.name,
    role: directoryUser.role,
    email: directoryUser.email,
    time: details.time ?? new Date().toISOString(),
    ip: details.ip ?? readField(details, ["ipAddress", "ip_address"], ""),
  };
}

function appendStoredRow(key, row) {
  const rows = readStoredRows(key);
  window.localStorage.setItem(key, JSON.stringify([row, ...rows].slice(0, 500)));
}

function readStoredRows(key) {
  if (typeof window === "undefined") return [];
  try {
    const rows = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
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

async function apiRequestWithFallback(primaryPath, fallbackPath, options = {}) {
  try {
    return await apiRequest(primaryPath, options);
  } catch (error) {
    if (error?.status === 404) {
      return apiRequest(fallbackPath, options);
    }
    throw error;
  }
}

async function apiRequestWithHostFallback(primaryPath, primaryOptions, fallbackPath, fallbackOptions = primaryOptions) {
  try {
    return await apiRequest(primaryPath, primaryOptions);
  } catch (error) {
    if (error?.status === 404 || error?.status === 400) {
      return apiRequest(fallbackPath, fallbackOptions);
    }
    throw error;
  }
}

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
      apiRequest(`${AUTH_API_BASE_URL}/api/auth/super-admin-login`, {
        ...json("POST", data),
        auth: false,
      }),
    register: (data) =>
      apiRequest(`${AUTH_API_BASE_URL}/api/auth/register`, { ...json("POST", data), auth: false }),
    login: (data) => apiRequest(`${AUTH_API_BASE_URL}/api/auth/login`, { ...json("POST", data), auth: false }),
    forgotPassword: (data) =>
      apiRequest(`${AUTH_API_BASE_URL}/api/auth/forgot-password`, {
        ...json("POST", data),
        auth: false,
      }),
    verifyOtp: (data) =>
      apiRequest(`${AUTH_API_BASE_URL}/api/auth/verify-otp`, {
        ...json("POST", data),
        auth: false,
      }),
    resetPassword: (data) =>
      apiRequest(`${AUTH_API_BASE_URL}/api/auth/reset-password`, {
        ...json("POST", data),
        auth: false,
      }),
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
  doctors: {
    list: () => apiRequest(`${DOCTOR_API_BASE_URL}/api/Doctor`),
    create: (data) => apiRequest(`${DOCTOR_API_BASE_URL}/api/Doctor`, json("POST", data)),
    get: (id) => apiRequest(`${DOCTOR_API_BASE_URL}/api/Doctor/${encodeURIComponent(id)}`),
    update: (id, data) =>
      apiRequest(`${DOCTOR_API_BASE_URL}/api/Doctor/${encodeURIComponent(id)}`, json("PUT", data)),
    remove: (id) =>
      apiRequest(`${DOCTOR_API_BASE_URL}/api/Doctor/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
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
    list: () => apiRequest(`${PATIENT_API_BASE_URL}/api/Patient`),
    create: (data) => apiRequest(`${PATIENT_API_BASE_URL}/api/Patient`, json("POST", data)),
    get: (id) => apiRequest(`${PATIENT_API_BASE_URL}/api/Patient/${encodeURIComponent(id)}`),
    update: (id, data) =>
      apiRequest(`${PATIENT_API_BASE_URL}/api/Patient/${encodeURIComponent(id)}`, json("PUT", data)),
    remove: (id) =>
      apiRequest(`${PATIENT_API_BASE_URL}/api/Patient/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
  },
  appointments: {
    list: () => apiRequest(`${APPOINTMENT_API_BASE_URL}/api/Appointment`),
    create: (data) => apiRequest(`${APPOINTMENT_API_BASE_URL}/api/Appointment`, json("POST", data)),
    get: (id) => apiRequest(`${APPOINTMENT_API_BASE_URL}/api/Appointment/${encodeURIComponent(id)}`),
    today: async () => {
      const allAppointments = toArray(await apiRequest(`${APPOINTMENT_API_BASE_URL}/api/Appointment`));
      const currentDate = new Date().toISOString().slice(0, 10);
      return allAppointments.filter((item) => String(item.date).slice(0, 10) === currentDate);
    },
    slots: (params) => apiRequest(withQuery(`${APPOINTMENT_API_BASE_URL}/api/Schedule/day-slots`, params)),
    lockSlot: (data) =>
      apiRequestWithFallback(
        `${APPOINTMENT_API_BASE_URL}/api/Appointment/lock-slot`,
        `${APPOINTMENT_API_BASE_URL}/api/appointments/lock-slot`,
        json("POST", data),
      ),
    setStatus: (id, status) =>
      apiRequest(
        `${APPOINTMENT_API_BASE_URL}/api/Appointment/${encodeURIComponent(id)}/status?status=${encodeURIComponent(
          status,
        )}`,
        { method: "PATCH" },
      ),
    confirm: (id, data = {}) =>
      apiRequestWithFallback(
        `${APPOINTMENT_API_BASE_URL}/api/Appointment/${encodeURIComponent(id)}/confirm`,
        `${APPOINTMENT_API_BASE_URL}/api/appointments/${encodeURIComponent(id)}/confirm`,
        json("POST", data),
      ),
    complete: (id, data = {}) =>
      apiRequestWithFallback(
        `${APPOINTMENT_API_BASE_URL}/api/Appointment/${encodeURIComponent(id)}/complete`,
        `${APPOINTMENT_API_BASE_URL}/api/appointments/${encodeURIComponent(id)}/complete`,
        json("PUT", data),
      ),
    noShow: (id, data = {}) =>
      apiRequestWithFallback(
        `${APPOINTMENT_API_BASE_URL}/api/Appointment/${encodeURIComponent(id)}/no-show`,
        `${APPOINTMENT_API_BASE_URL}/api/appointments/${encodeURIComponent(id)}/no-show`,
        json("PUT", data),
      ),
  },
  billing: {
    list: () => apiRequest("/api/billing"),
    create: (data) => apiRequest("/api/billing", json("POST", data)),
    get: (id) => apiRequest(byId("/api/billing", id)),
    byAppointment: (appointmentId) =>
      apiRequest(`${byId("/api/billing/by-appointment", appointmentId)}`),
  },
  receptionDashboard: {
    summary: () =>
      apiRequestWithFallback(
        `${RECEPTION_API_BASE_URL}/api/reception-dashboard/summary`,
        `${API_BASE_URL}/api/reception-dashboard/summary`,
      ),
    appointments: () =>
      apiRequestWithFallback(
        `${RECEPTION_API_BASE_URL}/api/reception-dashboard/appointments`,
        `${API_BASE_URL}/api/reception-dashboard/appointments`,
      ),
    queue: () =>
      apiRequestWithFallback(
        `${RECEPTION_API_BASE_URL}/api/reception-dashboard/queue`,
        `${API_BASE_URL}/api/reception-dashboard/queue`,
      ),
    quickActions: () =>
      apiRequestWithFallback(
        `${RECEPTION_API_BASE_URL}/api/reception-dashboard/quick-actions`,
        `${API_BASE_URL}/api/reception-dashboard/quick-actions`,
      ),
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
  staff: {
    list: () => apiRequest("/api/staff"),
    create: (data) => apiRequest("/api/staff", json("POST", data)),
    get: (id) => apiRequest(byId("/api/staff", id)),
    update: (id, data) => apiRequest(byId("/api/staff", id), json("PUT", data)),
    remove: (id) => apiRequest(byId("/api/staff", id), { method: "DELETE" }),
    updateStatus: (id, data) => apiRequest(`${byId("/api/staff", id)}/status`, json("PUT", data)),
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
