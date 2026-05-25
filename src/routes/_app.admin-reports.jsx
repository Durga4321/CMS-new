import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  DollarSign,
  FileDown,
  LineChart as LineChartIcon,
  Stethoscope,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { PageHeader, StatusBadge } from "@/components/layout/PageHeader";
import { api, getPayload, toArray } from "@/lib/api";
import { useApiResource } from "@/hooks/use-api-resource";
import { formatCurrency, normalizeAppointment } from "@/lib/api-normalizers";

export const Route = createFileRoute("/_app/admin-reports")({
  component: AdminReportsPage,
  head: () => ({ meta: [{ title: "Admin Reports - Medisuite" }] }),
});

const reportOptions = [
  { value: "daily", label: "Daily Appointments", icon: CalendarDays },
  { value: "revenue", label: "Revenue Report", icon: DollarSign },
  { value: "doctor", label: "Doctor-wise Report", icon: Stethoscope },
];

function AdminReportsPage() {
  const [reportType, setReportType] = useState("daily");
  const [viewMode, setViewMode] = useState("table");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [doctorFilter, setDoctorFilter] = useState("all");

  const { data, loading, error } = useApiResource(async () => {
    const [appointmentsResponse, revenueResponse, revenueReportResponse] = await Promise.all([
      api.appointments.list().catch(() => []),
      api.reports.revenue().catch(() => []),
      api.reports.revenueReport().catch(() => ({})),
    ]);

    const appointments = toArray(appointmentsResponse).map(normalizeAdminAppointment);
    return {
      appointments,
      revenueSeries: buildRevenueSeries(revenueResponse, revenueReportResponse),
    };
  }, emptyReportData);

  const doctors = useMemo(
    () => [...new Set(data.appointments.map((item) => item.doctor).filter(Boolean))],
    [data.appointments],
  );
  const filteredAppointments = useMemo(
    () =>
      data.appointments.filter(
        (item) =>
          isWithinDateRange(item.date, fromDate, toDate) &&
          (doctorFilter === "all" || item.doctor === doctorFilter),
      ),
    [data.appointments, doctorFilter, fromDate, toDate],
  );
  const reportRows = useMemo(
    () => buildReportRows(reportType, filteredAppointments, data.revenueSeries, fromDate, toDate),
    [data.revenueSeries, filteredAppointments, fromDate, reportType, toDate],
  );
  const chartData = useMemo(() => buildChartData(reportType, reportRows), [reportRows, reportType]);
  const selectedReport = reportOptions.find((option) => option.value === reportType);

  const exportCsv = () => {
    const headers = getTableHeaders(reportType);
    const rows = reportRows.map((row) => headers.map((header) => row[header.key]));
    const csv = [headers.map((header) => header.label), ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `admin-${reportType}-report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        title="Reports Dashboard"
        description="Review daily appointments, revenue and doctor-wise performance."
        actions={
          <Button variant="outline" className="gap-1.5" onClick={exportCsv}>
            <FileDown className="h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-3">
        {reportOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setReportType(option.value)}
            className={`rounded-xl border p-4 text-left shadow-card transition-colors focus:outline-none focus:ring-2 focus:ring-ring/20 ${
              reportType === option.value
                ? "border-primary bg-primary-soft text-primary"
                : "border-border bg-card hover:bg-secondary/40"
            }`}
          >
            <option.icon className="h-5 w-5" />
            <div className="mt-3 font-semibold">{option.label}</div>
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-border bg-card shadow-card">
        <div className="grid gap-3 border-b border-border p-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
          <Field label="From Date">
            <input
              type="date"
              value={fromDate}
              max={toDate}
              onChange={(event) => setFromDate(event.target.value)}
              className={controlClass}
            />
          </Field>
          <Field label="To Date">
            <input
              type="date"
              value={toDate}
              min={fromDate}
              onChange={(event) => setToDate(event.target.value)}
              className={controlClass}
            />
          </Field>
          <Field label="Filter by Doctor">
            <select
              value={doctorFilter}
              onChange={(event) => setDoctorFilter(event.target.value)}
              className={controlClass}
            >
              <option value="all">All doctors</option>
              {doctors.map((doctor) => (
                <option key={doctor} value={doctor}>
                  {doctor}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex rounded-lg border border-border bg-secondary p-1">
            {[
              { value: "table", label: "Table", icon: BarChart3 },
              { value: "chart", label: "Chart", icon: LineChartIcon },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setViewMode(option.value)}
                className={`inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors ${
                  viewMode === option.value
                    ? "bg-card text-foreground shadow-card"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <option.icon className="h-4 w-4" />
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="border-b border-border px-5 py-3 text-sm text-destructive">{error}</div>
        )}

        <div className="border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">Report View</h2>
          <p className="text-sm text-muted-foreground">
            {selectedReport?.label}
            {fromDate || toDate ? ` from ${fromDate || "start"} to ${toDate || "today"}` : ""}.
          </p>
        </div>

        {viewMode === "chart" ? (
          <ReportChart reportType={reportType} data={chartData} loading={loading} />
        ) : (
          <ReportTable reportType={reportType} rows={reportRows} loading={loading} />
        )}
      </div>
    </>
  );
}

const emptyReportData = { appointments: [], revenueSeries: [] };
const controlClass =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20";

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

