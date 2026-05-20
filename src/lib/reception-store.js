import { useCallback, useEffect, useMemo, useState } from "react";

const STORE_KEY = "clinic_reception_flow_data";

const today = () => new Date().toISOString().slice(0, 10);

const initialState = {
  patients: [
    {
      id: "PID-1001",
      name: "Aarav Sharma",
      age: "34",
      dob: "1990-08-12",
      gender: "Male",
      type: "OPD",
      phone: "9876543210",
      email: "aarav@example.com",
      street: "Road 12",
      city: "Hyderabad",
      state: "Telangana",
      pinCode: "500034",
      emergencyName: "Riya Sharma",
      emergencyPhone: "9876543211",
      drugAllergies: "Penicillin",
      foodAllergies: "",
      environmentalAllergies: "Pollen",
      chronicDiseases: ["Hypertension"],
      otherChronic: "",
      medicationName: "Amlodipine",
      medicationDosage: "5mg",
      medicationFrequency: "Once daily",
      surgeryName: "Appendectomy",
      surgeryYear: "2010",
      previousVisitDate: "2026-05-01",
      previousDoctor: "Dr. Meera Iyer",
      previousComplaint: "Headache",
      previousDiagnosis: "High BP",
      previousTreatment: "Medication adjusted",
    },
    {
      id: "PID-1002",
      name: "Neha Reddy",
      age: "28",
      dob: "1998-03-20",
      gender: "Female",
      type: "OPD",
      phone: "9876500011",
      email: "neha@example.com",
      street: "Madhapur Main Road",
      city: "Hyderabad",
      state: "Telangana",
      pinCode: "500081",
      emergencyName: "Vikram Reddy",
      emergencyPhone: "9876500012",
      drugAllergies: "",
      foodAllergies: "Peanuts",
      environmentalAllergies: "",
      chronicDiseases: ["Asthma"],
      otherChronic: "",
      medicationName: "Inhaler",
      medicationDosage: "100mcg",
      medicationFrequency: "As needed",
      surgeryName: "",
      surgeryYear: "",
      previousVisitDate: "",
      previousDoctor: "",
      previousComplaint: "",
      previousDiagnosis: "",
      previousTreatment: "",
    },
  ],
  appointments: [
    {
      id: "APT-2101",
      patientId: "PID-1001",
      patient: "Aarav Sharma",
      doctor: "Dr. Meera Iyer",
      date: today(),
      time: "10:00",
      status: "Waiting",
    },
    {
      id: "APT-2102",
      patientId: "PID-1002",
      patient: "Neha Reddy",
      doctor: "Dr. Arjun Rao",
      date: today(),
      time: "11:00",
      status: "Consulted",
    },
  ],
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
    return JSON.parse(window.localStorage.getItem(STORE_KEY) ?? "") || initialState;
  } catch {
    return initialState;
  }
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
