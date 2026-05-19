import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Toaster } from "@/components/ui/sonner";
export const Route = createFileRoute("/_app")({
  component: () => (
    <>
      <AppShell>
        <Outlet />
      </AppShell>
      <Toaster position="top-right" />
    </>
  ),
});
