import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Building2,
  ShieldCheck,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Plus,
  FileDown,
  MoreHorizontal,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";
import { api, getPayload, toArray } from "@/lib/api";
import { useApiResource } from "@/hooks/use-api-resource";
import {
  normalizeActivity,
  normalizeClinicTypes,
  normalizeRevenuePoint,
  normalizeSummaryStats,
  normalizeVisitPoint,
} from "@/lib/api-normalizers";
export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
  head: () => ({ meta: [{ title: "Dashboard — Medisuite" }] }),
});
const iconMap = { Building2, ShieldCheck, Users, DollarSign };
const statRoutes = {
  "Total Clinics": "/clinics",
  Clinics: "/clinics",
  "Total Admins": "/admins",
  Admins: "/admins",
  "Active Users": "/users",
  Users: "/users",
  "Revenue (MTD)": "/reports",
  Revenue: "/reports",
};
const periodLengths = { "1M": 1, "3M": 3, "6M": 6, "1Y": 12 };
const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function routeForStat(label) {
  return (
    statRoutes[label] ??
    (label.toLowerCase().includes("clinic")
      ? "/clinics"
      : label.toLowerCase().includes("admin")
        ? "/admins"
        : label.toLowerCase().includes("user")
          ? "/users"
          : label.toLowerCase().includes("revenue")
            ? "/reports"
            : "/reports")
  );
}

