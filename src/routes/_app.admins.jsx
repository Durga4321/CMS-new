import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Filter,
  FileDown,
  MoreVertical,
  Edit2,
  Eye,
  Mail,
  Phone,
  User2,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, StatusBadge } from "@/components/layout/PageHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { api, getPayload, recordSystemLog, rememberUserDirectoryEntry, toArray } from "@/lib/api";
import { useApiResource } from "@/hooks/use-api-resource";
import { normalizeAdmin, normalizeClinic } from "@/lib/api-normalizers";
import {
  cleanEmail,
  digitsOnly,
  EMAIL_INPUT_PATTERN,
  firstError,
  lettersOnly,
  validateEmail,
  validateName,
  validatePassword,
  validatePhone,
  validateUniquePhone,
} from "@/lib/form-validation";
import { exportCsv } from "@/lib/export-utils";
import { toast } from "sonner";
export const Route = createFileRoute("/_app/admins")({
  component: AdminsPage,
  head: () => ({ meta: [{ title: "Admins — Medisuite" }] }),
});
const adminStatusPayload = (active) => ({
  isActive: active,
  status: active ? "active" : "inactive",
});

const adminAccessPayload = ({ clinic }) => ({
  role: "Admin",
  roleName: "Admin",
  clinic,
  clinicName: clinic,
});

