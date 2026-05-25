import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { getAuthToken, getAuthUser } from "@/lib/api";
import { getRoleHomePath, normalizeRole } from "@/lib/auth-routing";

function resolveHomeRoute() {
  const token = getAuthToken();
  const user = getAuthUser();
  const role = normalizeRole(user?.role, user?.email ?? user?.Email);
  if (token || user) {
    return getRoleHomePath(role) || "/login";
  }
  return "/login";
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
