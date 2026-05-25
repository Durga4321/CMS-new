import { useCallback, useEffect, useMemo, useState } from "react";

const STORE_KEY = "clinic_reception_flow_data";

const today = () => new Date().toISOString().slice(0, 10);

const initialState = {
  patients: [],
  appointments: [],
  bills: [],
};

export const doctors = ["Dr. Meera Iyer", "Dr. Arjun Rao", "Dr. Kavya Menon"];
export const slots = ["09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "14:00", "14:30"];
export const chronicOptions = ["Hypertension", "Diabetes", "Asthma", "Thyroid", "Heart Disease"];

export const emptyPatient = {
  id: "",
  name: "",
  age: "",
  dob: "",
  gender: "Female",
  type: "OPD",
  phone: "",
  email: "",
  street: "",
  city: "",
  state: "",
  pinCode: "",
  emergencyName: "",
  emergencyPhone: "",
  drugAllergies: "",
  foodAllergies: "",
  environmentalAllergies: "",
  chronicDiseases: [],
  otherChronic: "",
  medicationName: "",
  medicationDosage: "",
  medicationFrequency: "",
  surgeryName: "",
  surgeryYear: "",
  previousVisitDate: "",
  previousDoctor: "",
  previousComplaint: "",
  previousDiagnosis: "",
  previousTreatment: "",
};

function readState() {
  if (typeof window === "undefined") return initialState;
  try {
    return sanitizeState(JSON.parse(window.localStorage.getItem(STORE_KEY) ?? "") || initialState);
  } catch {
    return initialState;
  }
}

function sanitizeState(state) {
  const legacyPatientIds = new Set(["PID-1001", "PID-1002"]);
  const patients = Array.isArray(state?.patients)
    ? state.patients.filter((patient) => !legacyPatientIds.has(patient?.id))
    : [];
  const appointments = Array.isArray(state?.appointments)
    ? state.appointments.filter((appointment) => !legacyPatientIds.has(appointment?.patientId))
    : [];
  const bills = Array.isArray(state?.bills) ? state.bills : [];

  return { ...initialState, ...state, patients, appointments, bills };
}

function writeState(nextState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORE_KEY, JSON.stringify(nextState));
}

export function useReceptionStore() {
  const [state, setState] = useState(readState);

  useEffect(() => {
    writeState(state);
  }, [state]);

  const update = useCallback((recipe) => {
    setState((current) => {
      const next = recipe(current);
      writeState(next);
      return next;
    });
  }, []);

  const todaysAppointments = useMemo(
    () => state.appointments.filter((item) => item.date === today()),
    [state.appointments],
  );
  const waitingPatients = useMemo(
    () => todaysAppointments.filter((item) => item.status === "Waiting"),
    [todaysAppointments],
  );
  const completedAppointments = useMemo(
    () => todaysAppointments.filter((item) => ["Consulted", "Paid"].includes(item.status)),
    [todaysAppointments],
  );

  return {
    ...state,
    setReceptionState: update,
    todaysAppointments,
    waitingPatients,
    completedAppointments,
  };
}

export function nextPatientId(count) {
  return `PID-${1000 + count + 1}`;
}

export function nextAppointmentId(count) {
  return `APT-${2100 + count + 1}`;
}

export function nextBillId(count) {
  return `INV-${3000 + count + 1}`;
}

export { today };
