import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, CalendarPlus, Plus, Eye, Edit3, Trash2, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { useApiResource } from "@/hooks/use-api-resource";
import { api, toArray, getPayload } from "@/lib/api";
import { normalizePatient } from "@/lib/api-normalizers";
import {
  alphaNumericOnly,
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
import { chronicOptions, emptyPatient, nextPatientId, useReceptionStore } from "@/lib/reception-store";

export const Route = createFileRoute("/_app/reception/patients")({
  component: ReceptionPatientsPage,
  head: () => ({ meta: [{ title: "Patients - Medisuite" }] }),
});

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
  const toggleChronic = (disease) => {
    setForm((current) => ({
      ...current,
      chronicDiseases: current.chronicDiseases.includes(disease)
        ? current.chronicDiseases.filter((item) => item !== disease)
        : [...current.chronicDiseases, disease],
    }));
  };

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
      pinCode: patient.pinCode,
      dob: patient.dob?.slice(0, 10) ?? "",
      type: patient.type,
      street: patient.street,
      city: patient.city,
      state: patient.state,
      emergencyName: patient.emergencyName,
      emergencyPhone: patient.emergencyPhone,
      drugAllergies: patient.drugAllergies,
      foodAllergies: patient.foodAllergies,
      environmentalAllergies: patient.environmentalAllergies,
      chronicDiseases: patient.chronicDiseases ?? [],
      otherChronic: patient.otherChronic ?? "",
      medicationName: patient.medicationName ?? "",
      medicationDosage: patient.medicationDosage ?? "",
      medicationFrequency: patient.medicationFrequency ?? "",
      surgeryName: patient.surgeryName ?? "",
      surgeryYear: patient.surgeryYear?.toString() ?? "",
      previousVisitDate: patient.previousVisitDate?.slice(0, 10) ?? "",
      previousDoctor: patient.previousDoctor ?? "",
      previousComplaint: patient.previousComplaint ?? "",
      previousDiagnosis: patient.previousDiagnosis ?? "",
      previousTreatment: patient.previousTreatment ?? "",
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
      pinCode: digitsOnly(form.pinCode, 6),
      surgeryYear: digitsOnly(form.surgeryYear, 4),
    };

    const error = firstError([
      validateName(patient.name, "Patient name"),
      patient.age ? validateNumber(patient.age, "Age") : "",
      Number(patient.age) > 0 && Number(patient.age) <= 120 ? "" : "Age must be between 1 and 120",
      validatePastOrTodayDate(patient.dob, "Date of birth"),
      validatePhone(patient.phone),
      patient.email ? validateEmail(patient.email) : "",
      validateAddress(patient.street, "Street address"),
      validateName(patient.city, "City"),
      validateName(patient.state, "State"),
      patient.pinCode.length === 6 ? "" : "PIN Code must be 6 digits",
      validateName(patient.emergencyName, "Emergency contact name"),
      validatePhone(patient.emergencyPhone),
      patient.surgeryYear && Number(patient.surgeryYear) > new Date().getFullYear()
        ? "Surgery year cannot be in the future"
        : "",
    ]);

    if (error) {
      setMessage(error);
      return;
    }

    const duplicate = (patients ?? []).some(
      (item) =>
        (item.id.toLowerCase() === patient.id.toLowerCase() && (!isEditing || item.id !== selectedPatientId)) ||
        (item.phone === patient.phone && item.phone && (!isEditing || item.id !== selectedPatientId)),
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
      setMessage(err?.message ?? (isEditing ? "Unable to update patient" : "Unable to save patient"));
      toast.error(err?.message ?? (isEditing ? "Unable to update patient" : "Unable to save patient"));
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
              <p className="text-sm text-muted-foreground">View, edit, or delete registered patients.</p>
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
                  <th className="px-4 py-3 font-medium">Type</th>
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
                    <td className="px-4 py-3">{patient.type}</td>
                    <td className="px-4 py-3 text-muted-foreground">{patient.age ? `${patient.age} yrs` : "-"}</td>
                    <td className="px-4 py-3">
                      <div className="inline-flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => selectPatient(patient, "view")}>
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Button>
                        <Button variant="secondary" size="sm" className="gap-2" onClick={() => selectPatient(patient, "edit")}>
                          <Edit3 className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button variant="destructive" size="sm" className="gap-2" onClick={() => handleDelete(patient)}>
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {patients?.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
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
                <p className="text-sm text-muted-foreground">Review patient information and use the actions below.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => selectPatient(selectedPatient, "edit")}>
                  <Edit3 className="h-4 w-4" />
                  Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(selectedPatient)}>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem label="PID" value={selectedPatient.id} />
              <DetailItem label="Name" value={selectedPatient.name} />
              <DetailItem label="Age" value={selectedPatient.age ? `${selectedPatient.age} yrs` : "-"} />
              <DetailItem label="Gender" value={selectedPatient.gender || "-"} />
              <DetailItem label="Type" value={selectedPatient.type || "-"} />
              <DetailItem label="Date of Birth" value={selectedPatient.dob || "-"} />
              <DetailItem label="Phone" value={selectedPatient.phone || "-"} />
              <DetailItem label="Email" value={selectedPatient.email || "-"} />
              <DetailItem label="Address" value={selectedPatient.street ? `${selectedPatient.street}, ${selectedPatient.city}, ${selectedPatient.state}, ${selectedPatient.pinCode}` : "-"} />
              <DetailItem label="Emergency Contact" value={selectedPatient.emergencyName ? `${selectedPatient.emergencyName} · ${selectedPatient.emergencyPhone}` : "-"} />
              <DetailItem label="Allergies" value={[selectedPatient.drugAllergies, selectedPatient.foodAllergies, selectedPatient.environmentalAllergies].filter(Boolean).join(", ") || "-"} />
              <DetailItem label="Chronic Diseases" value={(selectedPatient.chronicDiseases || []).join(", ") || "-"} />
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <DetailItem label="Other chronic illnesses" value={selectedPatient.otherChronic || "-"} />
              <DetailItem label="Current Medications" value={[selectedPatient.medicationName, selectedPatient.medicationDosage, selectedPatient.medicationFrequency].filter(Boolean).join(" | ") || "-"} />
              <DetailItem label="Surgery History" value={[selectedPatient.surgeryName, selectedPatient.surgeryYear].filter(Boolean).join(" - ") || "-"} />
              <DetailItem label="Previous Visit Date" value={selectedPatient.previousVisitDate || "-"} />
              <DetailItem label="Previous Doctor" value={selectedPatient.previousDoctor || "-"} />
              <DetailItem label="Symptoms / Complaint" value={selectedPatient.previousComplaint || "-"} />
              <DetailItem label="Diagnosis Summary" value={selectedPatient.previousDiagnosis || "-"} />
              <DetailItem label="Treatment Given" value={selectedPatient.previousTreatment || "-"} />
            </div>
          </section>
        )}

        {(mode === "create" || isEditing) && (
          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold">{isEditing ? "Edit Patient" : "Add Patient"}</h2>
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
              {formSectionFields({ form, update, toggleChronic })}
              <Button disabled={saving || patientsLoading} className="w-full gap-1.5 bg-primary text-primary-foreground">
                <Plus className="h-4 w-4" />
                {saving ? (isEditing ? "Updating patient..." : "Saving patient...") : isEditing ? "Update Patient" : "Save Patient and Continue to Booking"}
                <CalendarPlus className="h-4 w-4" />
              </Button>
            </form>
          </section>
        )}
      </div>
    </>
  );
}

