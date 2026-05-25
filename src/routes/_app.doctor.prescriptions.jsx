import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pill, Plus, Save, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { api, toArray } from "@/lib/api";
import { normalizePatient } from "@/lib/api-normalizers";
import { useApiResource } from "@/hooks/use-api-resource";
import { useReceptionStore } from "@/lib/reception-store";

export const Route = createFileRoute("/_app/doctor/prescriptions")({
  component: DoctorPrescriptionsPage,
  head: () => ({ meta: [{ title: "Doctor Prescriptions - Medisuite" }] }),
});

function DoctorPrescriptionsPage() {
  const receptionStore = useReceptionStore();
  const { data: apiPrescriptions, error } = useApiResource(
    async () => toArray(await api.patients.list()).map(patientToPrescription).filter(Boolean),
    [],
  );
  const sourcePrescriptions =
    apiPrescriptions.length > 0
      ? apiPrescriptions
      : receptionStore.patients.map(patientToPrescription).filter(Boolean);
  const [localPrescriptions, setLocalPrescriptions] = useState([]);
  const prescriptions = [...localPrescriptions, ...sourcePrescriptions];
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const filtered = prescriptions.filter(
    (item) =>
      item.patient.toLowerCase().includes(query.toLowerCase()) ||
      item.diagnosis.toLowerCase().includes(query.toLowerCase()),
  );

  const savePrescription = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLocalPrescriptions((current) => [
      {
        id: Date.now(),
        patient: String(form.get("patient") ?? "").trim(),
        diagnosis: String(form.get("diagnosis") ?? "").trim(),
        medicines: String(form.get("medicines") ?? "").trim(),
        dosage: String(form.get("dosage") ?? "").trim(),
        notes: String(form.get("notes") ?? "").trim(),
      },
      ...current,
    ]);
    setAdding(false);
  };

  if (adding) {
    return (
      <>
        <PageHeader
          title="Prescription Screen"
          description="Enter diagnosis, medicines, dosage and notes."
          actions={
            <Button variant="outline" onClick={() => setAdding(false)}>
              Prescription List
            </Button>
          }
        />
        <form onSubmit={savePrescription} className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="grid gap-4 md:grid-cols-2">
            <Field name="patient" label="Patient Name" required />
            <Field name="diagnosis" label="Diagnosis" required />
            <Field name="medicines" label="Medicines" required />
            <Field name="dosage" label="Dosage" required />
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium">Notes</label>
              <textarea
                name="notes"
                rows={4}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <Button className="gap-1.5">
              <Save className="h-4 w-4" />
              Save Prescription
            </Button>
          </div>
        </form>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Prescriptions"
        description="Review saved prescriptions or create a new prescription."
        actions={
          <Button className="gap-1.5" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" />
            Add Prescription
          </Button>
        }
      />
      {error && (
        <div className="mb-5 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
          Showing locally available reception patient medication data until patient API is reachable.
        </div>
      )}
      <div className="rounded-xl border border-border bg-card shadow-card">
        <div className="border-b border-border p-4">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search prescriptions..."
              className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 font-medium">Patient</th>
                <th className="px-5 py-3 font-medium">Diagnosis</th>
                <th className="px-5 py-3 font-medium">Medicines</th>
                <th className="px-5 py-3 font-medium">Dosage</th>
                <th className="px-5 py-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                  <td className="px-5 py-3.5 font-medium">
                    <span className="inline-flex items-center gap-2">
                      <Pill className="h-4 w-4 text-primary" />
                      {item.patient}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">{item.diagnosis}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{item.medicines}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{item.dosage}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{item.notes}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    No prescriptions found.
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

function patientToPrescription(patient, index = 0) {
  const normalized = normalizePatient(patient, index);
  const medicines = [
    patient?.medicationName,
    patient?.currentMedications && !patient?.medicationName ? patient.currentMedications : "",
  ]
    .filter(Boolean)
    .join(", ");
  const dosage = [patient?.medicationDosage, patient?.medicationFrequency]
    .filter(Boolean)
    .join(" - ");
  const diagnosis = patient?.previousDiagnosis || patient?.previousComplaint || "";
  const notes = patient?.previousTreatment || patient?.otherChronic || "";
  if (!medicines && !diagnosis && !notes) return null;
  return {
    id: `${normalized.id}-rx`,
    patient: normalized.name,
    diagnosis: diagnosis || "Previous medication",
    medicines: medicines || "-",
    dosage: dosage || "-",
    notes: notes || "-",
  };
}

function Field({ label, ...props }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      <input
        {...props}
        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
      />
    </div>
  );
}
