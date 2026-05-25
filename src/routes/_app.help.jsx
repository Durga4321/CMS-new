import { createFileRoute } from "@tanstack/react-router";
import {
  BookOpen,
  Building2,
  CalendarPlus,
  ClipboardList,
  Pill,
  ReceiptText,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { getAuthUser } from "@/lib/api";

export const Route = createFileRoute("/_app/help")({
  component: HelpPage,
  head: () => ({ meta: [{ title: "Help Docs - Medisuite" }] }),
});

const docsByRole = {
  admin: {
    title: "Admin Guide",
    description: "Quick reference for doctor, staff, schedule, patient, appointment and report workflows.",
    docs: [
      {
        icon: Stethoscope,
        title: "Doctor Management",
        body: "Add doctors, edit profile details, delete inactive records and configure doctor schedules for appointment slots.",
      },
      {
        icon: Users,
        title: "Staff and Patients",
        body: "Create staff accounts, disable access, review patient details, visit history and prescriptions.",
      },
      {
        icon: CalendarPlus,
        title: "Appointments and Reports",
        body: "Monitor appointments by date or doctor, then open reports for daily appointments, revenue and doctor-wise performance.",
      },
    ],
  },
  doctor: {
    title: "Doctor Guide",
    description: "Quick reference for consultation, patient history and prescription workflows.",
    docs: [
      {
        icon: ClipboardList,
        title: "Today's Patients",
        body: "Open the doctor dashboard to view total appointments, pending consultations, completed consultations and patient status.",
      },
      {
        icon: Users,
        title: "Patient History",
        body: "Select a patient to review patient info, medical history, previous visits and past prescriptions before consulting.",
      },
      {
        icon: Pill,
        title: "Prescription and Completion",
        body: "Start consultation, enter diagnosis, medicines, dosage and notes, then save to complete the consultation and notify reception.",
      },
    ],
  },
  receptionist: {
    title: "Reception Guide",
    description: "Quick reference for front-desk patient, appointment and billing workflows.",
    docs: [
      {
        icon: ClipboardList,
        title: "Reception Dashboard",
        body: "Track today's front-desk work, waiting patients and appointment activity from the reception console.",
      },
      {
        icon: CalendarPlus,
        title: "Book Appointments",
        body: "Register or select a patient, choose doctor availability and confirm appointment slots.",
      },
      {
        icon: ReceiptText,
        title: "Billing",
        body: "Start billing after consultation completion, review charges and generate receipts.",
      },
    ],
  },
  superadmin: {
    title: "Super Admin Guide",
    description: "Quick reference for platform-level clinic and access workflows.",
    docs: [
      {
        icon: Building2,
        title: "Clinic Management",
        body: "Create clinics, update locations, export clinic data, and manage active or inactive status from the clinic actions menu.",
      },
      {
        icon: ShieldCheck,
        title: "Admin Management",
        body: "Invite admins, assign clinics and roles, update access status, and send welcome instructions when creating new accounts.",
      },
      {
        icon: Users,
        title: "User Management",
        body: "Review user status, last activity, profile details, and clinic assignments across the network.",
      },
    ],
  },
};

function HelpPage() {
  const rawRole = String(getAuthUser()?.role ?? "admin").toLowerCase();
  const role = rawRole.includes("doctor")
    ? "doctor"
    : rawRole.includes("reception")
      ? "receptionist"
      : rawRole.includes("super")
        ? "superadmin"
        : "admin";
  const content = docsByRole[role] ?? docsByRole.admin;

  return (
    <>
      <PageHeader
        title="Help Docs"
        description={content.description}
      />

      <section className="rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary-soft text-primary">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold">{content.title}</h2>
            <p className="text-sm text-muted-foreground">Updated 22/05/2026</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {content.docs.map((item) => (
            <article key={item.title} className="rounded-lg border border-border p-4">
              <item.icon className="h-5 w-5 text-primary" />
              <h3 className="mt-3 text-sm font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
