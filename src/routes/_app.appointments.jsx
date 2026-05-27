import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, ClipboardList, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, StatusBadge } from "@/components/layout/PageHeader";
import { useApiResource } from "@/hooks/use-api-resource";
import { api, toArray } from "@/lib/api";
import { normalizeAppointment } from "@/lib/api-normalizers";
import { useReceptionStore } from "@/lib/reception-store";

export const Route = createFileRoute("/_app/appointments")({
  component: AppointmentsPage,
  head: () => ({ meta: [{ title: "Appointments - Medisuite" }] }),
});

function AppointmentsPage() {
  const search = useSearch({ strict: false });
  const receptionStore = useReceptionStore();
  const { data: apiAppointments, loading } = useApiResource(
    async () => toArray(await api.appointments.list()).map(normalizeAppointment),
    [],
  );
  const appointments = apiAppointments.map(normalizeAdminAppointment);
  const [selected, setSelected] = useState(null);
  const [dateFilter, setDateFilter] = useState(String(search.date ?? ""));
  const [doctorFilter, setDoctorFilter] = useState(String(search.doctor ?? "all"));
  const [query, setQuery] = useState("");
  const doctors = useMemo(() => [...new Set(appointments.map((item) => item.doctor))], [appointments]);
  const filtered = appointments.filter(
    (item) =>
      (!dateFilter || item.date === dateFilter) &&
      (doctorFilter === "all" || item.doctor === doctorFilter) &&
      (item.patient.toLowerCase().includes(query.toLowerCase()) ||
        item.doctor.toLowerCase().includes(query.toLowerCase())),
  );

  if (selected) {
    return (
      <>
        <PageHeader
          title="Appointment Detail"
          description="Monitor patient, doctor, time slot and status details."
          actions={
            <Button variant="outline" className="gap-1.5" onClick={() => setSelected(null)}>
              <ArrowLeft className="h-4 w-4" />
              Appointment List
            </Button>
          }
        />
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="grid gap-4 md:grid-cols-2">
            <Detail label="Patient Info" value={`${selected.patient} - ${selected.patientInfo}`} />
            <Detail label="Doctor Info" value={`${selected.doctor} - ${selected.doctorInfo}`} />
            <Detail label="Time Slot" value={`${selected.date} at ${selected.time}`} />
            <div className="rounded-lg border border-border bg-secondary/40 p-4">
              <div className="text-sm text-muted-foreground">Status</div>
              <div className="mt-2">
                <StatusBadge status={selected.status} />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Appointment List" description="Filter by date or doctor and open appointments for monitoring." />
      <div className="rounded-xl border border-border bg-card shadow-card">
        <div className="grid gap-3 border-b border-border p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search appointments..."
              className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
          <input
            type="date"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
          <select
            value={doctorFilter}
            onChange={(event) => setDoctorFilter(event.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
          >
            <option value="all">All doctors</option>
            {doctors.map((doctor) => (
              <option key={doctor} value={doctor}>
                {doctor}
              </option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 font-medium">Patient Name</th>
                <th className="px-5 py-3 font-medium">Doctor Name</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Time</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                  <td className="px-5 py-3.5 font-medium">{item.patient}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{item.doctor}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{item.date}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{item.time}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setSelected(item)}>
                      <ClipboardList className="h-3.5 w-3.5" />
                      View Detail
                    </Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    {loading ? "Loading appointments..." : "No appointments found."}
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

function normalizeAdminAppointment(appointment) {
  const normalized = normalizeAppointment(appointment);
  return {
    ...normalized,
    patientInfo: appointment.patientInfo ?? appointment.patient_info ?? normalized.patientId,
    doctorInfo: appointment.doctorInfo ?? appointment.doctor_info ?? "Assigned doctor",
  };
}

function Detail({ label, value }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/40 p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CalendarDays className="h-4 w-4" />
        {label}
      </div>
      <div className="mt-2 font-medium">{value}</div>
    </div>
  );
}
