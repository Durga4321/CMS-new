import { getPayload, toArray } from "@/lib/api";

export const permissionModules = ["Dashboard", "Clinics", "Admins", "Users", "Reports", "Settings"];
export const permissionActions = ["View", "Create", "Edit", "Delete"];

const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

export function text(value, fallback = "Not provided") {
  return value === null || value === undefined || value === "" ? fallback : String(value);
}

export function normalizeStatus(value) {
  const status = String(value ?? "").toLowerCase();
  if (["active", "inactive", "pending"].includes(status)) return status;
  if (value === true || status === "enabled") return "active";
  if (value === false || status === "disabled") return "inactive";
  return "pending";
}

export function formatNumber(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number.toLocaleString() : text(value, "0");
}

export function formatCurrency(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number)
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(number)
    : text(value, "$0");
}

export function normalizeClinic(item, index = 0) {
  const location = text(
    item.location ?? item.address ?? [item.city, item.state].filter(Boolean).join(", "),
  );
  return {
    id: text(item.id ?? item._id ?? item.clinicId ?? item.code, `CL-${index + 1}`),
    name: text(item.name ?? item.clinicName ?? item.title, "Unnamed clinic"),
    email: text(item.email ?? item.contactEmail, ""),
    address: text(item.address ?? item.location, location),
    location,
    contact: text(item.contact ?? item.phone ?? item.mobile ?? item.email),
    admins: item.adminsCount ?? item.adminCount ?? item.totalAdmins ?? item.admins?.length ?? 0,
    status: normalizeStatus(item.status ?? item.isActive),
  };
}

export function normalizeAdmin(item, index = 0) {
  return {
    id: text(item.id ?? item._id ?? item.adminId, `AD-${index + 1}`),
    name: text(
      item.name ?? item.fullName ?? [item.firstName, item.lastName].filter(Boolean).join(" "),
      "Unnamed admin",
    ),
    email: text(item.email),
    clinic: text(item.clinicName ?? item.clinic?.name ?? item.clinic),
    role: text(item.roleName ?? item.role?.name ?? item.role, "Admin"),
    status: normalizeStatus(item.status ?? item.isActive),
  };
}

export function normalizeUser(item, index = 0) {
  return {
    id: text(item.id ?? item._id ?? item.userId, `U-${index + 1}`),
    name: text(
      item.name ?? item.fullName ?? [item.firstName, item.lastName].filter(Boolean).join(" "),
      "Unnamed user",
    ),
    email: text(item.email),
    role: text(item.roleName ?? item.role?.name ?? item.role, "User"),
    clinic: text(item.clinicName ?? item.clinic?.name ?? item.clinic),
    phone: text(item.phone ?? item.mobile),
    memberSince: text(item.memberSince ?? item.createdAt),
    lastActive: text(item.lastActive ?? item.lastLoginAt ?? item.updatedAt, "Never"),
    status: normalizeStatus(item.status ?? item.isActive),
  };
}

export function normalizeRole(item, index = 0) {
  return {
    id: text(item.id ?? item._id ?? item.roleId ?? item.name, `role-${index + 1}`),
    name: text(item.name ?? item.roleName, "Unnamed role"),
    users: item.usersCount ?? item.userCount ?? item.users?.length ?? 0,
    description: text(item.description, "No description available"),
    permissions: item.permissions ?? {},
  };
}

export function normalizeNotification(item, index = 0) {
  return {
    id: text(item.id ?? item._id ?? item.notificationId, `notification-${index + 1}`),
    title: text(item.title ?? item.subject, "Notification"),
    message: text(item.message ?? item.body ?? item.description, ""),
    time: text(item.time ?? item.createdAt ?? item.created_at, ""),
    type: text(item.type ?? item.level, "info").toLowerCase(),
    read: Boolean(item.read ?? item.isRead),
  };
}

export function normalizeLog(item, index = 0) {
  return {
    id: text(item.id ?? item._id ?? item.logId, `log-${index + 1}`),
    user: text(item.userName ?? item.user?.name ?? item.user, "System"),
    action: text(item.action ?? item.message ?? item.event, "Action"),
    module: text(item.module ?? item.resource ?? item.type, "System"),
    time: text(item.time ?? item.timestamp ?? item.createdAt, ""),
    ip: text(item.ip ?? item.ipAddress ?? item.ip_address, "-"),
  };
}

