import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { getAuthUser } from "@/lib/api";

function resolveHomeRoute() {
  const user = getAuthUser();
  const role = String(user?.role ?? "").toLowerCase();
  return role === "receptionist" ? "/reception" : user ? "/dashboard" : "/login";
}

function RedirectRoot() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate({ to: resolveHomeRoute() });
  }, [navigate]);

  return null;
}

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    throw redirect({ to: resolveHomeRoute() });
  },
  component: RedirectRoot,
});
