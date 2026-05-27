import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, ClipboardList, FileText, PlayCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";
import { api, toArray } from "@/lib/api";
import { normalizeAppointment, normalizePatient } from "@/lib/api-normalizers";
import { useApiResource } from "@/hooks/use-api-resource";

export const Route = createFileRoute("/_app/doctor/consultations")({
  component: DoctorConsultationsPage,
  head: () => ({ meta: [{ title: "Doctor Consultations - Medisuite" }] }),
});

function DoctorConsultationsPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  const statusFilter = String(search.status ?? "all");
  const { data: apiConsultations, loading, error } = useApiResource(
    async () => toArray(await api.appointments.today()).map(normalizeDoctorConsultation),
    [],
  );
  const { data: apiPatients, error: patientsError } = useApiResource(
    async () => toArray(await api.patients.list()).map(normalizeWaitingPatientConsultation),
    [],
  );
  const sourceConsultations = mergeWaitingPatients(apiConsultations, apiPatients);
  const [consultationOverrides, setConsultationOverrides] = useState({});
  const consultations = sourceConsultations.map((item) => ({
    ...item,
    ...(consultationOverrides[item.id] ?? {}),
  }));
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const filtered = consultations.filter(
    (item) =>
      matchesStatusFilter(item.status, statusFilter) &&
      (item.patient.toLowerCase().includes(query.toLowerCase()) ||
        item.status.toLowerCase().includes(query.toLowerCase())),
  );
  const counts = {
    all: consultations.length,
    pending: consultations.filter((item) => item.status !== "Completed").length,
    waiting: consultations.filter((item) => item.status === "Waiting").length,
    inProgress: consultations.filter((item) => item.status === "In Progress").length,
    completed: consultations.filter((item) => item.status === "Completed").length,
  };

  const markStatus = (status) => {
    setConsultationOverrides((current) => ({
      ...current,
      [selected.id]: { ...(current[selected.id] ?? {}), status },
    }));
    setSelected((current) => ({ ...current, status }));
  };

  if (selected) {
    return (
      <>
        <PageHeader
          title="Consultation Detail"
          description="Move consultation status from Waiting to In Progress to Completed."
          actions={
            <Button variant="outline" onClick={() => setSelected(null)}>
              Consultation List
            </Button>
          }
        />
        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">{selected.patient}</h2>
              <p className="text-sm text-muted-foreground">Appointment time: {selected.time}</p>
            </div>
            <ConsultationBadge status={selected.status} />
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-secondary/40 p-4">
              <div className="text-sm text-muted-foreground">Diagnosis</div>
              <div className="mt-1 font-medium">{selected.diagnosis || "Not entered yet"}</div>
            </div>
            <div className="rounded-lg border border-border bg-secondary/40 p-4">
              <div className="text-sm text-muted-foreground">Notes</div>
              <div className="mt-1 font-medium">{selected.notes || "No notes yet"}</div>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button variant="outline" className="gap-1.5" onClick={() => markStatus("In Progress")}>
              <PlayCircle className="h-4 w-4" />
              Start Consultation
            </Button>
            <Button asChild variant="outline" className="gap-1.5">
              <Link to="/doctor/prescriptions">
                <FileText className="h-4 w-4" />
                Write Prescription
              </Link>
            </Button>
            <Button className="gap-1.5" onClick={() => markStatus("Completed")}>
              <CheckCircle2 className="h-4 w-4" />
              Complete
            </Button>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Consultations" description="Track Waiting, In Progress and Completed consultation states." />
      {error && (
        <div className="mb-5 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
          Showing locally available reception appointment data until appointment API is reachable.
        </div>
      )}
      <div className="mb-4 flex flex-wrap gap-2">
        {[
          { label: "All", value: "all", count: counts.all },
          { label: "Pending", value: "pending", count: counts.pending },
          { label: "Waiting", value: "waiting", count: counts.waiting },
          { label: "In Progress", value: "in-progress", count: counts.inProgress },
          { label: "Completed", value: "completed", count: counts.completed },
        ].map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => navigate({ to: "/doctor/consultations", search: { status: filter.value } })}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              statusFilter === filter.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-accent",
            )}
          >
            {filter.label}
            <span
              className={cn(
                "rounded-full px-1.5 text-[11px]",
                statusFilter === filter.value ? "bg-primary-foreground/20" : "bg-secondary",
              )}
            >
              {filter.count}
            </span>
          </button>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card shadow-card">
        <div className="border-b border-border p-4">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search consultations..."
              className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 font-medium">Patient</th>
                <th className="px-5 py-3 font-medium">Time</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                  <td className="px-5 py-3.5 font-medium">{item.patient}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{item.time}</td>
                  <td className="px-5 py-3.5">
                    <ConsultationBadge status={item.status} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setSelected(item)}>
                      <ClipboardList className="h-3.5 w-3.5" />
                      Open
                    </Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    {loading ? "Loading consultations..." : "No consultations found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function normalizeDoctorConsultation(item, index = 0) {
  const appointment = normalizeAppointment(item, index);
  return {
    id: appointment.id,
    patientId: appointment.patientId,
    patient: appointment.patient,
    time: appointment.time || "-",
    status: normalizeConsultationStatus(appointment.status),
    diagnosis: item?.diagnosis ?? item?.previousDiagnosis ?? "",
    notes: item?.notes ?? item?.previousTreatment ?? "",
  };
}

function normalizeWaitingPatientConsultation(item, index = 0) {
  const patient = normalizePatient(item, index);
  return {
    id: `patient-${patient.id}`,
    patientId: patient.id,
    patient: patient.name,
    time: item?.time ?? "-",
    status: normalizeConsultationStatus(item?.status ?? "Waiting"),
    diagnosis: item?.previousDiagnosis ?? "",
    notes: item?.previousTreatment ?? "",
  };
}

function mergeWaitingPatients(consultations, patients) {
  const consultationKeys = new Set(
    consultations.flatMap((item) => [
      item.patientId ? `id:${item.patientId}` : "",
      item.patient ? `name:${item.patient.toLowerCase()}` : "",
    ]),
  );

  const waitingPatients = patients.filter((patient) => {
    const idKey = patient.patientId ? `id:${patient.patientId}` : "";
    const nameKey = patient.patient ? `name:${patient.patient.toLowerCase()}` : "";
    return !consultationKeys.has(idKey) && !consultationKeys.has(nameKey);
  });

  return [...consultations, ...waitingPatients];
}

function normalizeConsultationStatus(status) {
  const value = String(status ?? "").toLowerCase();
  if (value.includes("consult") || value.includes("complete") || value.includes("paid")) {
    return "Completed";
  }
  if (value.includes("progress")) return "In Progress";
  return "Waiting";
}

function matchesStatusFilter(status, filter) {
  if (filter === "all") return true;
  if (filter === "pending") return status !== "Completed";
  if (filter === "waiting") return status === "Waiting";
  if (filter === "in-progress") return status === "In Progress";
  if (filter === "completed") return status === "Completed";
  return true;
}

function ConsultationBadge({ status }) {
  const tone =
    status === "Completed"
      ? "border-success/20 bg-success/10 text-success"
      : status === "In Progress"
        ? "border-primary/20 bg-primary-soft text-primary"
        : "border-warning/30 bg-warning/15 text-warning-foreground";
  return <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", tone)}>{status}</span>;
}
