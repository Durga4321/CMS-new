import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  Clock3,
  FileText,
  IndianRupee,
  Phone,
  Plus,
  ReceiptText,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";
import {
  cleanEmail,
  digitsOnly,
  EMAIL_INPUT_PATTERN,
  firstError,
  lettersOnly,
  validateEmail,
  validateName,
  validateNumber,
  validatePhone,
} from "@/lib/form-validation";

export const Route = createFileRoute("/_app/reception")({
  component: ReceptionPage,
  head: () => ({ meta: [{ title: "Reception Dashboard - Medisuite" }] }),
});

const doctors = ["Dr. Meera Iyer", "Dr. Arjun Rao", "Dr. Kavya Menon"];
const initialPatients = [
  {
    id: "P-1001",
    name: "Aarav Sharma",
    age: "34",
    gender: "Male",
    phone: "9876543210",
    email: "aarav@example.com",
    address: "Banjara Hills",
    history: "Hypertension",
  },
  {
    id: "P-1002",
    name: "Neha Reddy",
    age: "28",
    gender: "Female",
    phone: "9876500011",
    email: "neha@example.com",
    address: "Madhapur",
    history: "Allergy to penicillin",
  },
];
const initialAppointments = [
  {
    id: "A-2101",
    patientId: "P-1001",
    patient: "Aarav Sharma",
    doctor: "Dr. Meera Iyer",
    date: today(),
    time: "10:00",
    status: "Waiting",
  },
  {
    id: "A-2102",
    patientId: "P-1002",
    patient: "Neha Reddy",
    doctor: "Dr. Arjun Rao",
    date: today(),
    time: "11:00",
    status: "Completed",
  },
];
const slots = ["09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "14:00", "14:30"];

function ReceptionPage() {
  const search = useSearch({ strict: false });
  const [activePanel, setActivePanel] = useState("patient");
  const [patients, setPatients] = useState(initialPatients);
  const [appointments, setAppointments] = useState(initialAppointments);
  const [lockedSlot, setLockedSlot] = useState(null);
  const [message, setMessage] = useState("");
  const [patientForm, setPatientForm] = useState({
    name: "",
    age: "",
    dob: "",
    gender: "Female",
    phone: "",
    address: "",
    email: "",
    history: "",
  });
  const [booking, setBooking] = useState({
    patientId: initialPatients[0].id,
    doctor: doctors[0],
    date: today(),
  });
  const [bill, setBill] = useState({
    appointmentId: initialAppointments[1].id,
    consultation: "600",
    medicines: "0",
    lab: "0",
    mode: "UPI",
    status: "Pending",
  });

  const todaysAppointments = appointments.filter((item) => item.date === today());
  const waitingPatients = todaysAppointments.filter((item) => item.status === "Waiting");
  const completedAppointments = todaysAppointments.filter((item) => item.status === "Completed");
  const selectedAppointment = appointments.find((item) => item.id === bill.appointmentId);
  const totalBill = Number(bill.consultation || 0) + Number(bill.medicines || 0) + Number(bill.lab || 0);

  useEffect(() => {
    if (["patient", "appointment", "billing"].includes(search.panel)) {
      setActivePanel(search.panel);
    }
  }, [search.panel]);

  const slotState = useMemo(() => {
    return slots.reduce((acc, slot) => {
      const booked = appointments.some(
        (item) => item.doctor === booking.doctor && item.date === booking.date && item.time === slot,
      );
      acc[slot] = booked ? "Booked" : lockedSlot === slot ? "Locked" : "Available";
      return acc;
    }, {});
  }, [appointments, booking, lockedSlot]);

  const addPatient = (event) => {
    event.preventDefault();
    const normalizedPatient = {
      ...patientForm,
      name: patientForm.name.trim(),
      phone: digitsOnly(patientForm.phone),
      email: cleanEmail(patientForm.email),
      age: digitsOnly(patientForm.age, 3),
    };
    const validationError = firstError([
      validateName(normalizedPatient.name, "Patient name"),
      normalizedPatient.age ? validateNumber(normalizedPatient.age, "Age") : "",
      validatePhone(normalizedPatient.phone),
      normalizedPatient.email ? validateEmail(normalizedPatient.email) : "",
    ]);
    if (validationError) return setMessage(validationError);
    const duplicate = patients.some((item) => item.phone === normalizedPatient.phone && item.phone);
    if (duplicate) return setMessage("Duplicate patient found with the same phone number.");
    const nextPatient = {
      id: `P-${1000 + patients.length + 1}`,
      ...normalizedPatient,
      age: normalizedPatient.age || normalizedPatient.dob || "Not set",
    };
    setPatients((current) => [nextPatient, ...current]);
    setBooking((current) => ({ ...current, patientId: nextPatient.id }));
    setPatientForm({
      name: "",
      age: "",
      dob: "",
      gender: "Female",
      phone: "",
      address: "",
      email: "",
      history: "",
    });
    setActivePanel("appointment");
    setMessage("Patient saved successfully. Continue with appointment booking.");
  };

  const lockSlot = (slot) => {
    if (slotState[slot] === "Booked") return setMessage("This slot is already booked.");
    setLockedSlot(slot);
    setMessage(`${slot} is locked temporarily. Confirm within 5 minutes.`);
  };

  const confirmBooking = () => {
    if (!lockedSlot) return setMessage("Select an available slot before confirming.");
    const patient = patients.find((item) => item.id === booking.patientId);
    const doubleBooked = appointments.some(
      (item) =>
        item.doctor === booking.doctor && item.date === booking.date && item.time === lockedSlot,
    );
    if (doubleBooked) {
      setLockedSlot(null);
      return setMessage("Double booking prevented. Please choose another slot.");
    }
    const nextAppointment = {
      id: `A-${2100 + appointments.length + 1}`,
      patientId: patient.id,
      patient: patient.name,
      doctor: booking.doctor,
      date: booking.date,
      time: lockedSlot,
      status: "Waiting",
    };
    setAppointments((current) => [nextAppointment, ...current]);
    setBill((current) => ({ ...current, appointmentId: nextAppointment.id }));
    setLockedSlot(null);
    setActivePanel("billing");
    setMessage("Appointment booked. Patient added to waiting queue.");
  };

  const generateBill = (event) => {
    event.preventDefault();
    if (!selectedAppointment) return setMessage("Select an appointment to generate bill.");
    const validationError = firstError([
      validateNumber(bill.consultation, "Consultation charge"),
      validateNumber(bill.medicines, "Medicine charges"),
      validateNumber(bill.lab, "Lab charges"),
    ]);
    if (validationError) return setMessage(validationError);
    setAppointments((current) =>
      current.map((item) =>
        item.id === selectedAppointment.id ? { ...item, status: "Completed" } : item,
      ),
    );
    setBill((current) => ({ ...current, status: "Paid" }));
    setMessage(`Invoice generated for ${selectedAppointment.patient}. Payment received via ${bill.mode}.`);
  };

  return (
    <>
      <PageHeader
        title="Reception Command Center"
        description="Register patients, manage appointments, control the waiting queue, and close billing."
        actions={
          <>
            <Button variant="outline" className="gap-1.5" onClick={() => setActivePanel("appointment")}>
              <CalendarPlus className="h-4 w-4" />
              Book
            </Button>
            <Button className="gap-1.5 bg-primary text-primary-foreground" onClick={() => setActivePanel("patient")}>
              <UserPlus className="h-4 w-4" />
              Add Patient
            </Button>
          </>
        }
      />

      {message && (
        <div className="mb-5 rounded-lg border border-primary/20 bg-primary-soft px-4 py-3 text-sm text-primary">
          {message}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={CalendarClock} label="Today's Appointments" value={todaysAppointments.length} />
        <MetricCard icon={Clock3} label="Waiting Patients" value={waitingPatients.length} tone="warning" />
        <MetricCard icon={CheckCircle2} label="Completed Appointments" value={completedAppointments.length} tone="success" />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Quick Actions</h2>
                <p className="text-xs text-muted-foreground">Follow the front desk flow from arrival to payment.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  ["patient", "Add Patient", UserPlus],
                  ["appointment", "Book Appointment", CalendarPlus],
                  ["billing", "Create Bill", ReceiptText],
                ].map(([key, label, Icon]) => (
                  <button
                    key={key}
                    onClick={() => setActivePanel(key)}
                    className={cn(
                      "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors",
                      activePanel === key
                        ? "bg-primary text-primary-foreground shadow-elev"
                        : "bg-secondary text-secondary-foreground hover:bg-accent",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {activePanel === "patient" && (
              <form onSubmit={addPatient} className="grid gap-4 md:grid-cols-2">
                <Field label="Name" value={patientForm.name} onChange={(value) => setPatientForm({ ...patientForm, name: lettersOnly(value) })} />
                <Field label="Age" value={patientForm.age} onChange={(value) => setPatientForm({ ...patientForm, age: digitsOnly(value, 3) })} placeholder="Age" inputMode="numeric" maxLength={3} />
                <SelectField label="Gender" value={patientForm.gender} onChange={(value) => setPatientForm({ ...patientForm, gender: value })} options={["Female", "Male", "Other"]} />
                <Field label="Phone" value={patientForm.phone} onChange={(value) => setPatientForm({ ...patientForm, phone: digitsOnly(value) })} type="tel" inputMode="numeric" maxLength={10} />
                <Field label="Email" value={patientForm.email} onChange={(value) => setPatientForm({ ...patientForm, email: cleanEmail(value) })} type="email" pattern={EMAIL_INPUT_PATTERN} title="Use a professional email such as name@clinicname.com" />
                <Field label="Address" value={patientForm.address} onChange={(value) => setPatientForm({ ...patientForm, address: value })} />
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium">Medical History</label>
                  <textarea
                    value={patientForm.history}
                    onChange={(event) => setPatientForm({ ...patientForm, history: event.target.value })}
                    className="min-h-24 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                    placeholder="Allergies, chronic conditions, current medication"
                  />
                </div>
                <Button className="gap-1.5 bg-primary text-primary-foreground md:col-span-2">
                  <Plus className="h-4 w-4" />
                  Save Patient and Book Appointment
                </Button>
              </form>
            )}

            {activePanel === "appointment" && (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <SelectField
                    label="Patient"
                    value={booking.patientId}
                    onChange={(value) => setBooking({ ...booking, patientId: value })}
                    options={patients.map((patient) => ({ label: patient.name, value: patient.id }))}
                  />
                  <SelectField
                    label="Doctor"
                    value={booking.doctor}
                    onChange={(value) => setBooking({ ...booking, doctor: value })}
                    options={doctors}
                  />
                  <Field
                    label="Date"
                    type="date"
                    value={booking.date}
                    onChange={(value) => setBooking({ ...booking, date: value })}
                  />
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-medium">Time Slots</label>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>Available</span>
                      <span>Locked</span>
                      <span>Booked</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {slots.map((slot) => (
                      <button
                        key={slot}
                        onClick={() => lockSlot(slot)}
                        className={cn(
                          "h-11 rounded-lg border text-sm font-medium transition-colors",
                          slotState[slot] === "Available" && "border-success/25 bg-success/10 text-success hover:bg-success/15",
                          slotState[slot] === "Locked" && "border-warning/30 bg-warning/20 text-warning-foreground",
                          slotState[slot] === "Booked" && "border-border bg-muted text-muted-foreground",
                        )}
                      >
                        {slot} · {slotState[slot]}
                      </button>
                    ))}
                  </div>
                </div>
                <Button onClick={confirmBooking} className="w-full gap-1.5 bg-primary text-primary-foreground">
                  <CheckCircle2 className="h-4 w-4" />
                  Confirm Booking
                </Button>
              </div>
            )}

            {activePanel === "billing" && (
              <form onSubmit={generateBill} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <SelectField
                    label="Appointment"
                    value={bill.appointmentId}
                    onChange={(value) => setBill({ ...bill, appointmentId: value })}
                    options={appointments.map((item) => ({
                      label: `${item.patient} - ${item.time} - ${item.status}`,
                      value: item.id,
                    }))}
                  />
                  <SelectField label="Payment Mode" value={bill.mode} onChange={(value) => setBill({ ...bill, mode: value })} options={["Cash", "Card", "UPI"]} />
                  <Field label="Consultation Charge" value={bill.consultation} onChange={(value) => setBill({ ...bill, consultation: digitsOnly(value, 7) })} inputMode="numeric" maxLength={7} />
                  <Field label="Medicine Charges" value={bill.medicines} onChange={(value) => setBill({ ...bill, medicines: digitsOnly(value, 7) })} inputMode="numeric" maxLength={7} />
                  <Field label="Lab Charges" value={bill.lab} onChange={(value) => setBill({ ...bill, lab: digitsOnly(value, 7) })} inputMode="numeric" maxLength={7} />
                  <div className="rounded-lg border border-border bg-secondary p-4">
                    <div className="text-xs text-muted-foreground">Total</div>
                    <div className="mt-1 flex items-center gap-1 text-2xl font-semibold">
                      <IndianRupee className="h-5 w-5" />
                      {totalBill}
                    </div>
                  </div>
                </div>
                <Button className="w-full gap-1.5 bg-primary text-primary-foreground">
                  <ReceiptText className="h-4 w-4" />
                  Confirm Payment and Generate Invoice
                </Button>
              </form>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">Appointment List</h2>
              <span className="text-xs text-muted-foreground">{today()}</span>
            </div>
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-secondary text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Patient</th>
                    <th className="px-4 py-3 font-medium">Doctor</th>
                    <th className="px-4 py-3 font-medium">Time</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {todaysAppointments.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-medium">{item.patient}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.doctor}</td>
                      <td className="px-4 py-3">{item.time}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={item.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="text-base font-semibold">Waiting Queue</h2>
            <div className="mt-4 space-y-3">
              {waitingPatients.map((item, index) => (
                <div key={item.id} className="flex items-center gap-3 rounded-lg bg-secondary p-3">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{item.patient}</div>
                    <div className="text-xs text-muted-foreground">{item.doctor} · {item.time}</div>
                  </div>
                  <Clock3 className="h-4 w-4 text-warning-foreground" />
                </div>
              ))}
              {waitingPatients.length === 0 && (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No patients waiting.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="text-base font-semibold">Latest Invoice</h2>
            <div className="mt-4 rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{selectedAppointment?.patient ?? "No appointment selected"}</div>
                  <div className="text-xs text-muted-foreground">{selectedAppointment?.doctor ?? "Select appointment"}</div>
                </div>
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={bill.status} />
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-semibold">₹{totalBill}</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function MetricCard({ icon: Icon, label, value, tone = "primary" }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div className={cn("grid h-10 w-10 place-items-center rounded-lg", tone === "primary" && "bg-primary-soft text-primary", tone === "warning" && "bg-warning/15 text-warning-foreground", tone === "success" && "bg-success/10 text-success")}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-xs text-muted-foreground">Today</span>
      </div>
      <div className="mt-4 text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder = "", ...inputProps }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
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
        {options.map((option) => {
          const item = typeof option === "string" ? { label: option, value: option } : option;
          return (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          );
        })}
      </select>
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
        status === "Waiting" && "bg-warning/20 text-warning-foreground",
        status === "Completed" && "bg-success/10 text-success",
        status === "Paid" && "bg-success/10 text-success",
        status === "Pending" && "bg-muted text-muted-foreground",
      )}
    >
      {status}
    </span>
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
