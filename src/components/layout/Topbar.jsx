import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Search,
  Menu,
  ChevronRight,
  Settings as SettingsIcon,
  LogOut,
  User,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { api, clearAuthToken, getAuthUser, toArray } from "@/lib/api";
import { normalizeNotification } from "@/lib/api-normalizers";
import { cn } from "@/lib/utils";
const titleMap = {
  "/dashboard": "Dashboard",
  "/clinics": "Clinic Management",
  "/admins": "Admin Management",
  "/users": "User Management",
  "/roles": "Roles & Permissions",
  "/reports": "Reports & Analytics",
  "/logs": "Audit Logs",
  "/notifications": "Notifications",
  "/profile": "Profile",
  "/settings": "System Settings",
  "/reception": "Reception Dashboard",
};

const adminSearchModules = [
  {
    label: "Dashboard",
    description: "Overview and platform metrics",
    to: "/dashboard",
    terms: ["home", "overview", "dashboard"],
  },
  {
    label: "Clinic Management",
    description: "Clinics, locations, and clinic records",
    to: "/clinics",
    terms: ["clinic", "clinics", "clinic admin", "clinic management", "location", "locations"],
  },
  {
    label: "Admin Management",
    description: "Clinic admins and access",
    to: "/admins",
    terms: ["admin", "admins", "administrator", "clinic admin", "admin management"],
  },
  {
    label: "User Management",
    description: "Users and patient accounts",
    to: "/users",
    terms: ["user", "users", "patient", "patients", "user management"],
  },
  {
    label: "Roles & Permissions",
    description: "Roles and module permissions",
    to: "/roles",
    terms: ["role", "roles", "permission", "permissions", "access"],
  },
  {
    label: "Reports & Analytics",
    description: "Reports, analytics, and exports",
    to: "/reports",
    terms: ["report", "reports", "analytics", "insights"],
  },
  {
    label: "Audit Logs",
    description: "Admin activity and audit trail",
    to: "/logs",
    terms: ["log", "logs", "audit", "activity"],
  },
  {
    label: "Notifications",
    description: "Announcements and notification history",
    to: "/notifications",
    terms: ["notification", "notifications", "message", "messages"],
  },
  {
    label: "System Settings",
    description: "Platform settings and configuration",
    to: "/settings",
    terms: ["setting", "settings", "system", "configuration", "config"],
  },
];

const receptionistSearchModules = [
  {
    label: "Reception Dashboard",
    description: "Front desk overview",
    to: "/reception",
    terms: ["reception", "dashboard", "front desk", "overview"],
  },
  {
    label: "Patients",
    description: "Open the patient management panel",
    to: "/reception/patients",
    terms: ["patient", "patients", "add patient", "registration", "register"],
  },
  {
    label: "Book Appointment",
    description: "Open the appointment booking panel",
    to: "/reception/appointments",
    terms: ["appointment", "appointments", "booking", "book appointment", "schedule"],
  },
  {
    label: "Billing",
    description: "Open the billing panel",
    to: "/reception/billing",
    terms: ["bill", "bills", "billing", "payment", "invoice"],
  },
];

const SUPER_ADMIN_EMAIL = "superadmin@gmail.com";
const READ_NOTIFICATIONS_KEY = "clinic_command_center_read_notifications";

function getScore(module, query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return 0;
  const haystack = [module.label, module.description, ...module.terms].join(" ").toLowerCase();
  const terms = module.terms.map((term) => term.toLowerCase());

  if (module.label.toLowerCase() === normalized || terms.includes(normalized)) return 100;
  if (module.label.toLowerCase().startsWith(normalized)) return 90;
  if (terms.some((term) => term.startsWith(normalized))) return 80;
  if (haystack.includes(normalized)) return 70;

  return normalized.split(/\s+/).filter((part) => haystack.includes(part)).length;
}

