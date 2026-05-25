import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Calendar, ClipboardList, FileText, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { api, toArray } from "@/lib/api";
import { normalizePatient } from "@/lib/api-normalizers";
import { useApiResource } from "@/hooks/use-api-resource";
import { useReceptionStore } from "@/lib/reception-store";

export const Route = createFileRoute("/_app/patients")({
  component: PatientsPage,
  head: () => ({ meta: [{ title: "Patients - Medisuite" }] }),
});

function PatientsPage() {
  const receptionStore = useReceptionStore();
  const { data: apiPatients, loading, error } = useApiResource(
    async () => toArray(await api.patients.list()).map(normalizeAdminPatient),
    [],
  );
  const patients =
    apiPatients.length > 0
      ? apiPatients
      : receptionStore.patients.map(normalizeAdminPatient);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const filtered = patients.filter(
    (patient) =>
      patient.name.toLowerCase().includes(query.toLowerCase()) || patient.phone.includes(query),
  );

  if (selected) {
    return (
      <>
        <PageHeader
          title="Patient Detail"
          description="Review personal information, visit history and prescriptions."
          actions={
            <Button variant="outline" className="gap-1.5" onClick={() => setSelected(null)}>
              <ArrowLeft className="h-4 w-4" />
              Patient List
            </Button>
          }
        />
        <div className="grid gap-4 lg:grid-cols-3">
          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <SectionTitle icon={User} title="Personal Info" />
            <InfoRow label="Patient Name" value={selected.name} />
            <InfoRow label="Phone" value={selected.phone} />
            <InfoRow label="Age" value={selected.age} />
            <InfoRow label="Gender" value={selected.gender} />
            <InfoRow label="Address" value={selected.address} />
          </section>
          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <SectionTitle icon={Calendar} title="Visit History" />
            <List items={selected.visits} />
          </section>
          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <SectionTitle icon={FileText} title="Prescriptions" />
            <List items={selected.prescriptions} />
          </section>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Patient List" description="Open a patient profile to view clinical history." />
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
                <th className="px-5 py-3 font-medium">Patient Name</th>
                <th className="px-5 py-3 font-medium">Phone</th>
                <th className="px-5 py-3 font-medium">Age</th>
                <th className="px-5 py-3 font-medium">Last Visit Date</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((patient) => (
                <tr key={patient.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                  <td className="px-5 py-3.5 font-medium">{patient.name}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{patient.phone}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{patient.age}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{patient.lastVisit}</td>
                  <td className="px-5 py-3.5 text-right">
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setSelected(patient)}>
                      <ClipboardList className="h-3.5 w-3.5" />
                      View Details
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

function normalizeAdminPatient(patient, index = 0) {
  const normalized = normalizePatient(patient, index);
  const address = [
    normalized.street,
    normalized.city,
    normalized.state,
    normalized.pinCode,
  ]
    .filter(Boolean)
    .join(", ");
  const visit = [
    patient?.previousVisitDate,
    patient?.previousDoctor,
    patient?.previousComplaint,
    patient?.previousDiagnosis,
    patient?.previousTreatment,
  ]
    .filter(Boolean)
    .join(" | ");
  const medication = [
    patient?.medicationName,
    patient?.medicationDosage,
    patient?.medicationFrequency,
  ]
    .filter(Boolean)
    .join(" - ");
  return {
    ...normalized,
    lastVisit: patient?.previousVisitDate || "-",
    address: address || "-",
    visits: visit ? [visit] : ["No previous visits recorded"],
    prescriptions: medication ? [medication] : ["No prescriptions recorded"],
  };
}

function SectionTitle({ icon: Icon, title }) {
  return (
    <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
      <Icon className="h-4 w-4 text-primary" />
      {title}
    </h2>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex border-b border-border py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto font-medium">{value}</span>
    </div>
  );
}

function List({ items }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm">
          {item}
        </li>
      ))}
    </ul>
  );
}
