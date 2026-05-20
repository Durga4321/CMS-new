import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { getAuthUser } from "@/lib/api";

function normalizeRole(role) {
  const normalized = String(role ?? "").toLowerCase().trim();
  if (normalized.includes("reception")) return "receptionist";
  if (normalized.includes("doctor")) return "doctor";
  if (normalized.includes("patient")) return "patient";
  if (normalized.includes("admin")) return "admin";
  return "";
}

function resolveHomeRoute() {
  const user = getAuthUser();
  const role = normalizeRole(user?.role);
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
