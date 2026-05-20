import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Phone, Save, ShieldCheck, User } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { getAuthUser, readField, setAuthUser } from "@/lib/api";

export const Route = createFileRoute("/_app/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Profile - Medisuite" }] }),
});

const inputCls =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20";
const SUPER_ADMIN_EMAIL = "superadmin@gmail.com";
const SUPER_ADMIN_NAME = "DP";

function ProfilePage() {
  const authUser = getAuthUser() ?? {};
  const email = readField(authUser, ["email", "Email", "username", "Username"]);
  const role = normalizeRole(authUser.role ?? authUser.Role ?? "superadmin", email);
  const isSuperAdmin = role === "superadmin";
  const storedName = readField(authUser, ["name", "Name", "fullName", "FullName", "displayName"]);
  const fallbackName = role === "receptionist" ? "Reception Desk" : "Account user";
  const displayName =
    isSuperAdmin && (!storedName || storedName.toLowerCase() === "superadmin")
      ? SUPER_ADMIN_NAME
      : storedName || fallbackName;
  const [form, setForm] = useState({
    name: displayName,
    email,
    phone: authUser.phone ?? authUser.mobile ?? "",
    role,
  });

  const initials = form.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const saveProfile = (event) => {
    event.preventDefault();
    setAuthUser({ ...authUser, ...form, role: normalizeRole(form.role, form.email) });
    toast.success("Profile details saved");
  };

  return (
    <>
      <PageHeader title="Profile" description="View and update your account details." />

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <section className="rounded-xl border border-border bg-card p-6 shadow-card">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-gradient-primary text-lg text-primary-foreground">
              {initials || "SA"}
            </AvatarFallback>
          </Avatar>
          <div className="mt-4">
            <h2 className="text-lg font-semibold">{form.name || "Account user"}</h2>
            <p className="text-sm text-muted-foreground">{formatRole(form.role)}</p>
          </div>
          <div className="mt-6 space-y-3 text-sm">
            <ProfileFact icon={Mail} label={form.email || "No email added"} />
            <ProfileFact icon={Phone} label={form.phone || "No phone added"} />
            <ProfileFact icon={ShieldCheck} label={formatRole(form.role)} />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-card">
          <form onSubmit={saveProfile}>
            <div className="mb-6 border-b border-border pb-4">
              <h3 className="text-base font-semibold">Account information</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                These details are used in the top navigation and account menu.
              </p>
            </div>

            <div className="space-y-5">
              <FormField label="Full name">
                <input className={inputCls} value={form.name} onChange={updateField("name")} />
              </FormField>
              <FormField label="Email address">
                <input
                  className={inputCls}
                  type="email"
                  value={form.email}
                  onChange={updateField("email")}
                />
              </FormField>
              <FormField label="Phone number">
                <input className={inputCls} value={form.phone} onChange={updateField("phone")} />
              </FormField>
              <FormField label="Role">
                <input className={inputCls} value={form.role} onChange={updateField("role")} />
              </FormField>
            </div>

            <div className="mt-6 flex justify-end border-t border-border pt-4">
              <Button type="submit" className="gap-1.5">
                <Save className="h-4 w-4" />
                Save profile
              </Button>
            </div>
          </form>
        </section>
      </div>
    </>
  );
}

function normalizeRole(value, email = "") {
  const role = String(value ?? "")
    .toLowerCase()
    .trim();
  if (
    email.toLowerCase() === SUPER_ADMIN_EMAIL ||
    role.includes("superadmin") ||
    role.includes("super admin") ||
    role.includes("super_admin")
  ) {
    return "superadmin";
  }
  if (role.includes("reception")) return "receptionist";
  if (role.includes("doctor")) return "doctor";
  if (role.includes("patient")) return "patient";
  if (role.includes("admin")) return "admin";
  return role || "user";
}

function formatRole(value) {
  const role = normalizeRole(value);
  if (role === "superadmin") return "Super Admin";
  if (role === "receptionist") return "Receptionist";
  if (role === "doctor") return "Doctor";
  if (role === "patient") return "Patient";
  if (role === "admin") return "Admin";
  return "User";
}

function ProfileFact({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2.5 text-muted-foreground">
      <Icon className="h-4 w-4" />
      <span className="min-w-0 truncate">{label}</span>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <label className="grid gap-1.5 sm:grid-cols-[180px_1fr] sm:items-center sm:gap-6">
      <span className="text-sm font-medium">{label}</span>
      <span>{children}</span>
    </label>
  );
}
