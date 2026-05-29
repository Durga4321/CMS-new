import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, CalendarPlus, Plus, Eye, Edit3, Trash2, RefreshCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { useApiResource } from "@/hooks/use-api-resource";
import { api, toArray, getPayload } from "@/lib/api";
import { normalizePatient } from "@/lib/api-normalizers";
import {
  cleanEmail,
  digitsOnly,
  EMAIL_INPUT_PATTERN,
  firstError,
  lettersOnly,
  validateEmail,
  validateName,
  validateNumber,
  validateAddress,
  validatePastOrTodayDate,
  validatePhone,
} from "@/lib/form-validation";
import { emptyPatient, nextPatientId, useReceptionStore } from "@/lib/reception-store";

export const Route = createFileRoute("/_app/reception/patients")({
  component: ReceptionPatientsPage,
  head: () => ({ meta: [{ title: "Patients - Medisuite" }] }),
});

const emptyMedicalHistory = {
  id: "",
  patientId: "",
  allergies: "",
  chronicDiseases: "",
  currentMedications: "",
  surgeries: "",
};

function resolveMedicalHistoryPatientId(patient) {
  const rawValue = patient?.patientId ?? patient?.id ?? "";
  const numericValue = String(rawValue).match(/\d+/)?.[0] ?? "";
  const patientId = Number(numericValue || rawValue);
  return Number.isFinite(patientId) ? patientId : "";
}

function normalizeMedicalHistory(record, patientId = "") {
  const medicalHistory = getPayload(record) ?? record ?? {};
  return {
    id: String(medicalHistory.id ?? medicalHistory.medicalHistoryId ?? ""),
    patientId: String(medicalHistory.patientId ?? medicalHistory.patient_id ?? patientId ?? ""),
    allergies: medicalHistory.allergies ?? "",
    chronicDiseases: medicalHistory.chronicDiseases ?? medicalHistory.chronic_diseases ?? "",
    currentMedications:
      medicalHistory.currentMedications ?? medicalHistory.current_medications ?? "",
    surgeries: medicalHistory.surgeries ?? medicalHistory.surgeryHistory ?? "",
  };
}

