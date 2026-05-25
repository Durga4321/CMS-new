import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Clock3, ReceiptText, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { useApiResource } from "@/hooks/use-api-resource";
import { api, getPayload, toArray } from "@/lib/api";
import { normalizeAppointment, normalizePatient } from "@/lib/api-normalizers";
import { validateTodayOrFutureDate } from "@/lib/form-validation";
import { cn } from "@/lib/utils";
import { doctors, nextAppointmentId, slots, today, useReceptionStore } from "@/lib/reception-store";

export const Route = createFileRoute("/_app/reception/appointments")({
  component: AppointmentBookingPage,
  head: () => ({ meta: [{ title: "Book Appointment - Medisuite" }] }),
});

const SLOT_LOCK_DURATION_MS = 5 * 60 * 1000;

function AppointmentBookingPage() {
  const search = useSearch({ strict: false });
  const navigate = useNavigate();
  const receptionStore = useReceptionStore();
  const {
    data: apiPatients,
    loading: patientsLoading,
    error: patientsError,
  } = useApiResource(async () => toArray(await api.patients.list()).map(normalizePatient), []);
  const {
    data: apiTodaysAppointments,
    loading: appointmentsLoading,
    error: appointmentsError,
    reload: reloadAppointments,
  } = useApiResource(
    async () => toArray(await api.appointments.today()).map(normalizeAppointment),
    [],
  );
  const patients = apiPatients.length > 0 ? apiPatients : receptionStore.patients;
  const todaysAppointments =
    apiTodaysAppointments.length > 0 ? apiTodaysAppointments : receptionStore.todaysAppointments;
  const [booking, setBooking] = useState({
    patientId: search.patientId || "",
    doctor: doctors[0],
    date: today(),
  });
  const {
    data: slotRecords,
    loading: slotsLoading,
    error: slotsError,
    reload: reloadSlots,
  } = useApiResource(
    async () => toArray(await api.appointments.slots(booking)).map(normalizeSlot),
    [],
  );
  const [lockedSlot, setLockedSlot] = useState("");
  const [lockedAppointmentId, setLockedAppointmentId] = useState("");
  const [lockedAt, setLockedAt] = useState(null);
  const [lockedBooking, setLockedBooking] = useState(null);
  const [lockRemaining, setLockRemaining] = useState(0);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (search.patientId) setBooking((current) => ({ ...current, patientId: search.patientId }));
  }, [search.patientId]);

  useEffect(() => {
    if (!booking.patientId && patients[0]?.id) {
      setBooking((current) => ({ ...current, patientId: patients[0].id }));
    }
  }, [booking.patientId, patients]);

  useEffect(() => {
    reloadSlots();
  }, [booking.date, booking.doctor, reloadSlots]);

  useEffect(() => {
    if (!lockedSlot || !lockedAt) return;
    const tick = () => {
      const remaining = Math.max(0, lockedAt + SLOT_LOCK_DURATION_MS - Date.now());
      setLockRemaining(remaining);
      if (remaining === 0) {
        setLockedSlot("");
        setLockedAppointmentId("");
        setLockedAt(null);
        setLockedBooking(null);
        setMessage("Temporary slot lock expired. Please select a slot again.");
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [lockedAt, lockedSlot]);

  const slotState = useMemo(() => {
    const availableSlots = slotRecords.length ? slotRecords : slots.map((slot) => ({ time: slot }));
    return availableSlots.reduce((acc, slotRecord) => {
      const slot = slotRecord.time;
      const booked = todaysAppointments.some(
        (item) =>
          item.doctor === booking.doctor && item.date === booking.date && item.time === slot,
      );
      const locked =
        lockedSlot === slot &&
        lockedBooking?.patientId === booking.patientId &&
        lockedBooking?.doctor === booking.doctor &&
        lockedBooking?.date === booking.date;
      acc[slot] = booked ? "Booked" : locked ? "Locked" : slotRecord.status || "Available";
      return acc;
    }, {});
  }, [booking, lockedBooking, lockedSlot, slotRecords, todaysAppointments]);

  const slotOptions = Object.keys(slotState);

  const updateBooking = (field, value) => {
    setBooking((current) => ({ ...current, [field]: value }));
    setLockedSlot("");
    setLockedAppointmentId("");
    setLockedAt(null);
    setLockedBooking(null);
    setLockRemaining(0);
  };

  const lockSlot = async (slot) => {
    const dateError = validateTodayOrFutureDate(booking.date, "Appointment date");
    if (dateError) {
      setMessage(dateError);
      return;
    }
    if (!booking.patientId) {
      setMessage("Select a patient before locking a slot.");
      return;
    }
    if (slotState[slot] === "Booked") {
      setMessage("This slot is already booked.");
      return;
    }
    setBusy(true);
    try {
      let appointmentId = nextAppointmentId(todaysAppointments.length);
      try {
        const response = await api.appointments.lockSlot({
          patientId: booking.patientId,
          doctor: booking.doctor,
          date: booking.date,
          time: slot,
          slot,
        });
        appointmentId = readEntityId(response);
        reloadSlots();
      } catch (err) {
        if (apiTodaysAppointments.length > 0 && !appointmentsError) throw err;
      }
      setLockedSlot(slot);
      setLockedAppointmentId(appointmentId);
      setLockedAt(Date.now());
      setLockedBooking({ ...booking });
      setLockRemaining(SLOT_LOCK_DURATION_MS);
      setMessage(`${slot} is locked temporarily. Confirm within 5 minutes.`);
    } catch (err) {
      setMessage(err?.message ?? "Unable to lock slot");
      toast.error(err?.message ?? "Unable to lock slot");
    } finally {
      setBusy(false);
    }
  };

  const confirmBooking = async () => {
    if (!booking.patientId) return setMessage("Select a patient before booking.");
    const dateError = validateTodayOrFutureDate(booking.date, "Appointment date");
    if (dateError) return setMessage(dateError);
    if (!lockedSlot) return setMessage("Select an available slot before confirming.");
    const patient = patients.find((item) => item.id === booking.patientId);
    if (!patient)
      return setMessage("Selected patient was not found. Please register the patient first.");
    const doubleBooked = todaysAppointments.some(
      (item) =>
        item.doctor === booking.doctor && item.date === booking.date && item.time === lockedSlot,
    );
    if (doubleBooked) {
      setLockedSlot("");
      setLockedAt(null);
      return setMessage("Double booking prevented. Please choose another slot.");
    }
    const appointmentPayload = {
      patientId: patient.id,
      patientName: patient.name,
      doctor: booking.doctor,
      date: booking.date,
      time: lockedSlot,
      slot: lockedSlot,
      status: "Waiting",
    };
    setBusy(true);
    try {
      let appointment = normalizeAppointment({
          ...appointmentPayload,
          id: lockedAppointmentId || nextAppointmentId(todaysAppointments.length),
          patient: patient.name,
      });
      try {
        const response = lockedAppointmentId
          ? await api.appointments.confirm(lockedAppointmentId, appointmentPayload)
          : await api.appointments.create(appointmentPayload);
        appointment = normalizeAppointment(getPayload(response) ?? appointment);
        await reloadAppointments();
      } catch (err) {
        if (apiTodaysAppointments.length > 0 && !appointmentsError) throw err;
      }
      receptionStore.setReceptionState((current) => ({
        ...current,
        appointments: [
          ...current.appointments.filter((item) => item.id !== appointment.id),
          appointment,
        ],
      }));
      setLockedSlot("");
      setLockedAppointmentId("");
      setLockedAt(null);
      setLockedBooking(null);
      setLockRemaining(0);
      toast.success("Appointment booked. Patient added to waiting queue.");
      navigate({ to: "/reception/billing", search: { appointmentId: appointment.id } });
    } catch (err) {
      setMessage(err?.message ?? "Unable to confirm appointment");
      toast.error(err?.message ?? "Unable to confirm appointment");
    } finally {
      setBusy(false);
    }
  };

  const updateStatus = async (id, status) => {
    setBusy(true);
    try {
      try {
        if (status === "Consulted") await api.appointments.complete(id);
        if (status === "No-show") await api.appointments.noShow(id);
        reloadAppointments();
      } catch (err) {
        if (apiTodaysAppointments.length > 0 && !appointmentsError) throw err;
      }
      receptionStore.setReceptionState((current) => ({
        ...current,
        appointments: current.appointments.map((item) =>
          item.id === id ? { ...item, status } : item,
        ),
      }));
      toast.success("Appointment status updated");
    } catch (err) {
      setMessage(err?.message ?? "Unable to update appointment");
      toast.error(err?.message ?? "Unable to update appointment");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Appointment Booking"
        description="Select patient, doctor, date, lock a slot, and confirm booking."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/reception">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Dashboard
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/reception/patients">
                <UserPlus className="mr-1.5 h-4 w-4" />
                Add Patient
              </Link>
            </Button>
          </>
        }
      />
      {message && (
        <div className="mb-5 rounded-lg border border-primary/20 bg-primary-soft px-4 py-3 text-sm text-primary">
          {message}
        </div>
      )}
      {(patientsError || appointmentsError || slotsError) && (
        <div className="mb-5 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {patientsError || appointmentsError || slotsError}
        </div>
      )}
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-base font-semibold">Book Appointment</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <SelectField
              label="Patient"
              value={booking.patientId}
              onChange={(value) => updateBooking("patientId", value)}
              options={patients.map((patient) => ({
                label: `${patient.name} (${patient.id})`,
                value: patient.id,
              }))}
            />
            <SelectField
              label="Doctor"
              value={booking.doctor}
              onChange={(value) => updateBooking("doctor", value)}
              options={doctors.map((doctor) => ({ label: doctor, value: doctor }))}
            />
            <Field
              label="Date"
              type="date"
              value={booking.date}
              onChange={(value) => updateBooking("date", value)}
            />
          </div>
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium">Time Slots</label>
              <div className="flex gap-2 text-xs text-muted-foreground">
                <span>Available</span>
                <span>Locked</span>
                <span>Booked</span>
              </div>
            </div>
            {lockedSlot && (
              <div className="mb-3 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning-foreground">
                Slot {lockedSlot} is LOCKED for {formatRemaining(lockRemaining)}. Confirm to make it
                BOOKED, or wait for timeout to return it to AVAILABLE.
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {slotOptions.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  disabled={busy || slotState[slot] === "Booked"}
                  onClick={() => lockSlot(slot)}
                  className={cn(
                    "h-11 rounded-lg border text-sm font-medium transition-colors",
                    slotState[slot] === "Available" &&
                      "border-success/25 bg-success/10 text-success hover:bg-success/15",
                    slotState[slot] === "Locked" &&
                      "border-warning/30 bg-warning/20 text-warning-foreground",
                    slotState[slot] === "Booked" && "border-border bg-muted text-muted-foreground",
                  )}
                >
                  {slot} - {slotState[slot].toUpperCase()}
                </button>
              ))}
            </div>
            {slotOptions.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {slotsLoading ? "Loading slots..." : "No slots available."}
              </div>
            )}
          </div>
          <Button
            onClick={confirmBooking}
            disabled={busy || patientsLoading || appointmentsLoading}
            className="mt-5 w-full gap-1.5 bg-primary text-primary-foreground"
          >
            <CheckCircle2 className="h-4 w-4" />
            Confirm Booking
          </Button>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-base font-semibold">Front Desk Queue</h2>
          <div className="mt-4 space-y-3">
            {todaysAppointments.map((item) => (
              <div key={item.id} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{item.patient}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.doctor} - {item.time}
                    </div>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => updateStatus(item.id, "Consulted")}
                    className="rounded-md bg-info/10 px-2 py-1 text-xs font-medium text-info"
                  >
                    Doctor Consultation Done
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      navigate({ to: "/reception/billing", search: { appointmentId: item.id } })
                    }
                    className="rounded-md bg-primary-soft px-2 py-1 text-xs font-medium text-primary"
                  >
                    <ReceiptText className="mr-1 inline h-3 w-3" />
                    Bill
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => updateStatus(item.id, "No-show")}
                    className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground"
                  >
                    No-show
                  </button>
                </div>
              </div>
            ))}
            {todaysAppointments.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {appointmentsLoading
                  ? "Loading appointments..."
                  : "No appointments scheduled today."}
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function readEntityId(response) {
  const payload = getPayload(response) ?? {};
  return String(
    payload.id ??
      payload._id ??
      payload.appointmentId ??
      payload.appointment_id ??
      payload.lockId ??
      payload.lock_id ??
      "",
  );
}

function normalizeSlot(item) {
  if (typeof item === "string") return { time: item, status: "Available" };
  const status = String(item.status ?? item.state ?? "Available").toLowerCase();
  return {
    time: String(item.time ?? item.slot ?? item.value ?? ""),
    status:
      status.includes("book") || status.includes("unavailable")
        ? "Booked"
        : status.includes("lock")
          ? "Locked"
          : "Available",
  };
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-lg border border-input bg-card px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
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
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function formatRemaining(milliseconds) {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
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