export function normalizePatient(item, index = 0) {
  item = item ?? {};
  if (item.patient && typeof item.patient === "object") item = item.patient;
  const firstName = item.firstName ?? item.first_name;
  const lastName = item.lastName ?? item.last_name;
  const name = item.name ?? item.fullName ?? [firstName, lastName].filter(Boolean).join(" ");
  return {
    ...item,
    id: text(
      item.id ?? item._id ?? item.patientId ?? item.patient_id ?? item.pid,
      `PID-${index + 1}`,
    ),
    patientId: text(item.patientId ?? item.patient_id ?? item.pid ?? item.id, `PID-${index + 1}`),
    name: text(name, "Unnamed patient"),
    age: text(item.age, ""),
    dob: text(item.dob ?? item.dateOfBirth ?? item.date_of_birth, ""),
    gender: text(item.gender, "Female"),
    type: text(item.type ?? item.patientType ?? item.patient_type, "OPD"),
    phone: text(item.phone ?? item.mobile ?? item.mobileNumber ?? item.mobile_number, ""),
    email: text(item.email, ""),
    street: text(item.street ?? item.address ?? item.streetAddress ?? item.street_address, ""),
    city: text(item.city, ""),
    state: text(item.state, ""),
    pinCode: text(item.pinCode ?? item.pincode ?? item.pin_code ?? item.zipCode, ""),
    emergencyName: text(
      item.emergencyName ?? item.emergencyContactName ?? item.emergency_contact_name,
      "",
    ),
    emergencyPhone: text(
      item.emergencyPhone ??
        item.emergencyContactPhone ??
        item.emergency_contact_phone ??
        item.emergencyContactMobileNumber,
      "",
    ),
    chronicDiseases: normalizeStringList(item.chronicDiseases ?? item.chronic_diseases),
  };
}

export function normalizeAppointment(item, index = 0) {
  item = item ?? {};
  const patientObject = item.patient && typeof item.patient === "object" ? item.patient : null;
  const patientName =
    item.patientName ??
    item.patient_name ??
    patientObject?.name ??
    patientObject?.fullName ??
    item.patient;
  const doctorObject = item.doctor && typeof item.doctor === "object" ? item.doctor : null;
  const doctorName =
    item.doctorName ??
    item.doctor_name ??
    doctorObject?.name ??
    doctorObject?.fullName ??
    item.doctor;
  return {
    ...item,
    id: text(item.id ?? item._id ?? item.appointmentId ?? item.appointment_id, `APT-${index + 1}`),
    patientId: text(
      item.patientId ?? item.patient_id ?? patientObject?.id ?? patientObject?._id,
      "",
    ),
    patient: text(patientName, "Unnamed patient"),
    doctor: text(doctorName, "Doctor not assigned"),
    date: text(item.date ?? item.appointmentDate ?? item.appointment_date, ""),
    time: text(item.time ?? item.slot ?? item.appointmentTime ?? item.appointment_time, ""),
    status: normalizeAppointmentStatus(item.status ?? item.appointmentStatus),
  };
}

export function normalizeBill(item, index = 0) {
  item = item ?? {};
  const patientObject = item.patient && typeof item.patient === "object" ? item.patient : null;
  return {
    ...item,
    id: text(item.id ?? item._id ?? item.billId ?? item.invoiceId, `INV-${index + 1}`),
    appointmentId: text(item.appointmentId ?? item.appointment_id ?? item.appointment?.id, ""),
    patientId: text(
      item.patientId ?? item.patient_id ?? patientObject?.id ?? patientObject?._id,
      "",
    ),
    patient: text(item.patientName ?? item.patient_name ?? patientObject?.name ?? item.patient, ""),
    consultation: Number(
      item.consultation ?? item.consultationCharge ?? item.consultation_charge ?? 0,
    ),
    medicines: Number(item.medicines ?? item.medicineCharges ?? item.medicine_charges ?? 0),
    lab: Number(item.lab ?? item.labCharges ?? item.lab_charges ?? 0),
    total: Number(item.total ?? item.totalAmount ?? item.total_amount ?? item.amount ?? 0),
    mode: text(item.mode ?? item.paymentMode ?? item.payment_mode, "UPI"),
    status: text(item.status ?? item.paymentStatus ?? item.payment_status, "Pending"),
    createdAt: text(item.createdAt ?? item.created_at, ""),
  };
}

export function normalizeReceptionSummary(response) {
  const data = getPayload(response) ?? {};
  return {
    todaysAppointments: Number(
      data.todaysAppointments ??
        data.todayAppointments ??
        data.appointmentsToday ??
        data.appointments ??
        0,
    ),
    waitingPatients: Number(data.waitingPatients ?? data.waiting ?? data.queue ?? 0),
    completedAppointments: Number(
      data.completedAppointments ?? data.completed ?? data.consulted ?? data.paid ?? 0,
    ),
  };
}

