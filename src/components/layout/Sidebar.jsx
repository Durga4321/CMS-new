import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Settings,
  BarChart3,
  Bell,
  Stethoscope,
  ChevronDown,
  ClipboardList,
  CalendarPlus,
  ReceiptText,
  UserPlus,
  UserCog,
  CalendarClock,
  Pill,
  Building2,
  ShieldCheck,
  ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getAuthUser } from "@/lib/api";
import { normalizeRole } from "@/lib/auth-routing";
const nav = [
  {
    group: "Overview",
    items: [{ to: "/admin-dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    group: "Admin Modules",
    items: [
      { to: "/doctors", label: "Manage Doctors", icon: Stethoscope },
      { to: "/staff", label: "Manage Staff", icon: UserCog },
      { to: "/schedule", label: "Schedule Setup", icon: CalendarClock },
      { to: "/patients", label: "View Patients", icon: Users },
      { to: "/appointments", label: "View Appointments", icon: CalendarPlus },
    ],
  },
  {
    group: "Insights",
    items: [
      { to: "/admin-reports", label: "Reports", icon: BarChart3 },
      { to: "/notifications", label: "Notifications", icon: Bell },
    ],
  },
  { group: "System", items: [{ to: "/settings", label: "Settings", icon: Settings }] },
];
export function Sidebar({ open, onClose }) {
  const location = useRouterState({ select: (s) => s.location });
  const path = location.pathname;
  const authUser = getAuthUser();
  const role = normalizeRole(authUser?.role, authUser?.email ?? authUser?.Email) || "admin";
  const isSuperAdmin = role === "superadmin";
  const isReceptionist = role === "receptionist";
  const isDoctor = role === "doctor";
  const superAdminNav = [
    { group: "Overview", items: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
    {
      group: "Platform",
      items: [
        { to: "/clinics", label: "Clinics", icon: Building2 },
        { to: "/admins", label: "Admins", icon: ShieldCheck },
        { to: "/users", label: "Users", icon: Users },
        { to: "/roles", label: "Roles & Permissions", icon: UserCog },
      ],
    },
    {
      group: "Insights",
      items: [
        { to: "/reports", label: "Reports", icon: BarChart3 },
        { to: "/logs", label: "Audit Logs", icon: ScrollText },
        { to: "/notifications", label: "Notifications", icon: Bell },
      ],
    },
    { group: "System", items: [{ to: "/settings", label: "Settings", icon: Settings }] },
  ];
  const receptionistNav = [
    {
      group: "Front Desk",
      items: [
        { to: "/reception", label: "Reception Dashboard", icon: ClipboardList },
        { to: "/reception/patients", label: "Patients", icon: UserPlus },
        { to: "/reception/appointments", label: "Book Appointment", icon: CalendarPlus },
        { to: "/reception/billing", label: "Billing", icon: ReceiptText },
      ],
    },
  ];
  const doctorNav = [
    {
      group: "Doctor Console",
      items: [
        { to: "/doctor", label: "Dashboard", icon: LayoutDashboard },
        { to: "/doctor/patients", label: "Patients", icon: Users },
        { to: "/doctor/consultations", label: "Consultations", icon: ClipboardList },
        { to: "/doctor/prescriptions", label: "Prescriptions", icon: Pill },
      ],
    },
    {
      group: "Updates",
      items: [{ to: "/notifications", label: "Notifications", icon: Bell }],
    },
  ];
  const visibleNav = isReceptionist
    ? receptionistNav
    : isDoctor
      ? doctorNav
      : isSuperAdmin
        ? superAdminNav
        : nav;
  const consoleLabel = isReceptionist
    ? "Reception Console"
    : isDoctor
      ? "Doctor Console"
      : isSuperAdmin
        ? "Super Admin Console"
        : "Admin Console";
  const helpCopy = isReceptionist
    ? "Book appointments, register patients, and manage billing."
    : isDoctor
      ? "View patients, write prescriptions, and complete consultations."
      : isSuperAdmin
        ? "Manage clinics, admins, users, permissions and audit logs."
        : "Manage doctors, schedules, patients, appointments and reports.";
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-foreground/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 border-r border-sidebar-border bg-sidebar transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-elev">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight text-sidebar-foreground">
              Medisuite
            </div>
            <div className="text-[11px] text-muted-foreground">{consoleLabel}</div>
          </div>
        </div>

        <nav className="flex h-[calc(100vh-4rem)] flex-col overflow-y-auto px-3 py-4">
          {visibleNav.map((group) => (
            <div key={group.group} className="mb-4">
              <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.group}
              </div>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active =
                    item.to === "/reception" || item.to === "/doctor"
                      ? path === item.to
                      : path.startsWith(item.to);
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        onClick={onClose}
                        className={cn(
                          "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                          active
                            ? "bg-primary text-primary-foreground shadow-elev"
                            : "text-sidebar-foreground hover:bg-sidebar-accent",
                        )}
                      >
                        <item.icon
                          className={cn(
                            "h-4 w-4",
                            active ? "" : "text-muted-foreground group-hover:text-foreground",
                          )}
                        />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          <div className="mt-auto rounded-xl border border-sidebar-border bg-gradient-soft p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ChevronDown className="h-4 w-4 text-primary" />
              Need help?
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{helpCopy}</p>
            <Link
              to="/help"
              onClick={onClose}
              className="mt-3 inline-flex w-full justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              View docs
            </Link>
          </div>
        </nav>
      </aside>
    </>
  );
}
