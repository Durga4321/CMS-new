import { createFileRoute, redirect } from "@tanstack/react-router";
import { getAuthUser } from "@/lib/api";
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    const role = getAuthUser()?.role?.toLowerCase?.();
    throw redirect({ to: role === "receptionist" ? "/reception" : "/dashboard" });
  },
});
