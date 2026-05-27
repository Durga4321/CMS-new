import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarClock, FileText, History, Pill, Search, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";
import { api, toArray } from "@/lib/api";
import { normalizePatient } from "@/lib/api-normalizers";
import { useApiResource } from "@/hooks/use-api-resource";

export const Route = createFileRoute("/_app/doctor/patients")({
  component: DoctorPatientsPage,
  head: () => ({ meta: [{ title: "Doctor Patients - Medisuite" }] }),
});

function DoctorPatientsPage() {
  const { data: apiPatients, loading, error } = useApiResource(
    async () => toArray(await api.patients.list()).map(normalizeDoctorPatient),
    [],
  );
  const patients = apiPatients;
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const filtered = patients.filter(
    (patient) =>
      patient.name.toLowerCase().includes(query.toLowerCase()) ||
      patient.phone.includes(query),
  );

  if (selected) {
    return (
      <>
        <PageHeader
          title="Patient Detail"
          description="Patient info, medical history, previous visits and past prescriptions."
          actions={
            <Button variant="outline" onClick={() => setSelected(null)}>
              Patient List
            </Button>
          }
        />
        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">{selected.name}</h2>
              <p className="text-sm text-muted-foreground">
                {selected.age} years, {selected.gender} - {selected.phone}
              </p>
            </div>
            <ConsultationBadge status={selected.status} />
          </div>
        </section>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <InfoPanel icon={History} title="Medical History" items={selected.history} />
          <InfoPanel icon={CalendarClock} title="Previous Visits" items={selected.visits} />
          <InfoPanel icon={Pill} title="Past Prescriptions" items={selected.prescriptions} />
        </div>
        <div className="mt-5 flex justify-end">
          <Button asChild>
            <Link to="/doctor/consultations">Start Consultation</Link>
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Doctor Patients" description="Select a patient to check history before consultation." />
      {error && (
        <div className="mb-5 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
          Showing locally available reception patient data until patient API is reachable.
        </div>
      )}
      <div className="rounded-xl border border-border bg-card shadow-card">
        <div className="border-b border-border p-4">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search patients..."
              className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Time</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Reason</th>
                <th className="px-5 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((patient) => (
                <tr key={patient.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2 font-medium">
                      <UserRound className="h-4 w-4 text-muted-foreground" />
                      {patient.name}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">{patient.time}</td>
                  <td className="px-5 py-3.5">
                    <ConsultationBadge status={patient.status} />
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">{patient.reason}</td>
                  <td className="px-5 py-3.5 text-right">
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setSelected(patient)}>
                      <FileText className="h-3.5 w-3.5" />
                      View History
                    </Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    {loading ? "Loading patients..." : "No patients found."}
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

function normalizeDoctorPatient(patient, index = 0) {
  const normalized = normalizePatient(patient, index);
  const currentMedication = [
    patient?.medicationName,
    patient?.medicationDosage,
    patient?.medicationFrequency,
  ]
    .filter(Boolean)
    .join(" - ");
  const previousVisit = [
    patient?.previousVisitDate,
    patient?.previousDoctor,
    patient?.previousComplaint,
    patient?.previousDiagnosis,
    patient?.previousTreatment,
  ]
    .filter(Boolean)
    .join(" | ");
  return {
    ...normalized,
    time: patient?.time ?? "-",
    status: patient?.status ?? "Waiting",
    reason: patient?.previousComplaint || patient?.reason || "Consultation",
    history: [
      normalized.chronicDiseases?.length ? `Chronic: ${normalized.chronicDiseases.join(", ")}` : "",
      patient?.drugAllergies || patient?.foodAllergies || patient?.environmentalAllergies
        ? `Allergies: ${[patient?.drugAllergies, patient?.foodAllergies, patient?.environmentalAllergies].filter(Boolean).join(", ")}`
        : "",
      patient?.otherChronic ? `Other: ${patient.otherChronic}` : "",
    ].filter(Boolean),
    visits: previousVisit ? [previousVisit] : ["No previous visits recorded"],
    prescriptions: currentMedication ? [currentMedication] : ["No past prescriptions recorded"],
  };
}

function InfoPanel({ icon: Icon, title, items }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-card">
      <h3 className="mb-4 flex items-center gap-2 text-base font-semibold">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
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