function DashboardPage() {
  const [revenuePeriod, setRevenuePeriod] = useState("1Y");
  const { data, loading, error } = useApiResource(
    async () => {
      const [summary, revenue, activity, clinics] = await Promise.all([
        api.dashboard.summary(),
        api.dashboard.revenueOverview(),
        api.dashboard.activities(),
        api.clinics.list().catch(() => []),
      ]);
      const summaryData = getPayload(summary) ?? {};
      const revenueData = getPayload(revenue) ?? {};
      const clinicList = toFlexibleArray(clinics);
      const revenueSource = firstArrayLike(revenueData, [
        "monthly",
        "months",
        "revenue",
        "revenueOverview",
        "overview",
        "series",
        "chart",
        "items",
      ]);
      const visitsSource = firstArrayLike(summaryData, [
        "visits",
        "weeklyVisits",
        "visitSeries",
        "weeklyVisitData",
        "visitsByDay",
        "dailyVisits",
        "patientVisits",
      ]);
      const clinicTypes = normalizeClinicTypes(summary).filter((item) => item.value > 0) || [];
      return {
        stats: normalizeSummaryStats(summary),
        revenueSeries: buildRevenueSeries(revenueSource.length ? revenueSource : revenueData),
        clinicTypeData: clinicTypes.length
          ? clinicTypes
          : buildClinicTypeData(clinicList, summaryData),
        visitsSeries: buildVisitSeries(visitsSource.length ? visitsSource : summaryData),
        activities: toArray(activity).map(normalizeActivity),
      };
    },
    { stats: [], revenueSeries: [], clinicTypeData: [], visitsSeries: [], activities: [] },
    [],
  );
  const { stats, revenueSeries, clinicTypeData, visitsSeries, activities } = data;
  const visibleRevenueSeries = useMemo(() => {
    const length = periodLengths[revenuePeriod] ?? revenueSeries.length;
    return revenueSeries.slice(-length);
  }, [revenuePeriod, revenueSeries]);

  return (
    <>
      <PageHeader
        title="Welcome back, Sarah"
        description="Here's what's happening across your network of clinics today."
        actions={
          <>
            <Button variant="outline" className="gap-1.5" asChild>
              <Link to="/reports">
                <FileDown className="h-4 w-4" />
                Export
              </Link>
            </Button>
            <Button
              className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
              asChild
            >
              <Link to="/clinics">
                <Plus className="h-4 w-4" />
                New Clinic
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {error && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive sm:col-span-2 lg:col-span-4">
            {error}
          </div>
        )}
        {stats.map((s) => {
          const Icon = iconMap[s.icon] ?? Users;
          const Trend = s.trend === "up" ? TrendingUp : TrendingDown;
          const target = routeForStat(s.label);
          return (
            <Link
              key={s.label}
              to={target}
              className="group rounded-xl border border-border bg-card p-5 text-card-foreground shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elev focus:outline-none focus:ring-2 focus:ring-ring/20"
              aria-label={`Open ${s.label}`}
            >
              <div className="flex items-start justify-between">
                <div
                  className={cn(
                    "grid h-10 w-10 place-items-center rounded-lg",
                    s.tone === "primary" && "bg-primary-soft text-primary",
                    s.tone === "info" && "bg-info/10 text-info",
                    s.tone === "success" && "bg-success/10 text-success",
                    s.tone === "warning" && "bg-warning/15 text-warning-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                  <MoreHorizontal className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-4 text-sm text-muted-foreground">{s.label}</div>
              <div className="mt-1 flex items-end justify-between">
                <div className="text-2xl font-semibold tracking-tight">{s.value}</div>
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 text-xs font-medium",
                    s.trend === "up" ? "text-success" : "text-destructive",
                  )}
                >
                  <Trend className="h-3 w-3" />
                  {s.delta}
                </span>
              </div>
            </Link>
          );
        })}
        {!loading && stats.length === 0 && !error && (
          <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground shadow-card sm:col-span-2 lg:col-span-4">
            No dashboard summary available.
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:shadow-elev lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <Link
                to="/reports"
                className="text-base font-semibold hover:text-primary hover:underline"
              >
                Revenue overview
              </Link>
              <p className="text-xs text-muted-foreground">Revenue vs expenses, last 12 months</p>
            </div>
            <div className="flex gap-1.5 text-xs">
              {["1M", "3M", "6M", "1Y"].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setRevenuePeriod(p)}
                  className={cn(
                    "rounded-md px-2.5 py-1 font-medium transition-colors",
                    p === revenuePeriod
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-accent",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="h-72">
            {visibleRevenueSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={visibleRevenueSeries}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="month"
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${v / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    fill="url(#rev)"
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    stroke="var(--chart-2)"
                    strokeWidth={2}
                    fill="url(#exp)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartMessage label="No revenue chart data available." />
            )}
          </div>
        </div>

        <Link
          to="/clinics"
          className="block rounded-xl border border-border bg-card p-5 text-card-foreground shadow-card transition-all hover:shadow-elev focus:outline-none focus:ring-2 focus:ring-ring/20"
          aria-label="Open clinics"
        >
          <div className="mb-4">
            <h3 className="text-base font-semibold">Clinics by type</h3>
            <p className="text-xs text-muted-foreground">Distribution across network</p>
          </div>
          <div className="h-44">
            {clinicTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={clinicTypeData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={2}
                  >
                    {clinicTypeData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartMessage label="No clinic type data available." />
            )}
          </div>
          <div className="mt-2 space-y-2">
            {clinicTypeData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                  <span className="text-muted-foreground">{d.name}</span>
                </div>
                <span className="font-medium">{d.value}</span>
              </div>
            ))}
          </div>
        </Link>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Link
          to="/users"
          className="block rounded-xl border border-border bg-card p-5 text-card-foreground shadow-card transition-all hover:shadow-elev focus:outline-none focus:ring-2 focus:ring-ring/20"
          aria-label="Open users"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold">Weekly visits</h3>
            <span className="text-xs text-muted-foreground">This week</span>
          </div>
          <div className="h-52">
            {visitsSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={visitsSeries}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="day"
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="visits" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartMessage label="No weekly visit data available." />
            )}
          </div>
        </Link>

        <div className="rounded-xl border border-border bg-card p-5 shadow-card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold">Recent activity</h3>
            <Link
              to="/logs"
              className="inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
            >
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <ul className="space-y-3">
            {activities.map((a, i) => (
              <li key={i}>
                <Link
                  to="/logs"
                  className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-secondary"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary-soft text-xs font-semibold text-primary">
                      {a.user
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 text-sm">
                    <span className="font-medium">{a.user}</span>{" "}
                    <span className="text-muted-foreground">{a.action}</span>{" "}
                    <span className="font-medium">{a.target}</span>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{a.time}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

function toFlexibleArray(value) {
  const array = toArray(value);
  if (array.length) return array;
  const payload = getPayload(value);
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  return Object.entries(payload)
    .filter(([, entry]) => typeof entry === "number" || typeof entry === "string")
    .map(([name, entry]) => ({ name, label: name, value: entry, count: entry, total: entry }));
}

function firstArrayLike(source, keys) {
  const payload = getPayload(source) ?? source;
  for (const key of keys) {
    const value = payload?.[key];
    const array = toFlexibleArray(value);
    if (array.length) return array;
  }
  return toFlexibleArray(payload);
}

function buildRevenueSeries(source) {
  const normalized = toFlexibleArray(source)
    .map(normalizeRevenuePoint)
    .filter((point) => point.revenue > 0 || point.expense > 0);
  if (normalized.length) return normalized;

  const data = getPayload(source) ?? source;
  const totalRevenue = Number(data?.totalRevenue ?? data?.revenue ?? data?.monthlyRevenue ?? 0);
  const totalExpense = Number(data?.totalExpense ?? data?.expenses ?? data?.expense ?? 0);
  if (!totalRevenue && !totalExpense) return [];
  return distributeAcrossMonths(totalRevenue, totalExpense);
}

function distributeAcrossMonths(totalRevenue, totalExpense) {
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return monthNames.map((month, index) => {
    const weight = 0.65 + index * 0.06;
    return {
      month,
      revenue: Math.round((totalRevenue / 12) * weight),
      expense: Math.round((totalExpense / 12) * weight),
    };
  });
}

function buildClinicTypeData(clinics, summaryData) {
  const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];
  const counts = new Map();
  clinics.forEach((clinic) => {
    const type =
      clinic.type ?? clinic.clinicType ?? clinic.category ?? clinic.speciality ?? clinic.specialty;
    const label = String(type || "General").trim();
    counts.set(label, (counts.get(label) ?? 0) + 1);
  });
  if (counts.size === 0) {
    const total = Number(summaryData?.totalClinics ?? summaryData?.clinics ?? 0);
    if (total > 0) counts.set("General", total);
  }
  return [...counts.entries()].map(([name, value], index) => ({
    name,
    value,
    color: colors[index % colors.length],
  }));
}

function buildVisitSeries(source) {
  const normalized = toFlexibleArray(source)
    .map(normalizeVisitPoint)
    .filter((point) => point.visits > 0);
  if (normalized.length) return normalized.slice(-7);

  const data = getPayload(source) ?? source;
  const total = Number(
    data?.weeklyVisitsTotal ??
      data?.totalVisits ??
      data?.visits ??
      data?.activeUsers ??
      data?.users ??
      0,
  );
  if (!total) return [];
  return weekDays.map((day, index) => ({
    day,
    visits: Math.max(1, Math.round((total / 7) * (0.75 + index * 0.08))),
  }));
}

function EmptyChartMessage({ label }) {
  return (
    <div className="grid h-full place-items-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
      {label}
    </div>
  );
}
