import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Building2,
  ShieldCheck,
  Users,
  KeySquare,
  Settings,
  BarChart3,
  ScrollText,
  Bell,
  Stethoscope,
  ChevronDown,
  ClipboardList,
  CalendarPlus,
  ReceiptText,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getAuthUser } from "@/lib/api";
const nav = [
  { group: "Overview", items: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  {
    group: "Management",
    items: [
      { to: "/clinics", label: "Clinics", icon: Building2 },
      { to: "/admins", label: "Admins", icon: ShieldCheck },
      { to: "/users", label: "Users", icon: Users },
      { to: "/roles", label: "Roles & Permissions", icon: KeySquare },
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
export function Sidebar({ open, onClose }) {
  const location = useRouterState({ select: (s) => s.location });
  const path = location.pathname;
  const role = getAuthUser()?.role?.toLowerCase?.() ?? "admin";
  const isReceptionist = role === "receptionist";
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
  const visibleNav = isReceptionist ? receptionistNav : nav;
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
            <div className="text-[11px] text-muted-foreground">
              {isReceptionist ? "Reception Console" : "Super Admin Console"}
            </div>
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
                    item.to === "/reception" ? path === item.to : path.startsWith(item.to);
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
            <p className="mt-1 text-xs text-muted-foreground">
              Browse the admin docs or contact platform support.
            </p>
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