export function normalizeActivity(item, index = 0) {
  return {
    id: text(item.id ?? item._id ?? `activity-${index + 1}`),
    user: text(item.userName ?? item.user?.name ?? item.user, "System"),
    action: text(item.action ?? item.message ?? item.event, "updated"),
    target: text(item.target ?? item.resource ?? item.module, "record"),
    time: text(item.time ?? item.createdAt ?? item.timestamp, ""),
  };
}

export function normalizeRevenuePoint(item, index = 0) {
  return {
    month: text(item.month ?? item.label ?? item.period ?? item.date, `P${index + 1}`),
    revenue: Number(item.revenue ?? item.totalRevenue ?? item.amount ?? 0),
    expense: Number(item.expense ?? item.expenses ?? item.cost ?? 0),
  };
}

export function normalizeVisitPoint(item, index = 0) {
  return {
    day: text(item.day ?? item.label ?? item.date, `D${index + 1}`),
    visits: Number(item.visits ?? item.count ?? item.total ?? 0),
  };
}

export function normalizeSummaryStats(response) {
  const data = getPayload(response) ?? {};
  if (Array.isArray(data)) {
    return data.map((item, index) => ({
      label: text(item.label ?? item.name, `Metric ${index + 1}`),
      value: text(item.value ?? item.count ?? 0, "0"),
      delta: text(item.delta ?? item.change, "0%"),
      trend: String(item.trend ?? "up").toLowerCase() === "down" ? "down" : "up",
      icon: item.icon ?? ["Building2", "ShieldCheck", "Users", "DollarSign"][index] ?? "Users",
      tone: item.tone ?? ["primary", "info", "success", "warning"][index] ?? "primary",
    }));
  }

  return [
    {
      label: "Total Clinics",
      value: formatNumber(data.totalClinics ?? data.clinics),
      delta: text(data.clinicsDelta ?? data.clinicGrowth, "0%"),
      trend: trend(data.clinicsDelta ?? data.clinicGrowth),
      icon: "Building2",
      tone: "primary",
    },
    {
      label: "Total Admins",
      value: formatNumber(data.totalAdmins ?? data.admins),
      delta: text(data.adminsDelta ?? data.adminGrowth, "0%"),
      trend: trend(data.adminsDelta ?? data.adminGrowth),
      icon: "ShieldCheck",
      tone: "info",
    },
    {
      label: "Active Users",
      value: formatNumber(data.activeUsers ?? data.users),
      delta: text(data.usersDelta ?? data.userGrowth, "0%"),
      trend: trend(data.usersDelta ?? data.userGrowth),
      icon: "Users",
      tone: "success",
    },
    {
      label: "Revenue (MTD)",
      value: formatCurrency(data.revenueMtd ?? data.monthlyRevenue ?? data.revenue),
      delta: text(data.revenueDelta ?? data.revenueGrowth, "0%"),
      trend: trend(data.revenueDelta ?? data.revenueGrowth),
      icon: "DollarSign",
      tone: "warning",
    },
  ];
}

export function normalizeClinicTypes(response) {
  const data = getPayload(response);
  const source = data?.clinicTypes ?? data?.types ?? data?.clinicsByType ?? data;
  return toArray(source).map((item, index) => ({
    name: text(item.name ?? item.type ?? item.label, `Type ${index + 1}`),
    value: Number(item.value ?? item.count ?? item.total ?? 0),
    color: item.color ?? colors[index % colors.length],
  }));
}

export function normalizeTopClinics(response) {
  const data = getPayload(response);
  return toArray(data?.topClinics ?? data?.clinics ?? data).map((item, index) => ({
    id: text(item.id ?? item._id ?? `top-clinic-${index + 1}`),
    name: text(item.name ?? item.clinicName, "Unnamed clinic"),
    visits: formatNumber(item.visits ?? item.totalVisits),
    revenue: formatCurrency(item.revenue ?? item.totalRevenue),
    growth: text(item.growth ?? item.delta, "0%"),
  }));
}

function trend(value) {
  return String(value ?? "")
    .trim()
    .startsWith("-")
    ? "down"
    : "up";
}

function normalizeAppointmentStatus(value) {
  const status = String(value ?? "Waiting").toLowerCase();
  if (status.includes("paid")) return "Paid";
  if (status.includes("consult") || status.includes("complete")) return "Consulted";
  if (status.includes("no") && status.includes("show")) return "No-show";
  if (status.includes("cancel")) return "No-show";
  if (status.includes("wait") || status.includes("book") || status.includes("confirm"))
    return "Waiting";
  return text(value, "Waiting");
}

function normalizeStringList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}
