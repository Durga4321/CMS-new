import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { getAuthUser, hasAuthSession } from "@/lib/api";

function normalizeRole(role) {
  const normalized = String(role ?? "").toLowerCase().trim();
  if (normalized.includes("reception")) return "receptionist";
  if (normalized.includes("doctor")) return "doctor";
  if (normalized.includes("patient")) return "patient";
  if (normalized.includes("admin")) return "admin";
  return "";
}

export const Route = createFileRoute("/_app")({
  beforeLoad: ({ location }) => {
    if (typeof window === "undefined") return;
    if (!hasAuthSession()) {
      throw redirect({
        to: "/login",
        search: { redirect: `${location.pathname}${location.search}` },
      });
    }

    const user = getAuthUser();
    const role = normalizeRole(user?.role);
    const path = String(location.pathname ?? "");

    if (role === "receptionist" && !path.startsWith("/reception") && !path.startsWith("/profile") && !path.startsWith("/notifications")) {
      throw redirect({ to: "/reception" });
    }

    if (role !== "receptionist" && path.startsWith("/reception")) {
      throw redirect({ to: "/dashboard" });
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
