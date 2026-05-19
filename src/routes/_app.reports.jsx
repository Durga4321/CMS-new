import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Building2, DollarSign, FileDown, FileText, ShieldCheck, TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { api, getPayload, toArray } from "@/lib/api";
import { useApiResource } from "@/hooks/use-api-resource";
import {
  formatCurrency,
  formatNumber,
  normalizeAdmin,
  normalizeClinic,
  normalizeRevenuePoint,
  normalizeTopClinics,
  normalizeVisitPoint,
  text,
} from "@/lib/api-normalizers";
export const Route = createFileRoute("/_app/reports")({
  component: ReportsPage,
  head: () => ({ meta: [{ title: "Reports — Medisuite" }] }),
});

const rangeOptions = [
  { label: "Last 3 months", months: 3 },
  { label: "Last 6 months", months: 6 },
  { label: "Last 12 months", months: 12 },
];

function ReportsPage() {
  const navigate = useNavigate();
  const [rangeMonths, setRangeMonths] = useState(12);
  const { data, loading, error } = useApiResource(
    async () => {
      const [revenue, revenueReport, activity, activityReport, adminsResponse, clinicsResponse] =
        await Promise.all([
          api.reports.revenue(),
          api.reports.revenueReport(),
          api.reports.activity(),
          api.reports.activityReport(),
          api.admins.list(),
          api.clinics.list(),
        ]);
      const report = getPayload(revenueReport) ?? {};
      const activityData = getPayload(activityReport) ?? {};
      const admins = toArray(adminsResponse).map(normalizeAdmin);
      const clinics = toArray(clinicsResponse).map(normalizeClinic);
      const activeAdmins = admins.filter((admin) => admin.status === "active").length;
      const activeClinics = clinics.filter((clinic) => clinic.status === "active").length;
      return {
        kpis: [
          {
            label: "Total revenue",
            value: formatCurrency(report.totalRevenue ?? report.revenue),
            icon: DollarSign,
            delta: text(report.revenueGrowth ?? report.revenueDelta, "0%"),
            route: "/reports",
          },
          {
            label: "Active clinics",
            value: formatNumber(
              report.activeClinics ?? activityData.activeClinics ?? activeClinics,
            ),
            icon: Building2,
            delta: text(report.clinicGrowth ?? report.clinicDelta, "0%"),
            route: "/clinics",
          },
          {
            label: "Active admins",
            value: formatNumber(report.activeAdmins ?? activityData.activeAdmins ?? activeAdmins),
            icon: ShieldCheck,
            delta: text(report.adminGrowth ?? report.adminDelta, "0%"),
            route: "/admins",
          },
          {
            label: "Avg. growth",
            value: text(report.averageGrowth ?? report.avgGrowth, "0%"),
            icon: TrendingUp,
            delta: text(report.growthDelta, "0%"),
            route: "/dashboard",
          },
        ],
        revenueSeries: toArray(revenue).map(normalizeRevenuePoint),
        visitsSeries: toArray(activity).map(normalizeVisitPoint),
        topClinics: normalizeTopClinics(revenueReport),
      };
    },
    { kpis: [], revenueSeries: [], visitsSeries: [], topClinics: [] },
    [],
  );
  const { kpis, revenueSeries, visitsSeries, topClinics } = data;
  const selectedRange = rangeOptions.find((range) => range.months === rangeMonths);
  const filteredRevenueSeries = useMemo(
    () => revenueSeries.slice(-rangeMonths),
    [rangeMonths, revenueSeries],
  );
  const filteredVisitsSeries = useMemo(
    () => visitsSeries.slice(-Math.min(rangeMonths, visitsSeries.length || rangeMonths)),
    [rangeMonths, visitsSeries],
  );
  const exportRows = useMemo(
    () => [
      ["Section", "Name", "Value", "Extra"],
      ...kpis.map((kpi) => ["KPI", kpi.label, kpi.value, kpi.delta]),
      ...filteredRevenueSeries.map((point) => [
        "Revenue trend",
        point.month,
        point.revenue,
        point.expense,
      ]),
      ...filteredVisitsSeries.map((point) => ["User activity", point.day, point.visits, ""]),
      ...topClinics.map((clinic) => [
        "Top clinic",
        clinic.name,
        clinic.revenue,
        `${clinic.visits} visits, ${clinic.growth} growth`,
      ]),
    ],
    [filteredRevenueSeries, filteredVisitsSeries, kpis, topClinics],
  );

  const downloadCsv = () => {
    const csv = exportRows
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "reports-analytics.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        title="Reports & Analytics"
        description="Generate insights across revenue, patients and operations."
        actions={
          <>
            <select
              value={rangeMonths}
              onChange={(event) => setRangeMonths(Number(event.target.value))}
              className="h-10 rounded-lg border border-input bg-card px-3 text-sm font-medium text-foreground shadow-card focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            >
              {rangeOptions.map((range) => (
                <option key={range.months} value={range.months}>
                  {range.label}
                </option>
              ))}
            </select>
            <Button variant="outline" className="gap-1.5" onClick={() => window.print()}>
              <FileDown className="h-4 w-4" />
              Export PDF
            </Button>
            <Button className="gap-1.5" onClick={downloadCsv}>
              <FileText className="h-4 w-4" />
              Export Excel
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
        {kpis.map((k) => (
          <button
            key={k.label}
            type="button"
            onClick={() => navigate({ to: k.route })}
            className="rounded-xl border border-border bg-card p-5 text-left shadow-card transition-colors hover:border-primary/40 hover:bg-secondary/40 focus:outline-none focus:ring-2 focus:ring-ring/20"
          >
            <div className="flex items-center justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary-soft text-primary">
                <k.icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium text-success">{k.delta}</span>
            </div>
            <div className="mt-3 text-sm text-muted-foreground">{k.label}</div>
            <div className="mt-1 text-2xl font-semibold">{k.value}</div>
          </button>
        ))}
        {!loading && kpis.length === 0 && !error && (
          <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground shadow-card sm:col-span-2 lg:col-span-4">
            No report metrics available.
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h3 className="text-base font-semibold">Revenue trend</h3>
          <p className="text-xs text-muted-foreground">Monthly revenue performance</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <LineChart data={filteredRevenueSeries}>
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
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--chart-1)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="expense"
                  stroke="var(--chart-2)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h3 className="text-base font-semibold">User activity</h3>
          <p className="text-xs text-muted-foreground">Visits this week</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <BarChart data={filteredVisitsSeries}>
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
                <Bar dataKey="visits" fill="var(--chart-3)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card shadow-card">
        <div className="border-b border-border p-5">
          <h3 className="text-base font-semibold">Top performing clinics</h3>
          <p className="text-xs text-muted-foreground">Ranked by monthly revenue</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Showing {selectedRange?.label.toLowerCase() ?? "selected range"}
          </p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-3 font-medium">#</th>
              <th className="px-5 py-3 font-medium">Clinic</th>
              <th className="px-5 py-3 font-medium">Visits</th>
              <th className="px-5 py-3 font-medium">Revenue</th>
              <th className="px-5 py-3 font-medium">Growth</th>
            </tr>
          </thead>
          <tbody>
            {topClinics.map((r, i) => (
              <tr
                key={r.id}
                onClick={() => navigate({ to: "/clinics" })}
                className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-secondary/40"
              >
                <td className="px-5 py-3.5 text-muted-foreground">{i + 1}</td>
                <td className="px-5 py-3.5 font-medium">{r.name}</td>
                <td className="px-5 py-3.5 text-muted-foreground">{r.visits}</td>
                <td className="px-5 py-3.5 font-semibold">{r.revenue}</td>
                <td className="px-5 py-3.5 text-success">{r.growth}</td>
              </tr>
            ))}
            {topClinics.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                  {loading ? "Loading clinics..." : "No clinic performance data found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
