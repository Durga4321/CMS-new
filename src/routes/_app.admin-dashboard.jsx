import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  DollarSign,
  Stethoscope,
  UserCog,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useApiResource } from "@/hooks/use-api-resource";
import { api, getPayload, toArray } from "@/lib/api";
import { formatCurrency, formatNumber } from "@/lib/api-normalizers";

export const Route = createFileRoute("/_app/admin-dashboard")({
  component: AdminDashboardPage,
  head: () => ({ meta: [{ title: "Admin Dashboard - Medisuite" }] }),
});

const stats = [
  {
    label: "Total Doctors",
    key: "totalDoctors",
    icon: Stethoscope,
    to: "/doctors",
    tone: "bg-primary-soft text-primary",
  },
  {
    label: "Total Patients",
    key: "totalPatients",
    icon: Users,
    to: "/patients",
    tone: "bg-info/10 text-info",
  },
  {
    label: "Today Appointments",
    key: "todayAppointments",
    icon: CalendarDays,
    to: "/appointments",
    search: { date: new Date().toISOString().slice(0, 10) },
    tone: "bg-success/10 text-success",
  },
  {
    label: "Revenue",
    key: "revenue",
    icon: DollarSign,
    to: "/admin-reports",
    tone: "bg-warning/15 text-warning-foreground",
  },
];

const modules = [
  {
    label: "Doctors",
    description: "Add, edit, delete and configure doctor schedules.",
    icon: Stethoscope,
    to: "/doctors",
  },
  {
    label: "Staff",
    description: "Create staff accounts, edit roles and disable access.",
    icon: UserCog,
    to: "/staff",
  },
  {
    label: "Schedule Setup",
    description: "Set global slot duration, working hours and holidays.",
    icon: CalendarDays,
    to: "/schedule",
  },
  {
    label: "Patients",
    description: "Review patient profiles, visit history and prescriptions.",
    icon: Users,
    to: "/patients",
  },
  {
    label: "Appointments",
    description: "Monitor appointments by date, doctor and status.",
    icon: ClipboardList,
    to: "/appointments",
  },
  {
    label: "Reports",
    description: "Open daily appointments, revenue and doctor-wise reports.",
    icon: BarChart3,
    to: "/admin-reports",
  },
];

function AdminDashboardPage() {
  const { data, loading, error } = useApiResource(loadAdminDashboard, emptyDashboardData);

  return (
    <>
      <PageHeader
        title="Admin Dashboard"
        description="Navigate clinic operations from one admin console."
      />

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <DashboardStat key={stat.label} stat={stat} value={data[stat.key]} loading={loading} />
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {modules.map((module) => (
          <Link
            key={module.label}
            to={module.to}
            className="rounded-xl border border-border bg-card p-5 shadow-card transition-colors hover:border-primary/40 hover:bg-secondary/40 focus:outline-none focus:ring-2 focus:ring-ring/20"
          >
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                <module.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold" title={module.label}>
                  {module.label}
                </h2>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {module.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}

const emptyDashboardData = {
  totalDoctors: "",
  totalPatients: "",
  todayAppointments: "",
  revenue: "",
};

function DashboardStat({ stat, value, loading }) {
  return (
    <Link
      to={stat.to}
      search={stat.search}
      className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elev focus:outline-none focus:ring-2 focus:ring-ring/20"
    >
      <div className={`grid h-10 w-10 place-items-center rounded-lg ${stat.tone}`}>
        <stat.icon className="h-5 w-5" />
      </div>
      <div className="mt-4 truncate text-sm text-muted-foreground" title={stat.label}>
        {stat.label}
      </div>
      <div
        className="mt-1 h-8 truncate text-2xl font-semibold tracking-tight"
        title={String(value ?? "")}
      >
        {loading ? "" : value}
      </div>
    </Link>
  );
}

async function loadAdminDashboard() {
  const [doctors, patients, todayAppointments, revenueReport, revenue] = await Promise.all([
    readApiValue(api.doctors.list),
    readApiValue(api.patients.list),
    readApiValue(api.appointments.today),
    readApiValue(api.reports.revenueReport),
    readApiValue(api.reports.revenue),
  ]);

  return {
    totalDoctors: formatOptionalNumber(countFromResponse(doctors)),
    totalPatients: formatOptionalNumber(countFromResponse(patients)),
    todayAppointments: formatOptionalNumber(countFromResponse(todayAppointments)),
    revenue: formatOptionalCurrency(readRevenueValue(revenueReport, revenue)),
  };
}

async function readApiValue(loader) {
  try {
    return await loader();
  } catch {
    return null;
  }
}

function countFromResponse(response) {
  if (!response) return null;
  const payload = getPayload(response);
  if (Array.isArray(payload)) return payload.length;
  const rows = toArray(response);
  if (rows.length) return rows.length;
  const total =
    payload?.total ??
    payload?.count ??
    payload?.totalCount ??
    payload?.totalRecords ??
    payload?.recordsTotal;
  return Number.isFinite(Number(total)) ? Number(total) : null;
}

function readRevenueValue(reportResponse, revenueResponse) {
  const report = getPayload(reportResponse) ?? {};
  const direct =
    report.totalRevenue ?? report.revenue ?? report.monthlyRevenue ?? report.revenueMtd ?? null;
  if (Number.isFinite(Number(direct))) return Number(direct);

  const series = toArray(revenueResponse);
  if (!series.length) return null;
  return series.reduce(
    (sum, item) => sum + Number(item.revenue ?? item.totalRevenue ?? item.amount ?? 0),
    0,
  );
}

function formatOptionalNumber(value) {
  return Number.isFinite(Number(value)) ? formatNumber(value) : "";
}

function formatOptionalCurrency(value) {
  return Number.isFinite(Number(value)) ? formatCurrency(value) : "";
}
