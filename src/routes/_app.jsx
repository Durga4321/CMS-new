import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { getAuthUser, hasAuthSession } from "@/lib/api";
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
    const role = String(user?.role ?? "").toLowerCase();
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