export function Topbar({ onMenu }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const segments = path.split("/").filter(Boolean);
  const title = titleMap[`/${segments[0] ?? ""}`] ?? "Overview";
  const authUser = getAuthUser();
  const role = authUser?.role?.toLowerCase?.() ?? "admin";
  const isReceptionist = role === "receptionist";
  const storedName = authUser?.name ?? authUser?.Name ?? authUser?.fullName ?? authUser?.FullName;
  const email = authUser?.email ?? authUser?.Email ?? "";
  const isSuperAdmin = role === "superadmin" || email.toLowerCase() === SUPER_ADMIN_EMAIL;
  const accountName =
    isSuperAdmin && (!storedName || storedName.toLowerCase() === "superadmin")
      ? "DP"
      : storedName || (isReceptionist ? "Reception Desk" : "Admin");
  const accountRole = formatRole(authUser?.role ?? (isReceptionist ? "receptionist" : "admin"));
  const accountInitials = getInitials(accountName);
  const [openNotif, setOpenNotif] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef(null);
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const searchModules = isReceptionist ? receptionistSearchModules : adminSearchModules;
  const searchResults = useMemo(() => {
    return searchModules
      .map((module) => ({ ...module, score: getScore(module, searchQuery) }))
      .filter((module) => module.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [searchModules, searchQuery]);
  const showSearchResults = searchFocused && searchQuery.trim().length > 0;

  const openModule = (module) => {
    navigate({ to: module.to, search: module.search });
    setSearchQuery("");
    setSearchFocused(false);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    if (searchResults[0]) openModule(searchResults[0]);
  };

  const handleNotificationsOpenChange = (nextOpen) => {
    setOpenNotif(nextOpen);
    if (nextOpen) {
      markNotificationsRead(notifications);
    }
  };

  const markNotificationsRead = (items) => {
    const readKeys = getStoredReadNotificationKeys();
    items.forEach((notification) => readKeys.add(getNotificationKey(notification)));
    storeReadNotificationKeys(readKeys);
    setNotifications((currentNotifications) =>
      currentNotifications.map((notification) =>
        readKeys.has(getNotificationKey(notification))
          ? { ...notification, read: true }
          : notification,
      ),
    );
  };

  const openNotification = (notification) => {
    markNotificationsRead([notification]);
    setOpenNotif(false);
    navigate({ to: "/notifications" });
  };

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!searchRef.current?.contains(event.target)) setSearchFocused(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (isReceptionist) {
      setNotifications([
        {
          title: "Front desk ready",
          message: "Static reception flow is available for patient, appointment, and billing work.",
          time: "Now",
          type: "info",
          read: false,
        },
      ]);
      return;
    }
    let mounted = true;
    api.notifications
      .list()
      .then((response) => {
        if (mounted)
          setNotifications(applyStoredReadState(toArray(response).map(normalizeNotification)));
      })
      .catch(() => {
        if (mounted) setNotifications([]);
      });
    return () => {
      mounted = false;
    };
  }, [isReceptionist]);
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
        <button
          onClick={onMenu}
          className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-accent lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="hidden flex-col md:flex">
          <h1 className="text-base font-semibold leading-none tracking-tight">{title}</h1>
          <nav className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Link
              to={isReceptionist ? "/reception" : "/dashboard"}
              className="hover:text-foreground"
            >
              Home
            </Link>
            {segments.map((seg, i) => (
              <span key={i} className="flex items-center gap-1">
                <ChevronRight className="h-3 w-3" />
                <span className="capitalize text-foreground/80">{seg.replace("-", " ")}</span>
              </span>
            ))}
          </nav>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <form ref={searchRef} onSubmit={handleSearchSubmit} className="relative hidden md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onFocus={() => setSearchFocused(true)}
              placeholder={
                isReceptionist
                  ? "Search patients, doctors, bills..."
                  : "Search clinics, admins, users..."
              }
              className="h-9 w-72 rounded-lg border border-input bg-card pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
            {showSearchResults && (
              <div className="absolute right-0 top-11 z-30 w-80 overflow-hidden rounded-lg border border-border bg-popover shadow-elev">
                {searchResults.length > 0 ? (
                  <div className="py-1">
                    {searchResults.map((module) => (
                      <button
                        key={`${module.to}-${module.label}`}
                        type="button"
                        onClick={() => openModule(module)}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent focus:bg-accent focus:outline-none"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-popover-foreground">
                            {module.label}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {module.description}
                          </span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-3 py-3 text-sm text-muted-foreground">
                    No matching module found.
                  </div>
                )}
              </div>
            )}
          </form>

          <DropdownMenu open={openNotif} onOpenChange={handleNotificationsOpenChange}>
            <DropdownMenuTrigger asChild>
              <button className="relative grid h-9 w-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                    {unreadCount}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="text-sm font-semibold">Notifications</div>
                <Link
                  to="/notifications"
                  className="text-xs text-primary hover:underline"
                  onClick={() => {
                    markNotificationsRead(notifications);
                    setOpenNotif(false);
                  }}
                >
                  View all
                </Link>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((n, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => openNotification(n)}
                    className={cn(
                      "flex w-full gap-3 border-b px-4 py-3 text-left last:border-0 transition-colors hover:bg-accent focus:bg-accent focus:outline-none",
                      !n.read && "bg-primary-soft/40",
                    )}
                  >
                    {!n.read ? (
                      <div
                        className={cn(
                          "mt-1 h-2 w-2 shrink-0 rounded-full",
                          n.type === "success" && "bg-success",
                          n.type === "info" && "bg-info",
                          n.type === "warning" && "bg-warning",
                        )}
                      />
                    ) : (
                      <div className="mt-1 h-2 w-2 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{n.title}</div>
                      <div className="line-clamp-2 text-xs text-muted-foreground">{n.message}</div>
                      <div className="mt-1 text-[11px] text-muted-foreground">{n.time}</div>
                    </div>
                  </button>
                ))}
                {notifications.length === 0 && (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    No notifications found.
                  </div>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg border border-border bg-card px-1.5 py-1 text-left transition-colors hover:bg-accent">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-gradient-primary text-xs text-primary-foreground">
                    {accountInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden pr-2 sm:block">
                  <div className="text-xs font-semibold leading-tight">{accountName}</div>
                  <div className="text-[11px] text-muted-foreground">{accountRole}</div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings">
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/login" onClick={clearAuthToken} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

function formatRole(value) {
  const role = String(value ?? "").toLowerCase();
  if (role.includes("superadmin") || role.includes("super_admin")) return "Super Admin";
  if (role.includes("reception")) return "Receptionist";
  if (role.includes("doctor")) return "Doctor";
  if (role.includes("patient")) return "Patient";
  if (role.includes("admin")) return "Admin";
  return "User";
}

function getInitials(name) {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getNotificationKey(notification) {
  return String(
    notification?.id ??
      notification?._id ??
      `${notification?.title ?? ""}|${notification?.message ?? ""}|${notification?.time ?? ""}`,
  );
}

function getStoredReadNotificationKeys() {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(window.localStorage.getItem(READ_NOTIFICATIONS_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}

function storeReadNotificationKeys(readKeys) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify([...readKeys]));
}

function applyStoredReadState(notifications) {
  const readKeys = getStoredReadNotificationKeys();
  return notifications.map((notification) =>
    readKeys.has(getNotificationKey(notification)) ? { ...notification, read: true } : notification,
  );
}