function formSectionFields({ form, update, toggleChronic }) {
  return (
    <>
      <FormSection title="Basic Patient Information">
        <Field
          label="Patient ID (PID)"
          value={form.id}
          onChange={(value) => update("id", alphaNumericOnly(value).toUpperCase())}
          dataKind="alphanumeric"
        />
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
        <SelectField
          label="Patient Type"
          value={form.type}
          onChange={(value) => update("type", value)}
          options={["OPD", "IPD"]}
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
          label="Street Address"
          value={form.street}
          onChange={(value) => update("street", value)}
        />
        <Field
          label="City"
          value={form.city}
          onChange={(value) => update("city", lettersOnly(value))}
          dataKind="letters"
        />
        <Field
          label="State"
          value={form.state}
          onChange={(value) => update("state", lettersOnly(value))}
          dataKind="letters"
        />
        <Field
          label="PIN Code"
          value={form.pinCode}
          onChange={(value) => update("pinCode", digitsOnly(value, 6))}
          inputMode="numeric"
          maxLength={6}
          dataKind="numbers"
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
      <FormSection title="Medical Information">
        <Field
          label="Drug Allergies"
          value={form.drugAllergies}
          onChange={(value) => update("drugAllergies", value)}
          placeholder="Penicillin"
        />
        <Field
          label="Food Allergies"
          value={form.foodAllergies}
          onChange={(value) => update("foodAllergies", value)}
          placeholder="Peanuts"
        />
        <Field
          label="Environmental Allergies"
          value={form.environmentalAllergies}
          onChange={(value) => update("environmentalAllergies", value)}
          placeholder="Pollen"
        />
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium">
            Chronic Diseases / Existing Conditions
          </label>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {chronicOptions.map((condition) => (
              <label
                key={condition}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={form.chronicDiseases.includes(condition)}
                  onChange={() => toggleChronic(condition)}
                />
                {condition}
              </label>
            ))}
          </div>
        </div>
        <Field
          label="Other chronic illnesses"
          value={form.otherChronic}
          onChange={(value) => update("otherChronic", value)}
        />
      </FormSection>
      <FormSection title="Current Medications">
        <Field
          label="Medicine Name"
          value={form.medicationName}
          onChange={(value) => update("medicationName", value)}
          placeholder="Amlodipine"
        />
        <Field
          label="Dosage"
          value={form.medicationDosage}
          onChange={(value) => update("medicationDosage", value)}
          placeholder="5mg"
        />
        <Field
          label="Frequency"
          value={form.medicationFrequency}
          onChange={(value) => update("medicationFrequency", value)}
          placeholder="Once daily"
        />
      </FormSection>
      <FormSection title="Surgery History">
        <Field
          label="Surgery Name"
          value={form.surgeryName}
          onChange={(value) => update("surgeryName", lettersOnly(value))}
          placeholder="Appendectomy"
          dataKind="letters"
        />
        <Field
          label="Surgery Year"
          value={form.surgeryYear}
          onChange={(value) => update("surgeryYear", digitsOnly(value, 4))}
          inputMode="numeric"
          maxLength={4}
          placeholder="2010"
          dataKind="numbers"
        />
      </FormSection>
      <FormSection title="Previous Visits">
        <Field
          label="Visit Date"
          type="date"
          value={form.previousVisitDate}
          onChange={(value) => update("previousVisitDate", value)}
        />
        <Field
          label="Consulting Doctor Name"
          value={form.previousDoctor}
          onChange={(value) => update("previousDoctor", lettersOnly(value))}
          dataKind="letters"
        />
        <TextAreaField
          label="Symptoms / Complaint"
          value={form.previousComplaint}
          onChange={(value) => update("previousComplaint", value)}
        />
        <TextAreaField
          label="Diagnosis Summary"
          value={form.previousDiagnosis}
          onChange={(value) => update("previousDiagnosis", value)}
        />
        <TextAreaField
          label="Treatment Given"
          value={form.previousTreatment}
          onChange={(value) => update("previousTreatment", value)}
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
  const previousVisits =
    patient.previousVisitDate ||
    patient.previousDoctor ||
    patient.previousComplaint ||
    patient.previousDiagnosis ||
    patient.previousTreatment
      ? [
          {
            visitDate: toIsoDate(patient.previousVisitDate),
            doctorName: patient.previousDoctor,
            symptoms: patient.previousComplaint,
            diagnosisSummary: patient.previousDiagnosis,
            treatmentGiven: patient.previousTreatment,
          },
        ]
      : [];

  return {
    name: patient.name,
    phone: patient.phone,
    age: Number(patient.age),
    gender: patient.gender,
    email: patient.email,
    address: [patient.street, patient.city, patient.state, patient.pinCode]
      .filter(Boolean)
      .join(", "),
    bloodGroup: patient.bloodGroup,
    dateOfBirth: toIsoDate(patient.dob),
    emergencyContactName: patient.emergencyName,
    emergencyContactPhone: patient.emergencyPhone,
    patientType: patient.type,
    mobileNumber: patient.phone,
    streetAddress: patient.street,
    city: patient.city,
    state: patient.state,
    pinCode: patient.pinCode,
    emergencyContactMobileNumber: patient.emergencyPhone,
    allergies: [patient.drugAllergies, patient.foodAllergies, patient.environmentalAllergies]
      .filter(Boolean)
      .join(", "),
    drugAllergies: patient.drugAllergies,
    foodAllergies: patient.foodAllergies,
    environmentalAllergies: patient.environmentalAllergies,
    chronicDiseases: patient.chronicDiseases.join(", "),
    currentMedications: [
      patient.medicationName,
      patient.medicationDosage,
      patient.medicationFrequency,
    ]
      .filter(Boolean)
      .join(" | "),
    surgeryHistory: [patient.surgeryName, patient.surgeryYear].filter(Boolean).join(" - "),
    previousVisits,
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
    if (dataKind === "alphanumeric") return onChange(alphaNumericOnly(rawValue));
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

function TextAreaField({ label, value, onChange }) {
  return (
    <div className="md:col-span-2">
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-20 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
        placeholder={label}
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
