import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileText,
  History,
  Pill,
  Plus,
  Save,
  Search,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";
import { api, toArray } from "@/lib/api";
import { normalizeAppointment, normalizePatient } from "@/lib/api-normalizers";
import { useApiResource } from "@/hooks/use-api-resource";
import { useReceptionStore } from "@/lib/reception-store";

export const Route = createFileRoute("/_app/doctor")({
  component: DoctorConsolePage,
  head: () => ({ meta: [{ title: "Doctor Dashboard - Medisuite" }] }),
});

function DoctorConsolePage() {
  const receptionStore = useReceptionStore();
  const { data: apiPatients, error: patientsError } = useApiResource(
    async () => toArray(await api.patients.list()).map(normalizeDashboardPatient),
    [],
  );
  const { data: apiAppointments } = useApiResource(
    async () => toArray(await api.appointments.today()).map(normalizeAppointment),
    [],
  );
  const sourcePatients =
    apiPatients.length > 0
      ? mergeAppointments(apiPatients, apiAppointments)
      : mergeAppointments(
          receptionStore.patients.map((patient, index) => normalizeDashboardPatient(patient, index)),
          receptionStore.todaysAppointments,
        );
  const [patientOverrides, setPatientOverrides] = useState({});
  const patients = sourcePatients.map((patient) => ({
    ...patient,
    ...(patientOverrides[patient.id] ?? {}),
  }));
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [screen, setScreen] = useState("dashboard");
  const [prescription, setPrescription] = useState({
    diagnosis: "",
    medicines: [{ name: "", dosage: "" }],
    notes: "",
  });

  const counts = useMemo(
    () => ({
      total: patients.length,
      pending: patients.filter((patient) => patient.status !== "Completed").length,
      completed: patients.filter((patient) => patient.status === "Completed").length,
    }),
    [patients],
  );

  const filteredPatients = patients.filter(
    (patient) =>
      patient.name.toLowerCase().includes(query.toLowerCase()) ||
      patient.status.toLowerCase().includes(query.toLowerCase()),
  );

  const updatePatientStatus = (patientId, status) => {
    setPatientOverrides((current) => ({
      ...current,
      [patientId]: { ...(current[patientId] ?? {}), status },
    }));
    setSelected((current) => (current?.id === patientId ? { ...current, status } : current));
  };

  const startConsultation = () => {
    updatePatientStatus(selected.id, "In Progress");
    setScreen("prescription");
  };

  const savePrescription = (event) => {
    event.preventDefault();
    const medicines = prescription.medicines
      .filter((medicine) => medicine.name.trim() || medicine.dosage.trim())
      .map((medicine) => `${medicine.name} - ${medicine.dosage}`);
    const nextPrescription = [
      prescription.diagnosis && `Diagnosis: ${prescription.diagnosis}`,
      ...medicines,
      prescription.notes && `Notes: ${prescription.notes}`,
    ]
      .filter(Boolean)
      .join(" | ");

    setPatientOverrides((current) => ({
      ...current,
      [selected.id]: {
        ...(current[selected.id] ?? {}),
        status: "Completed",
        prescriptions: nextPrescription
          ? [nextPrescription, ...selected.prescriptions]
          : selected.prescriptions,
      },
    }));
    setSelected((current) =>
      current
        ? {
            ...current,
            status: "Completed",
            prescriptions: nextPrescription
              ? [nextPrescription, ...current.prescriptions]
              : current.prescriptions,
          }
        : current,
    );
    setPrescription({ diagnosis: "", medicines: [{ name: "", dosage: "" }], notes: "" });
    setScreen("complete");
  };

  if (selected && screen === "detail") {
    return (
      <>
        <PageHeader
          title="Patient Detail"
          description="Check patient info, medical history, previous visits and past prescriptions."
          actions={<BackButton onClick={() => setSelected(null)} label="Dashboard" />}
        />
        <PatientSummary patient={selected} />
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <InfoPanel icon={History} title="Medical History" items={selected.history} />
          <InfoPanel icon={CalendarClock} title="Previous Visits" items={selected.visits} />
          <InfoPanel icon={Pill} title="Past Prescriptions" items={selected.prescriptions} />
        </div>
        <div className="mt-5 flex justify-end">
          <Button className="gap-1.5" onClick={startConsultation}>
            <ClipboardList className="h-4 w-4" />
            Start Consultation
          </Button>
        </div>
      </>
    );
  }

  if (selected && screen === "prescription") {
    return (
      <>
        <PageHeader
          title="Prescription"
          description="Enter diagnosis, medicines, dosage and notes before completing consultation."
          actions={<BackButton onClick={() => setScreen("detail")} label="Patient Detail" />}
        />
        <PatientSummary patient={selected} />
        <form onSubmit={savePrescription} className="mt-4 rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="grid gap-4">
            <Field
              label="Diagnosis"
              value={prescription.diagnosis}
              onChange={(value) => setPrescription({ ...prescription, diagnosis: value })}
              required
            />
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium">Medicines</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() =>
                    setPrescription({
                      ...prescription,
                      medicines: [...prescription.medicines, { name: "", dosage: "" }],
                    })
                  }
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Medicine
                </Button>
              </div>
              <div className="space-y-2">
                {prescription.medicines.map((medicine, index) => (
                  <div key={index} className="grid gap-2 md:grid-cols-2">
                    <input
                      value={medicine.name}
                      onChange={(event) => {
                        const medicines = [...prescription.medicines];
                        medicines[index] = { ...medicine, name: event.target.value };
                        setPrescription({ ...prescription, medicines });
                      }}
                      placeholder="Medicine name"
                      className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                      required={index === 0}
                    />
                    <input
                      value={medicine.dosage}
                      onChange={(event) => {
                        const medicines = [...prescription.medicines];
                        medicines[index] = { ...medicine, dosage: event.target.value };
                        setPrescription({ ...prescription, medicines });
                      }}
                      placeholder="Dosage"
                      className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                      required={index === 0}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Notes</label>
              <textarea
                value={prescription.notes}
                onChange={(event) => setPrescription({ ...prescription, notes: event.target.value })}
                rows={4}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <Button type="submit" className="gap-1.5">
              <Save className="h-4 w-4" />
              Save Prescription
            </Button>
          </div>
        </form>
      </>
    );
  }

  if (selected && screen === "complete") {
    return (
      <>
        <PageHeader title="Consultation Complete" description="Prescription saved, reception notified, billing can begin." />
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-success/10 text-success">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{selected.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Consultation marked completed. Reception has been notified and billing starts next.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={() => setSelected(null)}>Back to Dashboard</Button>
                <Button variant="outline" onClick={() => setScreen("detail")}>
                  View Patient
                </Button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Doctor Dashboard"
        description="Review today's patients, start consultations and complete prescriptions."
      />
      {patientsError && (
        <div className="mb-5 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
          Showing locally available reception patient data until patient API is reachable.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric
          icon={UserRound}
          label="Total Appointments"
          value={counts.total}
          to="/doctor/consultations"
          search={{ status: "all" }}
        />
        <Metric
          icon={ClipboardList}
          label="Pending"
          value={counts.pending}
          to="/doctor/consultations"
          search={{ status: "pending" }}
        />
        <Metric
          icon={CheckCircle2}
          label="Completed"
          value={counts.completed}
          to="/doctor/consultations"
          search={{ status: "completed" }}
        />
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card shadow-card">
        <div className="border-b border-border p-4">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search today's patients..."
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
              {filteredPatients.map((patient) => (
                <tr key={patient.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                  <td className="px-5 py-3.5 font-medium">{patient.name}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{patient.time}</td>
                  <td className="px-5 py-3.5">
                    <ConsultationBadge status={patient.status} />
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">{patient.reason}</td>
                  <td className="px-5 py-3.5 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => {
                        setSelected(patient);
                        setScreen("detail");
                      }}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Select Patient
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function normalizeDashboardPatient(patient, index = 0) {
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

function mergeAppointments(patients, appointments) {
  if (!appointments?.length) return patients;
  return patients.map((patient) => {
    const appointment = appointments.find(
      (item) =>
        item.patientId === patient.id ||
        item.patientId === patient.patientId ||
        item.patient === patient.name,
    );
    return appointment
      ? {
          ...patient,
          time: appointment.time || patient.time,
          status: normalizeConsultationStatus(appointment.status),
          reason: patient.reason || "Consultation",
        }
      : patient;
  });
}

function normalizeConsultationStatus(status) {
  const value = String(status ?? "").toLowerCase();
  if (value.includes("consult") || value.includes("complete") || value.includes("paid")) {
    return "Completed";
  }
  if (value.includes("progress")) return "In Progress";
  return "Waiting";
}

function Metric({ icon: Icon, label, value, to, search }) {
  return (
    <Link
      to={to}
      search={search}
      className="rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elev focus:outline-none focus:ring-2 focus:ring-ring/20"
      aria-label={`View ${label}`}
    >
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary-soft text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-4 text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </Link>
  );
}

function PatientSummary({ patient }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{patient.name}</h2>
          <p className="text-sm text-muted-foreground">
            {patient.age} years, {patient.gender} - {patient.phone}
          </p>
        </div>
        <ConsultationBadge status={patient.status} />
      </div>
    </section>
  );
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

function Field({ label, value, onChange, required }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
      />
    </div>
  );
}

function BackButton({ onClick, label }) {
  return (
    <Button variant="outline" className="gap-1.5" onClick={onClick}>
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Button>
  );
}

function ConsultationBadge({ status }) {
  const tone =
    status === "Completed"
      ? "border-success/20 bg-success/10 text-success"
      : status === "In Progress"
        ? "border-primary/20 bg-primary-soft text-primary"
        : "border-warning/30 bg-warning/15 text-warning-foreground";
  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", tone)}>
      {status}
    </span>
  );
}