function ReportTable({ reportType, rows, loading }) {
  const headers = getTableHeaders(reportType);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            {headers.map((header) => (
              <th key={header.key} className="px-5 py-3 font-medium">
                {header.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
              {headers.map((header) => (
                <td key={header.key} className="px-5 py-3.5">
                  {header.key === "status" ? (
                    <StatusBadge status={row[header.key]} />
                  ) : (
                    row[header.key]
                  )}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={headers.length} className="px-5 py-12 text-center text-muted-foreground">
                {loading ? "Loading report..." : "No report data found for the selected filters."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ReportChart({ reportType, data, loading }) {
  if (data.length === 0) {
    return (
      <div className="grid h-80 place-items-center text-sm text-muted-foreground">
        {loading ? "Loading chart..." : "No chart data found for the selected filters."}
      </div>
    );
  }

  return (
    <div className="h-80 p-5">
      <ResponsiveContainer width="100%" height="100%">
        {reportType === "revenue" ? (
          <LineChart data={data}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
            <YAxis stroke="var(--muted-foreground)" fontSize={12} />
            <Tooltip />
            <Line type="monotone" dataKey="revenue" stroke="var(--chart-1)" strokeWidth={2.5} />
          </LineChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
            <YAxis stroke="var(--muted-foreground)" fontSize={12} />
            <Tooltip />
            <Bar dataKey="count" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function getTableHeaders(reportType) {
  if (reportType === "revenue") {
    return [
      { key: "period", label: "Date Range" },
      { key: "doctor", label: "Doctor" },
      { key: "appointments", label: "Appointments" },
      { key: "revenue", label: "Revenue" },
    ];
  }
  if (reportType === "doctor") {
    return [
      { key: "doctor", label: "Doctor" },
      { key: "appointments", label: "Appointments" },
      { key: "completed", label: "Completed" },
      { key: "revenue", label: "Revenue" },
    ];
  }
  return [
    { key: "date", label: "Date" },
    { key: "patient", label: "Patient" },
    { key: "doctor", label: "Doctor" },
    { key: "time", label: "Time" },
    { key: "status", label: "Status" },
  ];
}

function buildReportRows(reportType, appointments, revenueSeries, fromDate, toDate) {
  if (reportType === "revenue") {
    const revenueTotal = revenueSeries.reduce((sum, point) => sum + point.revenue, 0);
    return revenueSeries.length
      ? [
          {
            id: "revenue-summary",
            period: `${fromDate || "Start"} to ${toDate || "Today"}`,
            doctor: "All doctors",
            appointments: appointments.length,
            revenue: formatCurrency(revenueTotal),
          },
        ]
      : [];
  }

  if (reportType === "doctor") {
    return [...groupByDoctor(appointments).entries()].map(([doctor, items]) => ({
      id: doctor,
      doctor,
      appointments: items.length,
      completed: items.filter((item) => isCompleted(item.status)).length,
      revenue: formatOptionalCurrency(sumAppointmentRevenue(items)),
    }));
  }

  return appointments.map((item) => ({
    id: item.id,
    date: item.date || "-",
    patient: item.patient,
    doctor: item.doctor,
    time: item.time || "-",
    status: item.status,
  }));
}

function buildChartData(reportType, rows) {
  if (reportType === "revenue") {
    return rows.map((row) => ({
      label: row.period,
      revenue: currencyToNumber(row.revenue),
    }));
  }
  if (reportType === "doctor") {
    return rows.map((row) => ({
      label: row.doctor,
      count: row.appointments,
    }));
  }
  const counts = new Map();
  rows.forEach((row) => counts.set(row.date, (counts.get(row.date) ?? 0) + 1));
  return [...counts.entries()].map(([label, count]) => ({ label, count }));
}

function buildRevenueSeries(revenueResponse, revenueReportResponse) {
  const direct = toArray(revenueResponse).map((item, index) => ({
    label: item.month ?? item.label ?? item.period ?? item.date ?? `P${index + 1}`,
    revenue: Number(item.revenue ?? item.totalRevenue ?? item.amount ?? 0),
  }));
  if (direct.length) return direct;

  const payload = getPayload(revenueReportResponse) ?? {};
  const total = Number(payload.totalRevenue ?? payload.revenue ?? payload.monthlyRevenue ?? 0);
  return total ? [{ label: "Selected range", revenue: total }] : [];
}

function normalizeAdminAppointment(appointment, index) {
  const normalized = normalizeAppointment(appointment, index);
  return {
    ...normalized,
    date: normalizeDate(normalized.date),
  };
}

function normalizeDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function isWithinDateRange(date, fromDate, toDate) {
  if (!date) return true;
  return (!fromDate || date >= fromDate) && (!toDate || date <= toDate);
}

function groupByDoctor(appointments) {
  const map = new Map();
  appointments.forEach((appointment) => {
    const doctor = appointment.doctor || "Doctor not assigned";
    map.set(doctor, [...(map.get(doctor) ?? []), appointment]);
  });
  return map;
}

function isCompleted(status) {
  const value = String(status ?? "").toLowerCase();
  return value.includes("complete") || value.includes("consult") || value.includes("paid");
}

function sumAppointmentRevenue(items) {
  let hasRevenue = false;
  const total = items.reduce((sum, item) => {
    const value =
      item.revenue ??
      item.totalRevenue ??
      item.amount ??
      item.totalAmount ??
      item.consultationFee ??
      item.fee;
    if (!Number.isFinite(Number(value))) return sum;
    hasRevenue = true;
    return sum + Number(value);
  }, 0);
  return hasRevenue ? total : null;
}

function formatOptionalCurrency(value) {
  return Number.isFinite(Number(value)) ? formatCurrency(value) : "";
}

function currencyToNumber(value) {
  return Number(String(value ?? "").replace(/[^0-9.-]/g, "")) || 0;
}
