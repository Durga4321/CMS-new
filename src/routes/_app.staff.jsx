import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Edit, Plus, Save, Search, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, StatusBadge } from "@/components/layout/PageHeader";
import { useApiResource } from "@/hooks/use-api-resource";
import { api, recordSystemLog, rememberUserDirectoryEntry, toArray } from "@/lib/api";
import { normalizeStatus, text } from "@/lib/api-normalizers";

export const Route = createFileRoute("/_app/staff")({
  component: StaffPage,
  head: () => ({ meta: [{ title: "Staff - Medisuite" }] }),
});

const blankStaff = { name: "", email: "", phone: "", password: "", role: "", status: "active" };

function StaffPage() {
  const {
    data: staff,
    setData: setStaff,
    loading,
    error,
  } = useApiResource(async () => toArray(await api.staff.list()).map(normalizeStaff), []);
  const [query, setQuery] = useState("");
  const [screen, setScreen] = useState("list");
  const [editingStaff, setEditingStaff] = useState(null);
  const [actionError, setActionError] = useState("");
  const filtered = staff.filter(
    (member) =>
      member.name.toLowerCase().includes(query.toLowerCase()) ||
      member.role.toLowerCase().includes(query.toLowerCase()),
  );

  const saveStaff = async (event) => {
    event.preventDefault();
    setActionError("");
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") ?? "").trim(),
      email: String(form.get("email") ?? "").trim(),
      phone: String(form.get("phone") ?? "").trim(),
      password: String(form.get("password") ?? "").trim(),
      role: String(form.get("role") ?? "").trim(),
      status: editingStaff?.status ?? "active",
    };
    try {
      const response = editingStaff
        ? await api.staff.update(editingStaff.id, payload)
        : await api.staff.create(payload);
      const savedStaff = normalizeStaff(response?.data ?? response ?? payload);
      rememberUserDirectoryEntry(savedStaff, "staff");
      recordSystemLog({
        user: savedStaff.name,
        email: savedStaff.email,
        role: savedStaff.role,
        action: editingStaff ? "Updated staff" : "Created staff",
        module: "Users",
      });
      setStaff((current) =>
        editingStaff
          ? current.map((member) => (member.id === editingStaff.id ? savedStaff : member))
          : [savedStaff, ...current],
      );
      setEditingStaff(null);
      setScreen("list");
    } catch (err) {
      setActionError(err?.message ?? "Unable to save staff member");
    }
  };

  const disableStaff = async (member) => {
    setActionError("");
    try {
      await api.staff.updateStatus(member.id, { status: "inactive" });
      setStaff((current) =>
        current.map((item) => (item.id === member.id ? { ...item, status: "inactive" } : item)),
      );
    } catch (err) {
      setActionError(err?.message ?? "Unable to disable staff member");
    }
  };

  if (screen === "form") {
    const member = editingStaff ?? blankStaff;
    return (
      <>
        <PageHeader
          title={editingStaff ? "Edit Staff" : "Add Staff"}
          description="Create staff access and assign a clinic role."
        />
        <form
          onSubmit={saveStaff}
          className="rounded-xl border border-border bg-card p-5 shadow-card"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <FormInput name="name" label="Name" defaultValue={member.name} required />
            <FormInput
              name="email"
              label="Email"
              type="email"
              defaultValue={member.email}
              required
            />
            <FormInput name="phone" label="Phone" defaultValue={member.phone} required />
            <FormInput
              name="password"
              label="Password"
              type="password"
              defaultValue={member.password}
              required={!editingStaff}
            />
            <FormInput name="role" label="Role" defaultValue={member.role} required />
          </div>
          <FormActions
            onCancel={() => {
              setEditingStaff(null);
              setScreen("list");
            }}
          />
        </form>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Staff List"
        description="Manage clinic staff accounts, roles and access status."
        actions={
          <Button className="gap-1.5" onClick={() => setScreen("form")}>
            <Plus className="h-4 w-4" />
            Add Staff
          </Button>
        }
      />
      {(error || actionError) && (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {actionError || error}
        </div>
      )}
      <div className="rounded-xl border border-border bg-card shadow-card">
        <div className="border-b border-border p-4">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search staff..."
              className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Phone</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((member) => (
                <tr
                  key={member.id}
                  className="border-b border-border last:border-0 hover:bg-secondary/40"
                >
                  <td className="px-5 py-3.5">
                    <div className="font-medium">{member.name}</div>
                    <div className="text-xs text-muted-foreground">{member.email}</div>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">{member.role}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{member.phone}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={member.status} />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => {
                          setEditingStaff(member);
                          setScreen("form");
                        }}
                      >
                        <Edit className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-1.5"
                        disabled={member.status === "inactive"}
                        onClick={() => disableStaff(member)}
                      >
                        <UserX className="h-3.5 w-3.5" />
                        Disable
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
                    {loading ? "Loading staff..." : "No staff found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function normalizeStaff(item, index = 0) {
  item = item ?? {};
  return {
    id: text(item.id ?? item._id ?? item.staffId ?? item.staff_id, `staff-${index + 1}`),
    name: text(
      item.name ?? item.fullName ?? [item.firstName, item.lastName].filter(Boolean).join(" "),
      "",
    ),
    email: text(item.email, ""),
    phone: text(item.phone ?? item.mobile ?? item.phoneNumber ?? item.mobileNumber, ""),
    role: text(item.roleName ?? item.role?.name ?? item.role, ""),
    status: normalizeStatus(item.status ?? item.isActive),
  };
}

function FormInput({ label, ...props }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      <input
        {...props}
        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
      />
    </div>
  );
}

function FormActions({ onCancel }) {
  return (
    <div className="mt-5 flex justify-end gap-2">
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit" className="gap-1.5">
        <Save className="h-4 w-4" />
        Save
      </Button>
    </div>
  );
}
