import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  Clock3,
  ReceiptText,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { useApiResource } from "@/hooks/use-api-resource";
import { api, toArray } from "@/lib/api";
import { normalizeAppointment, normalizeReceptionSummary } from "@/lib/api-normalizers";
import { cn } from "@/lib/utils";
import { today } from "@/lib/reception-store";

export const Route = createFileRoute("/_app/reception")({
  component: ReceptionDashboardPage,
  head: () => ({ meta: [{ title: "Reception Dashboard - Medisuite" }] }),
});

function ReceptionDashboardPage() {
  const {
    data: summary,
    loading: summaryLoading,
    error: summaryError,
  } = useApiResource(
    async () => normalizeReceptionSummary(await api.receptionDashboard.summary()),
    {
      todaysAppointments: 0,
      waitingPatients: 0,
      completedAppointments: 0,
    },
  );
  const {
    data: todaysAppointments,
    loading: appointmentsLoading,
    error: appointmentsError,
  } = useApiResource(
    async () => toArray(await api.receptionDashboard.appointments()).map(normalizeAppointment),
    [],
  );
  const {
    data: waitingPatients,
    loading: queueLoading,
    error: queueError,
  } = useApiResource(
    async () => toArray(await api.receptionDashboard.queue()).map(normalizeAppointment),
    [],
  );
  const { data: quickActions } = useApiResource(
    async () => toArray(await api.receptionDashboard.quickActions()),
    [],
  );
  const completedCount =
    summary.completedAppointments ||
    todaysAppointments.filter((item) => ["Consulted", "Paid"].includes(item.status)).length;
  const quickActionLinks = quickActions.length
    ? quickActions.map((action) => ({
        label: action.label ?? action.title ?? action.name,
        to: action.to ?? action.route ?? action.path ?? "/reception",
      }))
    : [
        { label: "Register Patient", to: "/reception/patients" },
        { label: "Book Appointment", to: "/reception/appointments" },
        { label: "Create Bill", to: "/reception/billing" },
      ];

  return (
    <>
      <PageHeader
        title="Reception Dashboard"
        description="View today's schedule, waiting queue, and front desk actions."
        actions={
          <>
            <Button variant="outline" className="gap-1.5" asChild>
              <Link to="/reception/appointments">
                <CalendarPlus className="h-4 w-4" />
                Book Appointment
              </Link>
            </Button>
            <Button className="gap-1.5 bg-primary text-primary-foreground" asChild>
              <Link to="/reception/patients">
                <UserPlus className="h-4 w-4" />
                Add Patient
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          icon={CalendarClock}
          label="Today's Appointments"
          value={summary.todaysAppointments || todaysAppointments.length}
        />
        <MetricCard
          icon={Clock3}
          label="Waiting Patients"
          value={summary.waitingPatients || waitingPatients.length}
          tone="warning"
        />
        <MetricCard
          icon={CheckCircle2}
          label="Completed Appointments"
          value={completedCount}
          tone="success"
        />
      </div>
      {(summaryError || appointmentsError || queueError) && (
        <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {summaryError || appointmentsError || queueError}
        </div>
      )}

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Appointment List</h2>
              <p className="text-xs text-muted-foreground">{today()}</p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/reception/appointments">Manage</Link>
            </Button>
          </div>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Patient</th>
                  <th className="px-4 py-3 font-medium">Doctor</th>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {todaysAppointments.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-medium">{item.patient}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.doctor}</td>
                    <td className="px-4 py-3">{item.time}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} />
                    </td>
                  </tr>
                ))}
                {todaysAppointments.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      {appointmentsLoading ? "Loading appointments..." : "No appointments found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="space-y-4">
          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="text-base font-semibold">Quick Actions</h2>
            <div className="mt-4 grid gap-3">
              {quickActionLinks.map((action) => (
                <ActionLink
                  key={`${action.label}-${action.to}`}
                  icon={getActionIcon(action.label)}
                  label={action.label}
                  to={action.to}
                />
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="text-base font-semibold">Waiting Queue</h2>
            <div className="mt-4 space-y-3">
              {waitingPatients.map((item, index) => (
                <div key={item.id} className="flex items-center gap-3 rounded-lg bg-secondary p-3">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{item.patient}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.doctor} - {item.time}
                    </div>
                  </div>
                  <Clock3 className="h-4 w-4 text-warning-foreground" />
                </div>
              ))}
              {waitingPatients.length === 0 && (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  {queueLoading ? "Loading queue..." : "No patients waiting."}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function getActionIcon(label) {
  const text = String(label ?? "").toLowerCase();
  if (text.includes("appointment") || text.includes("book")) return CalendarPlus;
  if (text.includes("bill") || text.includes("invoice")) return ReceiptText;
  return UserPlus;
}

function ActionLink({ icon: Icon, label, to }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-lg border border-border bg-secondary/50 p-4 transition-colors hover:bg-accent"
    >
      <Icon className="h-5 w-5 text-primary" />
      <span className="text-sm font-semibold">{label}</span>
    </Link>
  );
}

function MetricCard({ icon: Icon, label, value, tone = "primary" }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "grid h-10 w-10 place-items-center rounded-lg",
            tone === "primary" && "bg-primary-soft text-primary",
            tone === "warning" && "bg-warning/15 text-warning-foreground",
            tone === "success" && "bg-success/10 text-success",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-xs text-muted-foreground">Today</span>
      </div>
      <div className="mt-4 text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
        status === "Waiting" && "bg-warning/20 text-warning-foreground",
        status === "Consulted" && "bg-info/10 text-info",
        status === "Paid" && "bg-success/10 text-success",
        status === "No-show" && "bg-muted text-muted-foreground",
      )}
    >
      {status}
    </span>
  );
}
