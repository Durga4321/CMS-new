import { createFileRoute, Link } from "@tanstack/react-router";
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
  const { data, loading, error } = useApiResource(
    async () => {
      const [summary, revenue, activity] = await Promise.all([
        api.dashboard.summary(),
        api.dashboard.revenueOverview(),
        api.dashboard.activities(),
      ]);
      const summaryData = getPayload(summary) ?? {};
      return {
        stats: normalizeSummaryStats(summary),
        revenueSeries: toArray(revenue).map(normalizeRevenuePoint),
        clinicTypeData: normalizeClinicTypes(summary),
        visitsSeries: toArray(
          summaryData.visits ?? summaryData.weeklyVisits ?? summaryData.visitSeries,
        ).map(normalizeVisitPoint),
        activities: toArray(activity).map(normalizeActivity),
      };
    },
    { stats: [], revenueSeries: [], clinicTypeData: [], visitsSeries: [], activities: [] },
    [],
  );
  const { stats, revenueSeries, clinicTypeData, visitsSeries, activities } = data;

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
            <Button className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90" asChild>
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
                  className={cn(
                    "rounded-md px-2.5 py-1 font-medium transition-colors",
                    p === "1Y"
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
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueSeries}>
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