function AdminsPage() {
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [clinicFilter, setClinicFilter] = useState("all");
  const [newAdminClinic, setNewAdminClinic] = useState("");
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);
  const [editAdminActive, setEditAdminActive] = useState(false);
  const [editAdminClinic, setEditAdminClinic] = useState("");

  const { data, setData, loading, error, reload } = useApiResource(
    async () => {
      const [adminsResponse, clinicsResponse] = await Promise.all([
        api.admins.list(),
        api.clinics.list(),
      ]);
      return {
        admins: toArray(adminsResponse).map((admin, index) => ({
          ...normalizeAdmin(admin, index),
          role: "Admin",
        })),
        clinics: toArray(clinicsResponse).map(normalizeClinic),
      };
    },
    { admins: [], clinics: [] },
    [],
  );
  const { admins, clinics } = data;

  useEffect(() => {
    if (!open) return;
    setNewAdminClinic(clinics[0]?.name || "");
    setSendWelcomeEmail(true);
  }, [open, clinics]);

  useEffect(() => {
    if (!editing) return;
    setEditAdminActive(editing.status === "active");
    setEditAdminClinic(editing.clinic || clinics[0]?.name || "");
  }, [editing, clinics]);

  const filtered = admins.filter(
    (a) =>
      (a.name.toLowerCase().includes(q.toLowerCase()) ||
        a.email.toLowerCase().includes(q.toLowerCase())) &&
      (clinicFilter === "all" || a.clinic.toLowerCase().includes(clinicFilter)),
  );
  const createAdmin = async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const admin = {
      name: String(form.get("name") ?? "").trim(),
      email: cleanEmail(form.get("email")),
      phone: digitsOnly(form.get("phone")),
      password: String(form.get("password") ?? ""),
      ...adminAccessPayload({ clinic: newAdminClinic }),
      sendWelcomeEmail,
      welcomeEmail: sendWelcomeEmail,
      sendEmail: sendWelcomeEmail,
      status: "active",
      isActive: true,
    };
    const validationError = firstError([
      validateName(admin.name, "Full name"),
      validateEmail(admin.email),
      validatePhone(admin.phone),
      validateUniquePhone(admin.phone, admins, "Phone number"),
      validatePassword(admin.password, "Temporary password"),
      admin.role ? "" : "Role is required",
      admin.clinic ? "" : "Assigned clinic is required",
    ]);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    try {
      await api.admins.create(admin);
      rememberUserDirectoryEntry(admin, "admin");
      recordSystemLog({
        user: admin.name,
        email: admin.email,
        role: admin.role,
        action: "Created admin",
        module: "Users",
      });
      setOpen(false);
      toast.success("Admin invitation sent");
      reload();
    } catch (err) {
      toast.error(err?.message ?? "Unable to create admin");
    }
  };
  const updateAdmin = async (e) => {
    e.preventDefault();
    if (!editing) return;
    const form = new FormData(e.currentTarget);
    const admin = {
      name: String(form.get("name") ?? "").trim(),
      email: cleanEmail(form.get("email")),
      phone: digitsOnly(form.get("phone")),
      ...adminAccessPayload({ clinic: editAdminClinic }),
      ...adminStatusPayload(editAdminActive),
    };
    const validationError = firstError([
      validateName(admin.name, "Full name"),
      validateEmail(admin.email),
      validatePhone(admin.phone),
      validateUniquePhone(admin.phone, admins, "Phone number", editing.id),
      admin.role ? "" : "Role is required",
      admin.clinic ? "" : "Assigned clinic is required",
    ]);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    try {
      const response = await api.admins.update(editing.id, admin);
      const updated = normalizeAdmin({
        ...editing,
        ...admin,
        ...getPayload(response),
        role: admin.role,
        roleName: admin.role,
        clinic: admin.clinic,
        clinicName: admin.clinic,
        status: admin.status,
      });
      setData((current) => ({
        ...current,
        admins: current.admins.map((item) => (item.id === editing.id ? updated : item)),
      }));
      setViewing((current) => (current?.id === editing.id ? updated : current));
      setEditing(null);
      toast.success("Admin updated");
      reload();
    } catch (err) {
      toast.error(err?.message ?? "Unable to update admin");
    }
  };
  const exportAdmins = () => {
    exportCsv(
      "admins.csv",
      ["Name", "Email", "Phone", "Assigned Clinic", "Role", "Status"],
      filtered.map((admin) => [
        admin.name,
        admin.email,
        admin.phone,
        admin.clinic,
        admin.role,
        admin.status,
      ]),
    );
  };
  return (
    <>
      <PageHeader
        title="Admin Management"
        description="Manage clinic administrators and their access levels."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={exportAdmins} variant="outline" className="gap-1.5">
              <FileDown className="h-4 w-4" />
              Export CSV
            </Button>
            <Button onClick={() => setOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Create Admin
            </Button>
          </div>
        }
      />

      <div className="rounded-xl border border-border bg-card shadow-card">
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search admins…"
              className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setFiltersOpen(true)}
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{filtered.length}</span> admins
            </div>
          </div>
        </div>

        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetContent className="w-full sm:max-w-sm">
            <SheetHeader>
              <SheetTitle>Admin filters</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Clinic</label>
                <input
                  value={clinicFilter === "all" ? "" : clinicFilter}
                  onChange={(e) => setClinicFilter(e.target.value.trim().toLowerCase() || "all")}
                  placeholder="Filter by clinic"
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setClinicFilter("all");
                  }}
                >
                  Clear filters
                </Button>
                <Button onClick={() => setFiltersOpen(false)}>Apply</Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <div className="overflow-x-auto">
          {error && (
            <div className="border-b border-border p-4 text-sm text-destructive">{error}</div>
          )}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Phone</th>
                <th className="px-5 py-3 font-medium">Assigned Clinic</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-border last:border-0 transition-colors hover:bg-secondary/40"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary-soft text-xs font-semibold text-primary">
                          {a.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="max-w-[220px] truncate font-medium" title={a.name}>
                          {a.name}
                        </div>
                        <div
                          className="max-w-[240px] truncate text-xs text-muted-foreground"
                          title={a.email}
                        >
                          {a.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-muted-foreground">
                    {a.phone || "-"}
                  </td>
                  <td
                    className="max-w-[220px] truncate px-5 py-3.5 text-muted-foreground"
                    title={a.clinic}
                  >
                    {a.clinic}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1 rounded-md bg-info/10 px-2 py-0.5 text-xs font-medium text-info">
                      <ShieldCheck className="h-3 w-3" />
                      {a.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="inline-grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewing(a)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={a.status === "inactive"}
                          onClick={() => {
                            if (a.status === "inactive")
                              return toast.error("Inactive admins cannot be edited");
                            setEditing(a);
                          }}
                        >
                          <Edit2 className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    {loading ? "Loading admins..." : "No admins found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Create new admin</DialogTitle>
            <p className="text-sm text-muted-foreground">Invite a new administrator to a clinic.</p>
          </DialogHeader>
          <form onSubmit={createAdmin} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <IconField
                name="name"
                label="Full name"
                icon={User2}
                placeholder="Jane Smith"
                required
                dataKind="name"
                maxLength={80}
              />
              <IconField
                name="email"
                label="Email"
                icon={Mail}
                type="email"
                placeholder="jane@clinic.com"
                required
                dataKind="email"
                pattern={EMAIL_INPUT_PATTERN}
                title="Use a professional email such as jane@clinicname.com"
              />
              <IconField
                name="phone"
                label="Phone"
                icon={Phone}
                type="tel"
                placeholder="9876543210"
                required
                maxLength={10}
                inputMode="numeric"
                dataKind="phone"
              />
              <IconField
                name="password"
                label="Temporary password"
                icon={KeyRound}
                type="password"
                required
                minLength={8}
                dataKind="password"
                placeholder="••••••••"
              />
              <div>
                <label className="mb-1.5 block text-sm font-medium">Role</label>
                <input
                  value="Admin"
                  readOnly
                  className="h-10 w-full rounded-lg border border-input bg-muted px-3 text-sm text-muted-foreground"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium">Assigned clinic</label>
                <Select name="clinic" value={newAdminClinic} onValueChange={setNewAdminClinic}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {clinics.map((c) => (
                      <SelectItem key={c.id} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <div className="text-sm font-medium">Send welcome email</div>
                <div className="text-xs text-muted-foreground">With login instructions</div>
              </div>
              <Switch checked={sendWelcomeEmail} onCheckedChange={setSendWelcomeEmail} />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create admin</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={(nextOpen) => !nextOpen && setViewing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Admin details</DialogTitle>
            <p className="text-sm text-muted-foreground">View administrator access details.</p>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11">
                  <AvatarFallback className="bg-primary-soft text-xs font-semibold text-primary">
                    {initials(viewing.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="max-w-[260px] truncate font-semibold" title={viewing.name}>
                    {viewing.name}
                  </div>
                  <div
                    className="max-w-[260px] truncate text-xs text-muted-foreground"
                    title={viewing.email}
                  >
                    {viewing.email}
                  </div>
                </div>
                <div className="ml-auto">
                  <StatusBadge status={viewing.status} />
                </div>
              </div>
              <div className="space-y-2 rounded-lg border border-border bg-secondary/40 p-4">
                <DetailRow label="Role" value={viewing.role} />
                <DetailRow label="Phone" value={viewing.phone} />
                <DetailRow label="Assigned clinic" value={viewing.clinic} />
                <DetailRow label="Admin ID" value={viewing.id} />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setViewing(null)}>
                  Close
                </Button>
                <Button
                  onClick={() => {
                    if (viewing.status === "inactive") {
                      toast.error("Inactive admins cannot be edited");
                      return;
                    }
                    setEditing(viewing);
                    setViewing(null);
                  }}
                >
                  Edit admin
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(nextOpen) => !nextOpen && setEditing(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit admin</DialogTitle>
            <p className="text-sm text-muted-foreground">Update administrator access details.</p>
          </DialogHeader>
          {editing && (
            <form onSubmit={updateAdmin} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <IconField
                  name="name"
                  label="Full name"
                  icon={User2}
                  defaultValue={editing.name}
                  required
                  dataKind="name"
                  maxLength={80}
                />
                <IconField
                  name="email"
                  label="Email"
                  icon={Mail}
                  type="email"
                  defaultValue={editing.email}
                  required
                  dataKind="email"
                  pattern={EMAIL_INPUT_PATTERN}
                  title="Use a professional email such as jane@clinicname.com"
                />
                <IconField
                  name="phone"
                  label="Phone"
                  icon={Phone}
                  type="tel"
                  defaultValue={editing.phone}
                  required
                  maxLength={10}
                  inputMode="numeric"
                  dataKind="phone"
                />
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Role</label>
                  <input
                    value="Admin"
                    readOnly
                    className="h-10 w-full rounded-lg border border-input bg-muted px-3 text-sm text-muted-foreground"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Assigned clinic</label>
                  <Select name="clinic" value={editAdminClinic} onValueChange={setEditAdminClinic}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {clinics.map((c) => (
                        <SelectItem key={c.id} value={c.name}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <div className="text-sm font-medium">Admin active</div>
                  <div className="text-xs text-muted-foreground">Allow this admin to log in</div>
                </div>
                <Switch checked={editAdminActive} onCheckedChange={setEditAdminActive} />
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
function initials(name) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("");
}
function DetailRow({ label, value }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="text-muted-foreground">{label}</div>
      <div
        className="ml-auto max-w-[260px] truncate text-right font-medium"
        title={String(value ?? "")}
      >
        {value}
      </div>
    </div>
  );
}
function IconField({ label, icon: Icon, dataKind, onInput, ...rest }) {
  const handleInput = (event) => {
    if (dataKind === "name") event.currentTarget.value = lettersOnly(event.currentTarget.value);
    if (dataKind === "email") event.currentTarget.value = cleanEmail(event.currentTarget.value);
    if (dataKind === "phone") event.currentTarget.value = digitsOnly(event.currentTarget.value);
    if (dataKind === "password")
      event.currentTarget.value = event.currentTarget.value.replace(/\s/g, "");
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
