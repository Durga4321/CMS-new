import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { getAuthUser, hasAuthSession } from "@/lib/api";
import {
  getRoleHomePath,
  isSharedAppPath,
  isSuperAdminPath,
  normalizeRole,
} from "@/lib/auth-routing";

export const Route = createFileRoute("/_app")({
  beforeLoad: ({ location }) => {
    if (typeof window === "undefined") return;
    if (!hasAuthSession()) {
      throw redirect({ to: "/login" });
    }

    const user = getAuthUser();
    const role = normalizeRole(user?.role, user?.email ?? user?.Email);
    const path = String(location.pathname ?? "");
    const homePath = getRoleHomePath(role);

    if (!homePath) {
      throw redirect({ to: "/login" });
    }

    if (role === "receptionist" && !path.startsWith("/reception") && !isSharedAppPath(path)) {
      throw redirect({ to: "/reception" });
    }

    if (role === "doctor" && !path.startsWith("/doctor") && !isSharedAppPath(path)) {
      throw redirect({ to: "/doctor" });
    }

    if (role !== "superadmin" && isSuperAdminPath(path)) {
      throw redirect({ to: homePath });
    }

    if (role === "admin" && (path === "/dashboard" || path.startsWith("/dashboard/"))) {
      throw redirect({ to: "/admin-dashboard" });
    }

    if (role === "superadmin" && path.startsWith("/admin-dashboard")) {
      throw redirect({ to: "/dashboard" });
    }

    if (role === "admin" && (path === "/reports" || path.startsWith("/reports/"))) {
      throw redirect({ to: "/admin-reports" });
    }

    if (role === "superadmin" && path.startsWith("/admin-reports")) {
      throw redirect({ to: "/reports" });
    }

    if (role !== "receptionist" && path.startsWith("/reception")) {
      throw redirect({ to: role === "superadmin" ? "/dashboard" : "/admin-dashboard" });
    }

    const isDoctorPath = path === "/doctor" || path.startsWith("/doctor/");
    if (role !== "doctor" && isDoctorPath) {
      throw redirect({
        to:
          role === "receptionist"
            ? "/reception"
            : role === "superadmin"
              ? "/dashboard"
              : "/admin-dashboard",
      });
    }
  },
  component: () => (
    <>
      <AppShell>
        <Outlet />
      </AppShell>
      <Toaster position="top-right" />
    </>
  ),
});
