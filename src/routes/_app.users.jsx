import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Filter, FileDown, Activity, Mail, Phone, MapPin, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, StatusBadge } from "@/components/layout/PageHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { api, getStoredUserActivity, toArray } from "@/lib/api";
import { useApiResource } from "@/hooks/use-api-resource";
import { normalizeUser } from "@/lib/api-normalizers";
import {
  alphaNumericOnly,
  cleanEmail,
  digitsOnly,
  firstError,
  lettersOnly,
  validateEmail,
  validateName,
  validatePhone,
} from "@/lib/form-validation";
import { toast } from "sonner";
export const Route = createFileRoute("/_app/users")({
  component: UsersPage,
  head: () => ({ meta: [{ title: "Users — Medisuite" }] }),
});
function UsersPage() {
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState("all");
  const [clinicFilter, setClinicFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(false);
  const {
    data: users,
    setData: setUsers,
    loading,
    error,
    reload,
  } = useApiResource(async () => toArray(await api.users.list()).map(normalizeUser), [], []);
  const visibleUsers = users.map((user) => {
    const storedActivity = getStoredUserActivity(user.email);
    return storedActivity && user.lastActive === "Never"
      ? { ...user, lastActive: storedActivity }
      : user;
  });
  const availableUserRoles = Array.from(
    new Set(visibleUsers.map((u) => String(u.role ?? "").trim().toLowerCase()).filter(Boolean)),
  );
  const availableClinics = Array.from(
    new Set(visibleUsers.map((u) => String(u.clinic ?? "").trim()).filter(Boolean)),
  );
  const filtered = visibleUsers.filter(
    (u) =>
      (tab === "all" || u.status === tab) &&
      (roleFilter === "all" || u.role.toLowerCase() === roleFilter) &&
      (clinicFilter === "all" || u.clinic.toLowerCase().includes(clinicFilter)) &&
      (u.name.toLowerCase().includes(q.toLowerCase()) ||
        u.email.toLowerCase().includes(q.toLowerCase())),
  );
  const counts = {
    all: visibleUsers.length,
    active: visibleUsers.filter((u) => u.status === "active").length,
    inactive: visibleUsers.filter((u) => u.status === "inactive").length,
    pending: visibleUsers.filter((u) => u.status === "pending").length,
  };
  const updateStatus = async (user, active) => {
    const nextStatus = active ? "active" : "inactive";
    setUsers((current) =>
      current.map((item) => (item.id === user.id ? { ...item, status: nextStatus } : item)),
    );
    setSelected((current) =>
      current?.id === user.id ? { ...current, status: nextStatus } : current,
    );
    try {
      await api.users.updateStatus(user.id, { status: nextStatus });
      toast.success("User status updated");
      reload();
    } catch (err) {
      setUsers((current) =>
        current.map((item) => (item.id === user.id ? { ...item, status: user.status } : item)),
      );
      setSelected((current) =>
        current?.id === user.id ? { ...current, status: user.status } : current,
      );
      toast.error(err?.message ?? "Unable to update user");
    }
  };
  const saveUser = async (event) => {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    const nextUser = {
      ...selected,
      name: String(form.get("name") ?? "").trim(),
      email: cleanEmail(form.get("email")),
      phone: digitsOnly(form.get("phone")),
      clinic: String(form.get("clinic") ?? "").trim(),
      role: String(form.get("role") ?? "").trim(),
    };
    const errorMessage = firstError([
      validateName(nextUser.name, "User name"),
      validateEmail(nextUser.email),
      validatePhone(nextUser.phone),
      nextUser.clinic ? "" : "Clinic is required",
      nextUser.role ? "" : "Role is required",
    ]);
    if (errorMessage) {
      toast.error(errorMessage);
      return;
    }
    setUsers((current) => current.map((item) => (item.id === selected.id ? nextUser : item)));
    setSelected(nextUser);
    try {
      await api.users.update(selected.id, nextUser);
      setEditing(false);
      toast.success("User updated");
      reload();
    } catch (err) {
      toast.error(err?.message ?? "Unable to update user");
      reload();
    }
  };
  return (
    <>
      <PageHeader
        title="User Management"
        description="View and manage users across all your clinics."
        actions={
          <Button variant="outline" className="gap-1.5">
            <FileDown className="h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {["all", "active", "inactive", "pending"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium capitalize transition-colors ${tab === t ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:bg-accent"}`}
          >
            {t}
            <span
              className={`rounded-full px-1.5 text-[11px] ${tab === t ? "bg-primary-foreground/20" : "bg-secondary"}`}
            >
              {counts[t]}
            </span>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card">
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search users…"
              className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setFiltersOpen(true)}
          >
            <Filter className="h-4 w-4" />
            Advanced filters
          </Button>
        </div>

        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetContent className="w-full sm:max-w-sm">
            <SheetHeader>
              <SheetTitle>User filters</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Role</label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                >
                  <option value="all">All roles</option>
                  {availableUserRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Clinic</label>
                <select
                  value={clinicFilter}
                  onChange={(e) => setClinicFilter(e.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                >
                  <option value="all">All clinics</option>
                  {availableClinics.map((clinic) => (
                    <option key={clinic} value={clinic.toLowerCase()}>
                      {clinic}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setRoleFilter("all");
                    setClinicFilter("all");
                    setQ("");
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
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Clinic</th>
                <th className="px-5 py-3 font-medium">Last active</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => setSelected(u)}
                  className="cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-secondary/40"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-info/10 text-xs font-semibold text-info">
                          {u.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{u.name}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">{u.role}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{u.clinic}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{u.lastActive}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={u.status} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    {loading ? "Loading users..." : "No users found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Sheet
        open={!!selected}
        onOpenChange={(o) => {
          if (!o) {
            setSelected(null);
            setEditing(false);
          }
        }}
      >
        <SheetContent className="w-full sm:max-w-md">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>User details</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-gradient-primary text-lg text-primary-foreground">
                      {selected.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-lg font-semibold">{selected.name}</div>
                    <div className="text-sm text-muted-foreground">{selected.role}</div>
                    <div className="mt-1.5">
                      <StatusBadge status={selected.status} />
                    </div>
                  </div>
                </div>

                {editing ? (
                  <form onSubmit={saveUser} className="space-y-3">
                    <EditField
                      name="name"
                      label="Name"
                      defaultValue={selected.name}
                      dataKind="letters"
                    />
                    <EditField
                      name="email"
                      label="Email"
                      type="email"
                      defaultValue={selected.email}
                      dataKind="email"
                    />
                    <EditField
                      name="phone"
                      label="Phone"
                      type="tel"
                      defaultValue={digitsOnly(selected.phone)}
                      maxLength={10}
                      inputMode="numeric"
                      dataKind="numbers"
                    />
                    <EditField name="clinic" label="Clinic" defaultValue={selected.clinic} />
                    <EditField name="role" label="Role" defaultValue={selected.role} />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setEditing(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" className="flex-1">
                        Save changes
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-2 rounded-lg border border-border bg-secondary/40 p-4">
                    <Row icon={Mail} label="Email" value={selected.email} />
                    <Row icon={Phone} label="Phone" value={selected.phone} />
                    <Row icon={MapPin} label="Clinic" value={selected.clinic} />
                    <Row icon={Calendar} label="Member since" value={selected.memberSince} />
                  </div>
                )}

                <div>
                  <h4 className="mb-2 text-sm font-semibold">Activity history</h4>
                  <ul className="space-y-2.5">
                    <li className="flex items-center gap-3 text-sm">
                      <div className="grid h-7 w-7 place-items-center rounded-full bg-primary-soft text-primary">
                        <Activity className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1">Last active</div>
                      <div className="text-xs text-muted-foreground">{selected.lastActive}</div>
                    </li>
                  </ul>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <div className="text-sm font-medium">Account active</div>
                    <div className="text-xs text-muted-foreground">Toggle to deactivate</div>
                  </div>
                  <Switch
                    defaultChecked={selected.status === "active"}
                    onCheckedChange={(active) => updateStatus(selected, active)}
                  />
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setEditing(true)}>
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => updateStatus(selected, false)}
                    disabled={selected.status === "inactive"}
                  >
                    Deactivate
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
function EditField({ label, dataKind, onInput, ...props }) {
  const handleInput = (event) => {
    if (dataKind === "letters") event.currentTarget.value = lettersOnly(event.currentTarget.value);
    if (dataKind === "numbers") event.currentTarget.value = digitsOnly(event.currentTarget.value);
    if (dataKind === "email") event.currentTarget.value = cleanEmail(event.currentTarget.value);
    if (dataKind === "alphanumeric") {
      event.currentTarget.value = alphaNumericOnly(event.currentTarget.value);
    }
    onInput?.(event);
  };

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      <input
        {...props}
        onInput={handleInput}
        className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
      />
    </div>
  );
}
function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div className="text-muted-foreground">{label}</div>
      <div className="ml-auto font-medium">{value}</div>
    </div>
  );
}
