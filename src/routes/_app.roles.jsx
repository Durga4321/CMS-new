import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, KeySquare, Users, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { api, toArray } from "@/lib/api";
import { useApiResource } from "@/hooks/use-api-resource";
import { normalizeRole, permissionActions, permissionModules } from "@/lib/api-normalizers";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const allowedRoles = [
  { label: "Admin", value: "Admin" },
  { label: "Doctor", value: "Doctor" },
  { label: "Patient", value: "Patient" },
  { label: "Receptionist", value: "Receptionist" },
];

export const Route = createFileRoute("/_app/roles")({
  component: RolesPage,
  head: () => ({ meta: [{ title: "Roles & Permissions - Medisuite" }] }),
});

function RolesPage() {
  const [activeRole, setActiveRole] = useState("");
  const [roleDialog, setRoleDialog] = useState(null);
  const [permissionDraft, setPermissionDraft] = useState({});
  const {
    data: roles,
    setData: setRoles,
    loading,
    error,
    reload,
  } = useApiResource(async () => toArray(await api.roles.list()).map(normalizeRole), []);

  const selectedRole = roles.find((role) => role.id === activeRole) ?? roles[0];
  const currentPermissions = useMemo(
    () => permissionDraft[selectedRole?.id] ?? makePermissionMatrix(selectedRole?.permissions),
    [permissionDraft, selectedRole],
  );

  useEffect(() => {
    if (!activeRole && roles[0]) setActiveRole(roles[0].id);
  }, [activeRole, roles]);

  useEffect(() => {
    setPermissionDraft((current) => {
      const next = { ...current };
      for (const role of roles) {
        if (!next[role.id]) next[role.id] = makePermissionMatrix(role.permissions);
      }
      return next;
    });
  }, [roles]);

  const togglePermission = (moduleName, actionName, checked) => {
    if (!selectedRole) return;
    const action = actionName.toLowerCase();
    setPermissionDraft((current) => {
      const rolePermissions = current[selectedRole.id] ?? makePermissionMatrix(selectedRole.permissions);
      return {
        ...current,
        [selectedRole.id]: {
          ...rolePermissions,
          [moduleName]: {
            ...(rolePermissions[moduleName] ?? {}),
            [action]: checked === true,
          },
        },
      };
    });
  };

  const resetPermissions = () => {
    if (!selectedRole) return;
    setPermissionDraft((current) => ({
      ...current,
      [selectedRole.id]: makePermissionMatrix(selectedRole.permissions),
    }));
  };

  const savePermissions = async () => {
    if (!selectedRole) return;
    const permissions = currentPermissions;
    try {
      await saveRolePermissions(selectedRole.id, permissions);
      setRoles((current) =>
        current.map((role) => (role.id === selectedRole.id ? { ...role, permissions } : role)),
      );
      toast.success("Permissions saved");
      reload();
    } catch (err) {
      toast.error(err?.message ?? "Unable to save permissions");
    }
  };

  const saveRole = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    if (!name) {
      toast.error("Role name is required");
      return;
    }
    if (!isAllowedRole(name)) {
      toast.error("Role must be Admin, Doctor, Patient, or Receptionist");
      return;
    }

    const basePayload = {
      name,
      roleName: name,
      description,
    };

    try {
      if (roleDialog?.mode === "edit" && roleDialog.role) {
        const updated = await api.roles.update(roleDialog.role.id, basePayload);
        const normalized = normalizeRole(updated?.data ?? updated ?? { ...roleDialog.role, ...basePayload });
        setRoles((current) =>
          current.map((role) =>
            role.id === roleDialog.role.id
              ? { ...role, ...normalized, permissions: role.permissions }
              : role,
          ),
        );
        setActiveRole(roleDialog.role.id);
        toast.success("Role updated");
      } else {
        const permissions = makePermissionMatrix();
        const created = await api.roles.create({ ...basePayload, permissions });
        const normalized = normalizeRole(created?.data ?? created ?? { ...basePayload, permissions });
        setRoles((current) => [normalized, ...current]);
        setPermissionDraft((current) => ({ ...current, [normalized.id]: permissions }));
        setActiveRole(normalized.id);
        toast.success("Role created");
      }
      setRoleDialog(null);
      reload();
    } catch (err) {
      toast.error(err?.message ?? "Unable to save role");
    }
  };

  return (
    <>
      <PageHeader
        title="Roles & Permissions"
        description="Define roles and configure granular module access."
        actions={
          <Button className="gap-1.5" onClick={() => setRoleDialog({ mode: "create" })}>
            <Plus className="h-4 w-4" />
            Create role
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <div className="rounded-xl border border-border bg-card p-3 shadow-card">
          <div className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Roles ({roles.length})
          </div>
          {error && <div className="px-2 py-3 text-sm text-destructive">{error}</div>}
          <ul className="space-y-1">
            {roles.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => setActiveRole(r.id)}
                  className={cn(
                    "w-full rounded-lg p-3 text-left transition-colors",
                    selectedRole?.id === r.id ? "bg-primary-soft" : "hover:bg-secondary",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-medium">
                      <KeySquare
                        className={cn(
                          "h-4 w-4",
                          selectedRole?.id === r.id ? "text-primary" : "text-muted-foreground",
                        )}
                      />
                      {r.name}
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {r.users}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.description}</p>
                </button>
              </li>
            ))}
            {roles.length === 0 && (
              <li className="px-2 py-8 text-center text-sm text-muted-foreground">
                {loading ? "Loading roles..." : "No roles found."}
              </li>
            )}
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-card">
          <div className="flex items-center justify-between border-b border-border p-5">
            <div>
              <h3 className="text-base font-semibold">
                {selectedRole?.name ?? "Role"} permissions
              </h3>
              <p className="text-xs text-muted-foreground">Configure what this role can access.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={!selectedRole}
              onClick={() => setRoleDialog({ mode: "edit", role: selectedRole })}
            >
              <Edit2 className="h-4 w-4" />
              Edit role
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Module</th>
                  {permissionActions.map((a) => (
                    <th key={a} className="px-4 py-3 text-center font-medium">
                      {a}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissionModules.map((moduleName) => (
                  <tr key={moduleName} className="border-b border-border last:border-0">
                    <td className="px-5 py-3.5 font-medium">{moduleName}</td>
                    {permissionActions.map((actionName) => {
                      const action = actionName.toLowerCase();
                      return (
                        <td key={actionName} className="px-4 py-3.5 text-center">
                          <Checkbox
                            checked={Boolean(currentPermissions?.[moduleName]?.[action])}
                            disabled={!selectedRole}
                            onCheckedChange={(checked) =>
                              togglePermission(moduleName, actionName, checked)
                            }
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2 border-t border-border p-4">
            <Button variant="outline" disabled={!selectedRole} onClick={resetPermissions}>
              Reset
            </Button>
            <Button disabled={!selectedRole} onClick={savePermissions}>
              Save changes
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={!!roleDialog} onOpenChange={(open) => !open && setRoleDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{roleDialog?.mode === "edit" ? "Edit role" : "Create role"}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {roleDialog?.mode === "edit"
                ? "Update the role name and description."
                : "Create a role, then assign module permissions."}
            </p>
          </DialogHeader>
          <form onSubmit={saveRole} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Role name</label>
              <select
                name="name"
                defaultValue={allowedRoleValue(roleDialog?.role?.name)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                required
              >
                <option value="" disabled>
                  Select role
                </option>
                {allowedRoles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Description</label>
              <textarea
                name="description"
                defaultValue={roleDialog?.role?.description ?? ""}
                className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                placeholder="Describe what this role can do"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setRoleDialog(null)}>
                Cancel
              </Button>
              <Button type="submit">
                {roleDialog?.mode === "edit" ? "Save role" : "Create role"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function allowedRoleValue(value) {
  const normalized = normalizeRoleName(value);
  return allowedRoles.find((role) => normalizeRoleName(role.value) === normalized)?.value ?? "";
}

function isAllowedRole(value) {
  return Boolean(allowedRoleValue(value));
}

function normalizeRoleName(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function makePermissionMatrix(source = {}) {
  return permissionModules.reduce((matrix, moduleName) => {
    matrix[moduleName] = permissionActions.reduce((actions, actionName) => {
      actions[actionName.toLowerCase()] = readPermission(source, moduleName, actionName);
      return actions;
    }, {});
    return matrix;
  }, {});
}

function readPermission(source, moduleName, actionName) {
  const action = actionName.toLowerCase();
  const moduleKeys = [moduleName, moduleName.toLowerCase()];
  if (Array.isArray(source)) {
    return source.some((item) => {
      if (typeof item === "string") return item.toLowerCase() === `${moduleName}.${action}`.toLowerCase();
      const itemModule = String(item.module ?? item.name ?? item.resource ?? "").toLowerCase();
      const actions = item.actions ?? item.permissions ?? item.allowedActions ?? [];
      return itemModule === moduleName.toLowerCase() && hasAction(actions, action);
    });
  }
  if (!source || typeof source !== "object") return false;
  for (const key of moduleKeys) {
    const permissions = source[key];
    if (hasAction(permissions, action)) return true;
  }
  return false;
}

function hasAction(value, action) {
  if (Array.isArray(value)) return value.map((item) => String(item).toLowerCase()).includes(action);
  if (value && typeof value === "object") return Boolean(value[action] ?? value[action.toUpperCase()]);
  return Boolean(value);
}

function toApiPermissions(matrix) {
  return permissionModules.reduce((payload, moduleName) => {
    payload[moduleName] = permissionActions
      .map((actionName) => actionName.toLowerCase())
      .filter((action) => matrix?.[moduleName]?.[action]);
    return payload;
  }, {});
}

async function saveRolePermissions(roleId, matrix) {
  const permissions = toApiPermissions(matrix);
  try {
    return await api.roles.updatePermissions(roleId, { permissions });
  } catch (firstError) {
    try {
      return await api.roles.updatePermissions(roleId, permissions);
    } catch {
      try {
        return await api.roles.update(roleId, { permissions });
      } catch {
        throw firstError;
      }
    }
  }
}
