import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarClock, Edit, Plus, Save, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, StatusBadge } from "@/components/layout/PageHeader";
import { useApiResource } from "@/hooks/use-api-resource";
import { api, recordSystemLog, rememberUserDirectoryEntry, toArray } from "@/lib/api";
import { normalizeStatus, text } from "@/lib/api-normalizers";

export const Route = createFileRoute("/_app/doctors")({
  component: DoctorsPage,
  head: () => ({ meta: [{ title: "Doctors - Medisuite" }] }),
});

const blankDoctor = {
  name: "",
  email: "",
  phone: "",
  specialization: "",
  experience: "",
  qualification: "",
  fee: "",
  status: "active",
};

function DoctorsPage() {
  const {
    data: doctors,
    setData: setDoctors,
    loading,
    error,
  } = useApiResource(async () => toArray(await api.doctors.list()).map(normalizeDoctor), []);
  const [query, setQuery] = useState("");
  const [screen, setScreen] = useState("list");
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [actionError, setActionError] = useState("");
  const [schedule, setSchedule] = useState({
    doctorName: "",
    workingDays: "",
    startTime: "",
    endTime: "",
    slotDuration: "",
    breakTime: "",
  });

  const filtered = doctors.filter(
    (doctor) =>
      doctor.name.toLowerCase().includes(query.toLowerCase()) ||
      doctor.specialization.toLowerCase().includes(query.toLowerCase()),
  );

  const saveDoctor = async (event) => {
    event.preventDefault();
    setActionError("");
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") ?? "").trim(),
      specialization: String(form.get("specialization") ?? "").trim(),
      experience: Number(form.get("experience") ?? 0),
      fees: Number(form.get("fee") ?? 0),
      email: String(form.get("email") ?? "").trim(),
      phone: String(form.get("phone") ?? "").trim(),
      password: String(form.get("password") ?? "").trim(),
      isActive: String(form.get("status") ?? "active").toLowerCase() === "active",
    };
    try {
      const response = editingDoctor
        ? await api.doctors.update(editingDoctor.id, payload)
        : await api.doctors.create(payload);
      const savedDoctor = normalizeDoctor(response?.data ?? response ?? payload);
      rememberUserDirectoryEntry({ ...savedDoctor, role: "Doctor" }, "doctor");
      recordSystemLog({
        user: savedDoctor.name,
        email: savedDoctor.email,
        role: "Doctor",
        action: editingDoctor ? "Updated doctor" : "Created doctor",
        module: "Users",
      });
      setDoctors((current) =>
        editingDoctor
          ? current.map((doctor) => (doctor.id === editingDoctor.id ? savedDoctor : doctor))
          : [savedDoctor, ...current],
      );
      setEditingDoctor(null);
      setScreen("list");
    } catch (err) {
      setActionError(err?.message ?? "Unable to save doctor");
    }
  };

  const deleteDoctor = async (id) => {
    setActionError("");
    try {
      await api.doctors.remove(id);
      setDoctors((current) => current.filter((doctor) => doctor.id !== id));
    } catch (err) {
      setActionError(err?.message ?? "Unable to delete doctor");
    }
  };

  if (screen === "form") {
    return (
      <DoctorForm
        title={editingDoctor ? "Edit Doctor" : "Add Doctor"}
        doctor={editingDoctor ?? blankDoctor}
        onCancel={() => {
          setEditingDoctor(null);
          setScreen("list");
        }}
        onSubmit={saveDoctor}
      />
    );
  }

  if (screen === "schedule") {
    return (
      <>
        <PageHeader
          title="Doctor Schedule Setup"
          description="Saved availability is used in the appointment module."
          actions={
            <Button variant="outline" onClick={() => setScreen("list")}>
              Doctor List
            </Button>
          }
        />
        <form
          className="rounded-xl border border-border bg-card p-5 shadow-card"
          onSubmit={(event) => {
            event.preventDefault();
            setScreen("list");
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField
              label="Doctor Name"
              value={schedule.doctorName}
              onChange={(value) => setSchedule({ ...schedule, doctorName: value })}
              options={doctors.map((doctor) => doctor.name)}
            />
            <TextField
              label="Working Days"
              value={schedule.workingDays}
              onChange={(value) => setSchedule({ ...schedule, workingDays: value })}
            />
            <TextField
              label="Start Time"
              type="time"
              value={schedule.startTime}
              onChange={(value) => setSchedule({ ...schedule, startTime: value })}
            />
            <TextField
              label="End Time"
              type="time"
              value={schedule.endTime}
              onChange={(value) => setSchedule({ ...schedule, endTime: value })}
            />
            <TextField
              label="Slot Duration"
              value={schedule.slotDuration}
              onChange={(value) => setSchedule({ ...schedule, slotDuration: value })}
              suffix="minutes"
            />
            <TextField
              label="Break Time"
              value={schedule.breakTime}
              onChange={(value) => setSchedule({ ...schedule, breakTime: value })}
            />
          </div>
          <div className="mt-5 flex justify-end">
            <Button className="gap-1.5">
              <Save className="h-4 w-4" />
              Save Schedule
            </Button>
          </div>
        </form>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Doctor List"
        description="Manage doctor profile details and appointment availability."
        actions={
          <>
            <Button variant="outline" className="gap-1.5" onClick={() => setScreen("schedule")}>
              <CalendarClock className="h-4 w-4" />
              Schedule Setup
            </Button>
            <Button className="gap-1.5" onClick={() => setScreen("form")}>
              <Plus className="h-4 w-4" />
              Add Doctor
            </Button>
          </>
        }
      />
      {(error || actionError) && (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {actionError || error}
        </div>
      )}
      <DataShell query={query} onQueryChange={setQuery} placeholder="Search doctors...">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-3 font-medium">Doctor Name</th>
              <th className="px-5 py-3 font-medium">Specialization</th>
              <th className="px-5 py-3 font-medium">Phone</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((doctor) => (
              <tr
                key={doctor.id}
                className="border-b border-border last:border-0 hover:bg-secondary/40"
              >
                <td className="px-5 py-3.5">
                  <div className="font-medium">{doctor.name}</div>
                  <div className="text-xs text-muted-foreground">{doctor.email}</div>
                </td>
                <td className="px-5 py-3.5 text-muted-foreground">{doctor.specialization}</td>
                <td className="px-5 py-3.5 text-muted-foreground">{doctor.phone}</td>
                <td className="px-5 py-3.5">
                  <StatusBadge status={doctor.status} />
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => {
                        setEditingDoctor(doctor);
                        setScreen("form");
                      }}
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="gap-1.5"
                      onClick={() => deleteDoctor(doctor.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
                  {loading ? "Loading doctors..." : "No doctors found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </DataShell>
    </>
  );
}

function normalizeDoctor(item, index = 0) {
  item = item ?? {};
  return {
    id: text(item.id ?? item._id ?? item.doctorId ?? item.doctor_id, `doctor-${index + 1}`),
    name: text(
      item.name ?? item.fullName ?? [item.firstName, item.lastName].filter(Boolean).join(" "),
      "",
    ),
    email: text(item.email, ""),
    phone: text(item.phone ?? item.mobile ?? item.phoneNumber ?? item.mobileNumber, ""),
    specialization: text(item.specialization ?? item.speciality ?? item.department, ""),
    experience: text(item.experience ?? item.yearsOfExperience, ""),
    qualification: text(item.qualification ?? item.degree, ""),
    fee: text(
      item.fee ?? item.fees ?? item.consultationFee ?? item.consultation_fee,
      "",
    ),
    status: normalizeStatus(item.status ?? item.isActive),
  };
}

function DoctorForm({ title, doctor, onCancel, onSubmit }) {
  return (
    <>
      <PageHeader title={title} description="Enter doctor profile and consultation details." />
      <form onSubmit={onSubmit} className="rounded-xl border border-border bg-card p-5 shadow-card">
        <div className="grid gap-4 md:grid-cols-2">
          <FormInput name="name" label="Doctor Name" defaultValue={doctor.name} required />
          <FormInput name="email" label="Email" type="email" defaultValue={doctor.email} required />
          <FormInput name="phone" label="Phone" defaultValue={doctor.phone} required />
          <FormInput
            name="specialization"
            label="Specialization"
            defaultValue={doctor.specialization}
            required
          />
          <FormInput
            name="experience"
            label="Experience"
            defaultValue={doctor.experience}
            required
          />
          <FormInput
            name="qualification"
            label="Qualification"
            defaultValue={doctor.qualification}
            required
          />
          <FormInput name="fee" label="Consultation Fee" defaultValue={doctor.fee} required />
        </div>
        <FormActions onCancel={onCancel} />
      </form>
    </>
  );
}

function DataShell({ query, onQueryChange, placeholder, children }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-card">
      <div className="border-b border-border p-4">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={placeholder}
            className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

function FormInput({ label, ...props }) {
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

function TextField({ label, value, onChange, suffix, type = "text" }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      <div className="flex">
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
        />
        {suffix && (
          <span className="ml-2 inline-flex h-10 items-center text-sm text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
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
        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}

function FormActions({ onCancel }) {
  return (
    <div className="mt-5 flex justify-end gap-2">
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit" className="gap-1.5">
        <Save className="h-4 w-4" />
        Save
      </Button>
    </div>
  );
}