function ReceptionPatientsPage() {
  const navigate = useNavigate();
  const receptionStore = useReceptionStore();
  const {
    data: apiPatients,
    setData: setApiPatients,
    loading: patientsLoading,
    error: patientsError,
    reload,
  } = useApiResource(async () => toArray(await api.patients.list()).map(normalizePatient), []);
  const patients = apiPatients;
  const [form, setForm] = useState({ ...emptyPatient, id: nextPatientId(patients?.length ?? 0) });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState("list");
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [medicalHistoryForm, setMedicalHistoryForm] = useState(emptyMedicalHistory);
  const [medicalHistoryLoading, setMedicalHistoryLoading] = useState(false);
  const [medicalHistorySaving, setMedicalHistorySaving] = useState(false);
  const [medicalHistoryError, setMedicalHistoryError] = useState("");

  useEffect(() => {
    if (mode === "create") {
      setForm({ ...emptyPatient, id: nextPatientId(patients?.length ?? 0) });
      setSelectedPatientId(null);
      setMessage("");
    }
  }, [mode, patients?.length]);

  const selectedPatient = patients?.find((item) => item.id === selectedPatientId) ?? null;
  const isEditing = mode === "edit";
  const isViewing = mode === "view" && selectedPatient;

  useEffect(() => {
    let active = true;

    if (!isViewing || !selectedPatient) {
      setMedicalHistoryForm(emptyMedicalHistory);
      setMedicalHistoryLoading(false);
      setMedicalHistoryError("");
      return () => {
        active = false;
      };
    }

    const patientId = resolveMedicalHistoryPatientId(selectedPatient);
    setMedicalHistoryForm({ ...emptyMedicalHistory, patientId: String(patientId) });
    setMedicalHistoryError("");

    if (!patientId) {
      setMedicalHistoryLoading(false);
      return () => {
        active = false;
      };
    }

    setMedicalHistoryLoading(true);
    (async () => {
      try {
        const response = await api.medicalHistory.get(patientId);
        if (active) setMedicalHistoryForm(normalizeMedicalHistory(response, patientId));
      } catch (err) {
        if (active && err?.status !== 404) {
          setMedicalHistoryError(err?.message ?? "Unable to load medical history");
        }
      } finally {
        if (active) setMedicalHistoryLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [isViewing, selectedPatient]);

  const mirrorPatient = (patient) => {
    receptionStore.setReceptionState((current) => {
      const existingIndex = current.patients.findIndex((item) => item.id === patient.id);
      const nextPatients =
        existingIndex >= 0
          ? current.patients.map((item, index) => (index === existingIndex ? patient : item))
          : [...current.patients, patient];

      return { ...current, patients: nextPatients };
    });
    setApiPatients((current) => {
      const existingIndex = current.findIndex((item) => item.id === patient.id);
      if (existingIndex >= 0) {
        return current.map((item, index) => (index === existingIndex ? patient : item));
      }
      return current.length > 0 ? [...current, patient] : current;
    });
  };

  const removeMirroredPatient = (patientId) => {
    receptionStore.setReceptionState((current) => ({
      ...current,
      patients: current.patients.filter((item) => item.id !== patientId),
      appointments: current.appointments.filter((item) => item.patientId !== patientId),
      bills: current.bills.filter((item) => item.patientId !== patientId),
    }));
    setApiPatients((current) => current.filter((item) => item.id !== patientId));
  };

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const resetForm = (patient = null) => {
    if (!patient) {
      setForm({ ...emptyPatient, id: nextPatientId(patients?.length ?? 0) });
      return;
    }

    setForm({
      ...emptyPatient,
      ...patient,
      id: patient.id,
      name: patient.name,
      phone: patient.phone,
      email: patient.email,
      age: patient.age?.toString() ?? "",
      dob: patient.dob?.slice(0, 10) ?? "",
      address: patient.address ?? patient.street ?? "",
      bloodGroup: patient.bloodGroup ?? "",
      emergencyName: patient.emergencyName,
      emergencyPhone: patient.emergencyPhone,
    });
  };

  const selectPatient = (patient, action) => {
    setSelectedPatientId(patient.id);
    setMessage("");
    if (action === "view") {
      setMode("view");
      return;
    }
    if (action === "edit") {
      resetForm(patient);
      setMode("edit");
      return;
    }
    setMode("list");
  };

  const updateMedicalHistory = (field, value) => {
    setMedicalHistoryForm((current) => ({ ...current, [field]: value }));
  };

  const submitMedicalHistory = async (event) => {
    event.preventDefault();
    const patientId = Number(medicalHistoryForm.patientId);
    if (!patientId || Number.isNaN(patientId)) {
      setMedicalHistoryError("Selected patient does not have a numeric patient ID.");
      return;
    }

    const payload = {
      patientId,
      allergies: medicalHistoryForm.allergies.trim(),
      chronicDiseases: medicalHistoryForm.chronicDiseases.trim(),
      currentMedications: medicalHistoryForm.currentMedications.trim(),
      surgeries: medicalHistoryForm.surgeries.trim(),
    };

    setMedicalHistorySaving(true);
    setMedicalHistoryError("");
    try {
      const response = medicalHistoryForm.id
        ? await api.medicalHistory.update(medicalHistoryForm.id, payload)
        : await api.medicalHistory.create(payload);
      setMedicalHistoryForm(normalizeMedicalHistory(getPayload(response) ?? payload, patientId));
      toast.success(
        medicalHistoryForm.id
          ? "Medical history updated successfully"
          : "Medical history saved successfully",
      );
    } catch (err) {
      setMedicalHistoryError(err?.message ?? "Unable to save medical history");
      toast.error(err?.message ?? "Unable to save medical history");
    } finally {
      setMedicalHistorySaving(false);
    }
  };

  const handleDelete = async (patient) => {
    const confirmed = window.confirm(`Delete patient ${patient.name} (${patient.id})?`);
    if (!confirmed) return;
    setSaving(true);
    try {
      try {
        await api.patients.remove(patient.id);
        await reload();
      } catch (err) {
        if (apiPatients.length > 0 && !patientsError) throw err;
      }
      removeMirroredPatient(patient.id);
      toast.success("Patient deleted successfully");
      setSelectedPatientId(null);
      setMode("list");
    } catch (err) {
      toast.error(err?.message ?? "Could not delete patient");
    } finally {
      setSaving(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    const patient = {
      ...form,
      id: form.id.trim() || nextPatientId(patients?.length ?? 0),
      name: form.name.trim(),
      phone: digitsOnly(form.phone),
      emergencyPhone: digitsOnly(form.emergencyPhone),
      email: cleanEmail(form.email),
      age: digitsOnly(form.age, 3),
      address: form.address.trim(),
      bloodGroup: form.bloodGroup.trim(),
    };

    const error = firstError([
      validateName(patient.name, "Patient name"),
      patient.age ? validateNumber(patient.age, "Age") : "",
      Number(patient.age) > 0 && Number(patient.age) <= 120 ? "" : "Age must be between 1 and 120",
      validatePastOrTodayDate(patient.dob, "Date of birth"),
      validatePhone(patient.phone),
      patient.email ? validateEmail(patient.email) : "",
      validateAddress(patient.address, "Address"),
      validateName(patient.emergencyName, "Emergency contact name"),
      validatePhone(patient.emergencyPhone),
    ]);

    if (error) {
      setMessage(error);
      return;
    }

    const duplicate = (patients ?? []).some(
      (item) =>
        (item.id.toLowerCase() === patient.id.toLowerCase() &&
          (!isEditing || item.id !== selectedPatientId)) ||
        (item.phone === patient.phone &&
          item.phone &&
          (!isEditing || item.id !== selectedPatientId)),
    );
    if (duplicate) {
      setMessage("Duplicate patient entry found by PID or mobile number.");
      return;
    }

    setSaving(true);
    try {
      if (isEditing) {
        let savedPatient = normalizePatient(patient);
        try {
          const response = await api.patients.update(selectedPatientId, toPatientPayload(patient));
          savedPatient = normalizePatient(getPayload(response) ?? patient);
          await reload();
        } catch (err) {
          if (apiPatients.length > 0 && !patientsError) throw err;
        }
        mirrorPatient(savedPatient);
        toast.success("Patient updated successfully");
        setMode("list");
      } else {
        let savedPatient = normalizePatient(patient);
        try {
          const response = await api.patients.create(toPatientPayload(patient));
          savedPatient = normalizePatient(getPayload(response) ?? patient);
          await reload();
        } catch (err) {
          if (apiPatients.length > 0 && !patientsError) throw err;
        }
        mirrorPatient(savedPatient);
        toast.success("Patient saved successfully");
        navigate({ to: "/reception/appointments", search: { patientId: savedPatient.id } });
      }
      if (!isEditing) return;
      setSelectedPatientId(null);
    } catch (err) {
      setMessage(
        err?.message ?? (isEditing ? "Unable to update patient" : "Unable to save patient"),
      );
      toast.error(
        err?.message ?? (isEditing ? "Unable to update patient" : "Unable to save patient"),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Patients"
        description="Manage patients: add new patients, view existing details, update records, or remove outdated entries."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="gap-1.5 bg-emerald-100 text-emerald-900 border border-emerald-200 hover:bg-emerald-200"
              onClick={() => setMode("create")}
            >
              <Plus className="h-4 w-4" />
              Add Patient
            </Button>
            <Button variant="ghost" className="gap-1.5" onClick={() => reload()}>
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
            <Button
              variant="outline"
              className="gap-1.5 bg-emerald-100 text-emerald-900 border border-emerald-200 hover:bg-emerald-200"
              asChild
            >
              <Link to="/reception">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Dashboard
              </Link>
            </Button>
          </div>
        }
      />

      {message && (
        <div className="mb-5 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {message}
        </div>
      )}
      {patientsError && (
        <div className="mb-5 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {patientsError}
        </div>
      )}

      <div className="space-y-6">
        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold">Patient List</h2>
              <p className="text-sm text-muted-foreground">
                View, edit, or delete registered patients.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="bg-emerald-100 text-emerald-900 border border-emerald-200 hover:bg-emerald-200"
                onClick={() => setMode("create")}
              >
                Add Patient
              </Button>
              <Button variant="ghost" size="sm" onClick={() => reload()}>
                Refresh
              </Button>
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">PID</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Age</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {patients?.map((patient) => (
                  <tr key={patient.id}>
                    <td className="px-4 py-3 font-medium">{patient.id}</td>
                    <td className="px-4 py-3">{patient.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{patient.phone || "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {patient.age ? `${patient.age} yrs` : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="inline-flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => selectPatient(patient, "view")}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="gap-2"
                          onClick={() => selectPatient(patient, "edit")}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="gap-2"
                          onClick={() => handleDelete(patient)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {patients?.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      {patientsLoading ? "Loading patients..." : "No patients found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {isViewing && selectedPatient && (
          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold">Patient Details</h2>
                <p className="text-sm text-muted-foreground">
                  Review patient information and use the actions below.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectPatient(selectedPatient, "edit")}
                >
                  <Edit3 className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(selectedPatient)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem label="PID" value={selectedPatient.id} />
              <DetailItem label="Name" value={selectedPatient.name} />
              <DetailItem
                label="Age"
                value={selectedPatient.age ? `${selectedPatient.age} yrs` : "-"}
              />
              <DetailItem label="Gender" value={selectedPatient.gender || "-"} />
              <DetailItem label="Date of Birth" value={selectedPatient.dob || "-"} />
              <DetailItem label="Phone" value={selectedPatient.phone || "-"} />
              <DetailItem label="Email" value={selectedPatient.email || "-"} />
              <DetailItem
                label="Address"
                value={selectedPatient.address || selectedPatient.street || "-"}
              />
              <DetailItem label="Blood Group" value={selectedPatient.bloodGroup || "-"} />
              <DetailItem
                label="Emergency Contact"
                value={
                  selectedPatient.emergencyName
                    ? `${selectedPatient.emergencyName} - ${selectedPatient.emergencyPhone}`
                    : "-"
                }
              />
            </div>
            <form
              onSubmit={submitMedicalHistory}
              className="mt-6 space-y-4 border-t border-border pt-5"
            >
              <div>
                <h3 className="text-sm font-semibold">Medical History</h3>
                {medicalHistoryError && (
                  <div className="mt-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    {medicalHistoryError}
                  </div>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Patient ID"
                  value={medicalHistoryForm.patientId}
                  onChange={(value) => updateMedicalHistory("patientId", digitsOnly(value))}
                  inputMode="numeric"
                  dataKind="numbers"
                />
                <Field
                  label="Allergies"
                  value={medicalHistoryForm.allergies}
                  onChange={(value) => updateMedicalHistory("allergies", value)}
                />
                <Field
                  label="Chronic Diseases"
                  value={medicalHistoryForm.chronicDiseases}
                  onChange={(value) => updateMedicalHistory("chronicDiseases", value)}
                />
                <Field
                  label="Current Medications"
                  value={medicalHistoryForm.currentMedications}
                  onChange={(value) => updateMedicalHistory("currentMedications", value)}
                />
                <Field
                  label="Surgeries"
                  value={medicalHistoryForm.surgeries}
                  onChange={(value) => updateMedicalHistory("surgeries", value)}
                />
              </div>
              <Button
                type="submit"
                disabled={medicalHistorySaving || medicalHistoryLoading}
                className="gap-1.5"
              >
                <Save className="h-4 w-4" />
                {medicalHistorySaving ? "Saving..." : "Save Medical History"}
              </Button>
            </form>
          </section>
        )}

        {(mode === "create" || isEditing) && (
          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold">
                  {isEditing ? "Edit Patient" : "Add Patient"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isEditing
                    ? `Update the patient record for ${selectedPatient?.name || "selected patient"}.`
                    : "Register a new patient and continue to appointment booking."}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setMode("list")}>
                Back to list
              </Button>
            </div>
            <form onSubmit={submit} className="space-y-5">
              {formSectionFields({ form, update })}
              <Button
                disabled={saving || patientsLoading}
                className="w-full gap-1.5 bg-primary text-primary-foreground"
              >
                <Plus className="h-4 w-4" />
                {saving
                  ? isEditing
                    ? "Updating patient..."
                    : "Saving patient..."
                  : isEditing
                    ? "Update Patient"
                    : "Save Patient and Continue to Booking"}
                <CalendarPlus className="h-4 w-4" />
              </Button>
            </form>
          </section>
        )}
      </div>
    </>
  );
}

function formSectionFields({ form, update }) {
  return (
    <>
      <FormSection title="Basic Patient Information">
        <Field
          label="Full Name"
          value={form.name}
          onChange={(value) => update("name", lettersOnly(value))}
          dataKind="letters"
        />
        <Field
          label="Age"
          value={form.age}
          onChange={(value) => update("age", digitsOnly(value, 3))}
          dataKind="numbers"
          inputMode="numeric"
          maxLength={3}
        />
        <Field
          label="Date of Birth"
          type="date"
          value={form.dob}
          onChange={(value) => update("dob", value)}
        />
        <SelectField
          label="Gender"
          value={form.gender}
          onChange={(value) => update("gender", value)}
          options={["Female", "Male", "Other"]}
        />
        <Field
          label="Blood Group"
          value={form.bloodGroup}
          onChange={(value) => update("bloodGroup", value.toUpperCase())}
          placeholder="O+"
        />
      </FormSection>
      <FormSection title="Contact Information">
        <Field
          label="Mobile Number"
          value={form.phone}
          onChange={(value) => update("phone", digitsOnly(value))}
          type="tel"
          inputMode="numeric"
          maxLength={10}
          dataKind="numbers"
        />
        <Field
          label="Email"
          value={form.email}
          onChange={(value) => update("email", cleanEmail(value))}
          type="email"
          pattern={EMAIL_INPUT_PATTERN}
        />
        <Field
          label="Address"
          value={form.address}
          onChange={(value) => update("address", value)}
        />
      </FormSection>
      <FormSection title="Emergency Contact Information">
        <Field
          label="Emergency Contact Name"
          value={form.emergencyName}
          onChange={(value) => update("emergencyName", lettersOnly(value))}
          dataKind="letters"
        />
        <Field
          label="Emergency Contact Mobile Number"
          value={form.emergencyPhone}
          onChange={(value) => update("emergencyPhone", digitsOnly(value))}
          type="tel"
          inputMode="numeric"
          maxLength={10}
          dataKind="numbers"
        />
      </FormSection>
    </>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/50 p-4">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-2 text-sm font-semibold">{value || "-"}</div>
    </div>
  );
}

function toPatientPayload(patient) {
  return {
    name: patient.name,
    phone: patient.phone,
    age: Number(patient.age),
    gender: patient.gender,
    email: patient.email,
    address: patient.address,
    bloodGroup: patient.bloodGroup,
    dateOfBirth: toIsoDate(patient.dob),
    emergencyContactName: patient.emergencyName,
    emergencyContactPhone: patient.emergencyPhone,
  };
}

function toIsoDate(value) {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function FormSection({ title, children }) {
  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  dataKind,
  ...inputProps
}) {
  const handleChange = (event) => {
    const rawValue = event.target.value;
    if (dataKind === "letters") return onChange(lettersOnly(rawValue));
    if (dataKind === "numbers") return onChange(digitsOnly(rawValue, inputProps.maxLength ?? 100));
    return onChange(rawValue);
  };

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      <input
        type={type}
        value={value}
        onChange={handleChange}
        {...inputProps}
        className="h-11 w-full rounded-lg border border-input bg-card px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
        placeholder={placeholder || label}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-lg border border-input bg-card px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
