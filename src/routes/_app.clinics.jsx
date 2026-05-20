import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Plus,
  Search,
  Filter,
  FileDown,
  MoreVertical,
  Edit2,
  Trash2,
  Eye,
  Building2,
  MapPin,
  Phone,
  Mail,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, StatusBadge } from "@/components/layout/PageHeader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { api, toArray } from "@/lib/api";
import { useApiResource } from "@/hooks/use-api-resource";
import { normalizeClinic } from "@/lib/api-normalizers";
import {
  cleanEmail,
  digitsOnly,
  EMAIL_INPUT_PATTERN,
  firstError,
  lettersOnly,
  validateAddress,
  validateEmail,
  validateName,
  validatePhone,
} from "@/lib/form-validation";
import { toast } from "sonner";
export const Route = createFileRoute("/_app/clinics")({
  component: ClinicsPage,
  head: () => ({ meta: [{ title: "Clinics — Medisuite" }] }),
});
function ClinicsPage() {
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const {
    data: clinics,
    setData: setClinics,
    loading,
    error,
    reload,
  } = useApiResource(async () => toArray(await api.clinics.list()).map(normalizeClinic), [], []);
  const filtered = clinics.filter((c) => {
    const query = q.trim().toLowerCase();
    const haystack = [c.name, c.location, c.address, c.email, c.contact, c.admins]
      .join(" ")
      .toLowerCase();
    return (
      (statusFilter === "all" || c.status === statusFilter) && (!query || haystack.includes(query))
    );
  });
  const createClinic = async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const clinic = {
      name: String(form.get("name") ?? "").trim(),
      email: cleanEmail(form.get("email")),
      address: String(form.get("address") ?? "").trim(),
      contact: digitsOnly(form.get("contact")),
      isActive: Boolean(form.get("isActive")),
    };
    const validationError = firstError([
      validateName(clinic.name, "Clinic name"),
      validateEmail(clinic.email),
      validateAddress(clinic.address, "Location"),
      validatePhone(clinic.contact, "Contact number"),
    ]);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    try {
      await api.clinics.create(clinic);
      setOpen(false);
      toast.success("Clinic created successfully");
      reload();
    } catch (err) {
      toast.error(err?.message ?? "Unable to create clinic");
    }
  };
  const updateClinic = async (e) => {
    e.preventDefault();
    if (!editing) return;
    const form = new FormData(e.currentTarget);
    const clinic = {
      name: String(form.get("name") ?? "").trim(),
      email: cleanEmail(form.get("email")),
      address: String(form.get("address") ?? "").trim(),
      contact: digitsOnly(form.get("contact")),
      isActive: Boolean(form.get("isActive")),
    };
    const validationError = firstError([
      validateName(clinic.name, "Clinic name"),
      validateEmail(clinic.email),
      validateAddress(clinic.address, "Location"),
      validatePhone(clinic.contact, "Contact number"),
    ]);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    try {
      await api.clinics.update(editing.id, clinic);
      setEditing(null);
      toast.success("Clinic updated");
      reload();
    } catch (err) {
      toast.error(err?.message ?? "Unable to update clinic");
    }
  };
  const deleteClinic = async (id) => {
    if (!window.confirm("Delete this clinic? This action cannot be undone.")) return;
    try {
      await api.clinics.remove(id);
      toast.success("Clinic deleted");
      reload();
    } catch (err) {
      toast.error(err?.message ?? "Unable to delete clinic");
    }
  };
  const updateClinicStatus = async (clinic, active) => {
    const nextStatus = active ? "active" : "inactive";
    setClinics((current) =>
      current.map((item) => (item.id === clinic.id ? { ...item, status: nextStatus } : item)),
    );
    try {
      await api.clinics.update(clinic.id, { ...clinic, isActive: active, status: nextStatus });
      toast.success(`Clinic marked ${nextStatus}`);
      reload();
    } catch (err) {
      setClinics((current) =>
        current.map((item) => (item.id === clinic.id ? { ...item, status: clinic.status } : item)),
      );
      toast.error(err?.message ?? "Unable to update clinic status");
    }
  };
  return (
    <>
      <PageHeader
        title="Clinic Management"
        description="Manage all clinics across your healthcare network."
        actions={
          <>
            <Button variant="outline" className="gap-1.5">
              <FileDown className="h-4 w-4" />
              Export
            </Button>
            <Button onClick={() => setOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add Clinic
            </Button>
          </>
        }
      />

      <div className="rounded-xl border border-border bg-card shadow-card">
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name or location"
                className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>
            <div className="flex gap-1.5 rounded-lg border border-border bg-secondary p-1 text-xs">
              {["all", "active", "pending", "inactive"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-md px-3 py-1 font-medium capitalize transition-colors ${statusFilter === s ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>

        <div className="overflow-x-auto">
          {error && (
            <div className="border-b border-border p-4 text-sm text-destructive">{error}</div>
          )}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 font-medium">Clinic</th>
                <th className="px-5 py-3 font-medium">Location</th>
                <th className="px-5 py-3 font-medium">Contact</th>
                <th className="px-5 py-3 font-medium">Admins</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-border last:border-0 transition-colors hover:bg-secondary/40"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary-soft text-primary">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">{c.location}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{c.contact}</td>
                  <td className="px-5 py-3.5">
                    <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium">
                      {c.admins}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={c.status === "active"}
                        onCheckedChange={(active) => updateClinicStatus(c, active)}
                        aria-label={`Set ${c.name} status`}
                      />
                      <StatusBadge status={c.status} />
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="inline-grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewing(c)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditing(c)}>
                          <Edit2 className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteClinic(c.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    {loading ? "Loading clinics..." : "No clinics match your filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
          <div>
            Showing <span className="font-medium text-foreground">{filtered.length}</span> of{" "}
            {clinics.length} clinics
          </div>
          <div className="flex items-center gap-1">
            <button className="rounded-md border border-border px-2.5 py-1 hover:bg-accent">
              Previous
            </button>
            {[1, 2, 3].map((p) => (
              <button
                key={p}
                className={`h-7 w-7 rounded-md ${p === 1 ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
              >
                {p}
              </button>
            ))}
            <button className="rounded-md border border-border px-2.5 py-1 hover:bg-accent">
              Next
            </button>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add new clinic</DialogTitle>
            <p className="text-sm text-muted-foreground">Set up a new clinic in your network.</p>
          </DialogHeader>
          <form onSubmit={createClinic} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                name="name"
                label="Clinic name"
                icon={Building2}
                placeholder="Riverside Pediatrics"
                required
                inputMode="text"
                dataKind="name"
              />
              <Field
                name="email"
                label="Email"
                icon={Mail}
                type="email"
                placeholder="contact@clinic.com"
                required
                dataKind="email"
                pattern={EMAIL_INPUT_PATTERN}
                title="Use a professional email such as contact@clinicname.com"
              />
              <Field
                name="address"
                label="Location"
                icon={MapPin}
                placeholder="123 Main Street, Hyderabad"
                required
              />
              <Field
                name="contact"
                label="Contact number"
                icon={Phone}
                placeholder="9876543210"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                required
                dataKind="phone"
              />
            </div>
            <div className="rounded-lg border border-dashed border-border bg-secondary/40 p-5 text-center">
              <div className="mx-auto grid h-10 w-10 place-items-center rounded-lg bg-card text-muted-foreground">
                <Upload className="h-4 w-4" />
              </div>
              <div className="mt-2 text-sm font-medium">Upload clinic logo</div>
              <div className="text-xs text-muted-foreground">PNG, JPG up to 2MB</div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <div className="text-sm font-medium">Clinic active</div>
                <div className="text-xs text-muted-foreground">
                  Allow staff to log in immediately
                </div>
              </div>
              <Switch name="isActive" defaultChecked />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save clinic</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={(nextOpen) => !nextOpen && setViewing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Clinic details</DialogTitle>
            <p className="text-sm text-muted-foreground">View clinic profile and status.</p>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary-soft text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold">{viewing.name}</div>
                  <div className="text-xs text-muted-foreground">{viewing.id}</div>
                </div>
                <div className="ml-auto">
                  <StatusBadge status={viewing.status} />
                </div>
              </div>
              <div className="space-y-2 rounded-lg border border-border bg-secondary/40 p-4">
                <DetailRow label="Email" value={viewing.email} />
                <DetailRow label="Address" value={viewing.address} />
                <DetailRow label="Contact" value={viewing.contact} />
                <DetailRow label="Admins" value={viewing.admins} />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setViewing(null)}>
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setEditing(viewing);
                    setViewing(null);
                  }}
                >
                  Edit clinic
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(nextOpen) => !nextOpen && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit clinic</DialogTitle>
            <p className="text-sm text-muted-foreground">Update clinic information.</p>
          </DialogHeader>
          {editing && (
            <form onSubmit={updateClinic} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  name="name"
                  label="Clinic name"
                  icon={Building2}
                  defaultValue={editing.name}
                  required
                  dataKind="name"
                />
                <Field
                  name="email"
                  label="Email"
                  icon={Mail}
                  type="email"
                  defaultValue={editing.email}
                  required
                  dataKind="email"
                  pattern={EMAIL_INPUT_PATTERN}
                  title="Use a professional email such as contact@clinicname.com"
                />
                <Field
                  name="address"
                  label="Location"
                  icon={MapPin}
                  defaultValue={editing.address}
                  required
                />
                <Field
                  name="contact"
                  label="Contact number"
                  icon={Phone}
                  defaultValue={digitsOnly(editing.contact)}
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  required
                  dataKind="phone"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <div className="text-sm font-medium">Clinic active</div>
                  <div className="text-xs text-muted-foreground">
                    Allow staff to log in immediately
                  </div>
                </div>
                <Switch name="isActive" defaultChecked={editing.status === "active"} />
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button type="submit">Save changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
function DetailRow({ label, value }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="text-muted-foreground">{label}</div>
      <div className="ml-auto text-right font-medium">{value}</div>
    </div>
  );
}
function Field({ label, icon: Icon, dataKind, onInput, ...rest }) {
  const handleInput = (event) => {
    if (dataKind === "phone") event.currentTarget.value = digitsOnly(event.currentTarget.value);
    if (dataKind === "name") event.currentTarget.value = lettersOnly(event.currentTarget.value);
    if (dataKind === "email") event.currentTarget.value = cleanEmail(event.currentTarget.value);
    onInput?.(event);
  };

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          {...rest}
          onInput={handleInput}
          className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
        />
      </div>
    </div>
  );
}
