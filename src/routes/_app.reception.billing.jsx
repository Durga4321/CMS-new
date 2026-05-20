import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileText, IndianRupee, ReceiptText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { useApiResource } from "@/hooks/use-api-resource";
import { api, getPayload, toArray } from "@/lib/api";
import { normalizeAppointment, normalizeBill, normalizePatient } from "@/lib/api-normalizers";
import { digitsOnly, firstError, validateNumber } from "@/lib/form-validation";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/reception/billing")({
  component: BillingPage,
  head: () => ({ meta: [{ title: "Billing - Medisuite" }] }),
});

function BillingPage() {
  const search = useSearch({ strict: false });
  const { data: patients, error: patientsError } = useApiResource(
    async () => toArray(await api.patients.list()).map(normalizePatient),
    [],
  );
  const {
    data: appointments,
    loading: appointmentsLoading,
    error: appointmentsError,
    reload: reloadAppointments,
  } = useApiResource(
    async () => toArray(await api.appointments.list()).map(normalizeAppointment),
    [],
  );
  const {
    data: bills,
    loading: billsLoading,
    error: billsError,
    reload: reloadBills,
  } = useApiResource(async () => toArray(await api.billing.list()).map(normalizeBill), []);
  const billableAppointments = appointments.filter((item) =>
    ["Waiting", "Consulted", "Completed"].includes(item.status),
  );
  const [form, setForm] = useState({
    appointmentId: search.appointmentId || billableAppointments[0]?.id || "",
    consultation: "600",
    medicines: "0",
    lab: "0",
    mode: "UPI",
    status: "Pending",
  });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [appointmentBill, setAppointmentBill] = useState(null);

  useEffect(() => {
    if (search.appointmentId)
      setForm((current) => ({ ...current, appointmentId: search.appointmentId }));
  }, [search.appointmentId]);

  useEffect(() => {
    if (!form.appointmentId && billableAppointments[0]?.id) {
      setForm((current) => ({ ...current, appointmentId: billableAppointments[0].id }));
    }
  }, [billableAppointments, form.appointmentId]);

  useEffect(() => {
    let mounted = true;
    setAppointmentBill(null);
    if (!form.appointmentId) return undefined;
    api.billing
      .byAppointment(form.appointmentId)
      .then((response) => {
        const payload = getPayload(response) ?? response;
        const bill = Array.isArray(payload) ? payload[0] : payload;
        if (mounted && bill) setAppointmentBill(normalizeBill(bill));
      })
      .catch((err) => {
        if (mounted && err?.status !== 404) setMessage(err?.message ?? "Unable to load bill");
      });
    return () => {
      mounted = false;
    };
  }, [form.appointmentId]);

  const appointment = appointments.find((item) => item.id === form.appointmentId);
  const patient = patients.find((item) => item.id === appointment?.patientId);
  const total = useMemo(
    () => Number(form.consultation || 0) + Number(form.medicines || 0) + Number(form.lab || 0),
    [form.consultation, form.lab, form.medicines],
  );

  const submit = async (event) => {
    event.preventDefault();
    if (!appointment) {
      setMessage("Select an appointment to generate bill.");
      return;
    }
    const error = firstError([
      validateNumber(form.consultation, "Consultation charge"),
      validateNumber(form.medicines, "Medicine charges"),
      validateNumber(form.lab, "Lab charges"),
      Number(form.consultation) > 0 ? "" : "Consultation charge must be greater than 0",
    ]);
    if (error) {
      setMessage(error);
      return;
    }
    if (appointmentBill || bills.some((item) => item.appointmentId === appointment.id)) {
      setMessage("A bill has already been generated for this appointment.");
      return;
    }
    const bill = {
      appointmentId: appointment.id,
      patientId: appointment.patientId,
      patientName: appointment.patient,
      consultation: Number(form.consultation),
      medicines: Number(form.medicines),
      lab: Number(form.lab),
      total,
      mode: form.mode,
      paymentMode: form.mode,
      status: "Paid",
      paymentStatus: "Paid",
      createdAt: new Date().toISOString(),
    };
    setSaving(true);
    try {
      const response = await api.billing.create(bill);
      setAppointmentBill(normalizeBill(getPayload(response) ?? bill));
      setForm((current) => ({ ...current, status: "Paid" }));
      toast.success("Payment done. Invoice generated.");
      reloadBills();
      reloadAppointments();
    } catch (err) {
      setMessage(err?.message ?? "Unable to generate bill");
      toast.error(err?.message ?? "Unable to generate bill");
    } finally {
      setSaving(false);
    }
  };

  const latestBill = appointmentBill ?? bills[0];

  return (
    <>
      <PageHeader
        title="Billing"
        description="Fetch appointment, add charges, confirm payment, and generate invoice."
        actions={
          <Button variant="outline" asChild>
            <Link to="/reception">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Dashboard
            </Link>
          </Button>
        }
      />
      {message && (
        <div className="mb-5 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {message}
        </div>
      )}
      {(patientsError || appointmentsError || billsError) && (
        <div className="mb-5 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {patientsError || appointmentsError || billsError}
        </div>
      )}
      <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-base font-semibold">Generate Bill</h2>
          <form onSubmit={submit} className="mt-4 space-y-4">
            <div className="rounded-lg border border-border bg-secondary/40 p-4">
              <div className="text-sm font-semibold">{patient?.name ?? "Select appointment"}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {patient?.id ?? "-"} | {patient?.phone ?? "No mobile"} |{" "}
                {appointment?.doctor ?? "No doctor selected"}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField
                label="Appointment"
                value={form.appointmentId}
                onChange={(value) => setForm({ ...form, appointmentId: value })}
                options={billableAppointments.map((item) => ({
                  label: `${item.patient} - ${item.time} - ${item.status}`,
                  value: item.id,
                }))}
              />
              <SelectField
                label="Payment Mode"
                value={form.mode}
                onChange={(value) => setForm({ ...form, mode: value })}
                options={["Cash", "Card", "UPI"].map((item) => ({ label: item, value: item }))}
              />
              <Field
                label="Consultation Charge"
                value={form.consultation}
                onChange={(value) => setForm({ ...form, consultation: digitsOnly(value, 7) })}
              />
              <Field
                label="Medicine Charges"
                value={form.medicines}
                onChange={(value) => setForm({ ...form, medicines: digitsOnly(value, 7) })}
              />
              <Field
                label="Lab Charges"
                value={form.lab}
                onChange={(value) => setForm({ ...form, lab: digitsOnly(value, 7) })}
              />
              <div className="rounded-lg border border-border bg-secondary p-4">
                <div className="text-xs text-muted-foreground">Total</div>
                <div className="mt-1 flex items-center gap-1 text-2xl font-semibold">
                  <IndianRupee className="h-5 w-5" />
                  {total}
                </div>
              </div>
            </div>
            <Button
              disabled={saving || appointmentsLoading || billsLoading || Boolean(appointmentBill)}
              className="w-full gap-1.5 bg-primary text-primary-foreground"
            >
              <ReceiptText className="h-4 w-4" />
              {saving ? "Generating invoice..." : "Confirm Payment and Generate Invoice"}
            </Button>
          </form>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-base font-semibold">Latest Invoice</h2>
          <div className="mt-4 rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">
                  {latestBill?.patient ?? appointment?.patient ?? "No invoice generated"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {latestBill?.id ?? "Pending invoice"}
                </div>
              </div>
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <StatusBadge status={latestBill?.status ?? form.status} />
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold">Rs {latestBill?.total ?? total}</span>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode="numeric"
        maxLength={7}
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

function StatusBadge({ status }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
        status === "Paid" && "bg-success/10 text-success",
        status === "Pending" && "bg-muted text-muted-foreground",
      )}
    >
      {status}
    </span>
  );
}
