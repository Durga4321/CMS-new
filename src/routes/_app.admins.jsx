import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  Eye,
  Mail,
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
import { Switch } from "@/components/ui/switch";
import { api, toArray } from "@/lib/api";
import { useApiResource } from "@/hooks/use-api-resource";
import { normalizeAdmin, normalizeClinic, normalizeRole } from "@/lib/api-normalizers";
import {
  cleanEmail,
  EMAIL_INPUT_PATTERN,
  firstError,
  lettersOnly,
  validateEmail,
  validateName,
} from "@/lib/form-validation";
import { toast } from "sonner";
export const Route = createFileRoute("/_app/admins")({
  component: AdminsPage,
  head: () => ({ meta: [{ title: "Admins — Medisuite" }] }),
});
function AdminsPage() {
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState("");
  const { data, loading, error, reload } = useApiResource(
    async () => {
      const [adminsResponse, clinicsResponse, rolesResponse] = await Promise.all([
        api.admins.list(),
        api.clinics.list(),
        api.roles.list(),
      ]);
      return {
        admins: toArray(adminsResponse).map(normalizeAdmin),
        clinics: toArray(clinicsResponse).map(normalizeClinic),
        roles: toArray(rolesResponse).map(normalizeRole),
      };
    },
    { admins: [], clinics: [], roles: [] },
    [],
  );
  const { admins, clinics, roles } = data;
  const filtered = admins.filter(
    (a) =>
      a.name.toLowerCase().includes(q.toLowerCase()) ||
      a.email.toLowerCase().includes(q.toLowerCase()),
  );
  const createAdmin = async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const admin = {
      name: String(form.get("name") ?? "").trim(),
      email: cleanEmail(form.get("email")),
      password: String(form.get("password") ?? ""),
      role: form.get("role"),
      clinic: form.get("clinic"),
      sendWelcomeEmail: Boolean(form.get("sendWelcomeEmail")),
    };
    const validationError = firstError([
      validateName(admin.name, "Full name"),
      validateEmail(admin.email),
      admin.password.length >= 6 ? "" : "Temporary password must be at least 6 characters",
      admin.role ? "" : "Role is required",
      admin.clinic ? "" : "Assigned clinic is required",
    ]);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    try {
      await api.admins.create(admin);
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
      role: form.get("role"),
      clinic: form.get("clinic"),
      isActive: Boolean(form.get("isActive")),
    };
    const validationError = firstError([
      validateName(admin.name, "Full name"),
      validateEmail(admin.email),
      admin.role ? "" : "Role is required",
      admin.clinic ? "" : "Assigned clinic is required",
    ]);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    try {
      await api.admins.update(editing.id, admin);
      setEditing(null);
      toast.success("Admin updated");
      reload();
    } catch (err) {
      toast.error(err?.message ?? "Unable to update admin");
    }
  };
  const deleteAdmin = async (id) => {
    if (!window.confirm("Remove this admin? This action cannot be undone.")) return;
    try {
      await api.admins.remove(id);
      toast.success("Admin removed");
      reload();
    } catch (err) {
      toast.error(err?.message ?? "Unable to remove admin");
    }
  };
  return (
    <>
      <PageHeader
        title="Admin Management"
        description="Manage clinic administrators and their access levels."
        actions={
          <Button onClick={() => setOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Create Admin
          </Button>
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
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{filtered.length}</span> admins
          </div>
        </div>

        <div className="overflow-x-auto">
          {error && (
            <div className="border-b border-border p-4 text-sm text-destructive">{error}</div>
          )}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 font-medium">Admin</th>
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
                      <div>
                        <div className="font-medium">{a.name}</div>
                        <div className="text-xs text-muted-foreground">{a.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">{a.clinic}</td>
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
                        <DropdownMenuItem onClick={() => setEditing(a)}>
                          <Edit2 className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteAdmin(a.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
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
                name="password"
                label="Temporary password"
                icon={KeyRound}
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
              />
              <div>
                <label className="mb-1.5 block text-sm font-medium">Role</label>
                <Select name="role" defaultValue={roles[0]?.name}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.name} value={r.name}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium">Assigned clinic</label>
                <Select name="clinic" defaultValue={clinics[0]?.name}>
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
              <Switch name="sendWelcomeEmail" defaultChecked />
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
                <div>
                  <div className="font-semibold">{viewing.name}</div>
                  <div className="text-xs text-muted-foreground">{viewing.email}</div>
                </div>
                <div className="ml-auto">
                  <StatusBadge status={viewing.status} />
                </div>
              </div>
              <div className="space-y-2 rounded-lg border border-border bg-secondary/40 p-4">
                <DetailRow label="Role" value={viewing.role} />
                <DetailRow label="Assigned clinic" value={viewing.clinic} />
                <DetailRow label="Admin ID" value={viewing.id} />
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
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Role</label>
                  <Select name="role" defaultValue={editing.role}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r.name} value={r.name}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Assigned clinic</label>
                  <Select name="clinic" defaultValue={editing.clinic}>
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
      <div className="ml-auto text-right font-medium">{value}</div>
    </div>
  );
}
function IconField({ label, icon: Icon, dataKind, onInput, ...rest }) {
  const handleInput = (event) => {
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
