import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Activity, FileDown, Filter, LogIn, Search, ScrollText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, getStoredLoginHistory, getStoredSystemLogs, readField, toArray } from "@/lib/api";
import { useApiResource } from "@/hooks/use-api-resource";
import { normalizeLog, text } from "@/lib/api-normalizers";
import { exportCsv } from "@/lib/export-utils";

export const Route = createFileRoute("/_app/logs")({
  component: LogsPage,
  head: () => ({ meta: [{ title: "Audit Logs - Medisuite" }] }),
});

const moduleColors = {
  Clinics: "bg-info/10 text-info",
  Users: "bg-success/10 text-success",
  Settings: "bg-warning/15 text-warning-foreground",
  Auth: "bg-primary-soft text-primary",
  Reports: "bg-accent text-accent-foreground",
  Roles: "bg-destructive/10 text-destructive",
  System: "bg-muted text-muted-foreground",
};

const views = [
  { value: "audit", label: "Audit Logs", icon: ScrollText },
  { value: "login", label: "Login History", icon: LogIn },
];

function LogsPage() {
  const [view, setView] = useState("audit");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({ user: "all", module: "all", action: "all" });
  const [q, setQ] = useState("");
  const { data, loading, error } = useApiResource(loadLogData, emptyLogData);

  const auditLogs = data.auditLogs;
  const loginHistory = data.loginHistory;
  const users = useMemo(() => unique(auditLogs.map((log) => log.user)), [auditLogs]);
  const modules = useMemo(() => unique(auditLogs.map((log) => log.module)), [auditLogs]);
  const actions = useMemo(() => unique(auditLogs.map((log) => log.action)), [auditLogs]);
  const chips = [
    filters.user !== "all" ? `User: ${filters.user}` : "",
    filters.module !== "all" ? `Module: ${filters.module}` : "",
    filters.action !== "all" ? `Action: ${filters.action}` : "",
  ].filter(Boolean);

  const filteredAuditLogs = auditLogs.filter((log) => {
    const query = q.trim().toLowerCase();
    const matchesSearch =
      !query ||
      [log.user, log.action, log.module, log.time, log.ip].join(" ").toLowerCase().includes(query);
    return (
      matchesSearch &&
      (filters.user === "all" || log.user === filters.user) &&
      (filters.module === "all" || log.module === filters.module) &&
      (filters.action === "all" || log.action === filters.action)
    );
  });

  const filteredLoginHistory = loginHistory.filter((log) => {
    const query = q.trim().toLowerCase();
    return (
      !query ||
      [log.name, log.role, log.email, log.time, log.ip].join(" ").toLowerCase().includes(query)
    );
  });

  const exportLogs = () => {
    if (view === "login") {
      exportCsv(
        "login-history.csv",
        ["Name", "Role", "Email", "Timestamp", "IP Address"],
        filteredLoginHistory.map((log) => [log.name, log.role, log.email, log.time, log.ip]),
      );
      return;
    }
    exportCsv(
      "audit-logs.csv",
      ["User", "Action", "Module", "Timestamp", "IP Address"],
      filteredAuditLogs.map((log) => [log.user, log.action, log.module, log.time, log.ip]),
    );
  };

  return (
    <>
      <PageHeader
        title="Audit Logs"
        description="Track system actions, stored logs and user login history."
        actions={
          <Button variant="outline" className="gap-1.5" onClick={exportLogs}>
            <FileDown className="h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        {views.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setView(option.value)}
            className={`rounded-xl border p-4 text-left shadow-card transition-colors focus:outline-none focus:ring-2 focus:ring-ring/20 ${
              view === option.value
                ? "border-primary bg-primary-soft text-primary"
                : "border-border bg-card hover:bg-secondary/40"
            }`}
          >
            <option.icon className="h-5 w-5" />
            <div className="mt-3 font-semibold">{option.label}</div>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card">
        <div className="space-y-3 border-b border-border p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative max-w-sm flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder={view === "login" ? "Search login history..." : "Search audit logs..."}
                className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>
            {view === "audit" && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setFiltersOpen((open) => !open)}
              >
                <Filter className="h-4 w-4" />
                Filters
              </Button>
            )}
          </div>

          {view === "audit" && filtersOpen && (
            <div className="grid gap-3 rounded-lg border border-border bg-secondary/40 p-3 md:grid-cols-4">
              <FilterSelect
                label="User"
                value={filters.user}
                options={users}
                onChange={(value) => setFilters((current) => ({ ...current, user: value }))}
              />
              <FilterSelect
                label="Module"
                value={filters.module}
                options={modules}
                onChange={(value) => setFilters((current) => ({ ...current, module: value }))}
              />
              <FilterSelect
                label="Action"
                value={filters.action}
                options={actions}
                onChange={(value) => setFilters((current) => ({ ...current, action: value }))}
              />
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setFilters({ user: "all", module: "all", action: "all" })}
                >
                  Clear filters
                </Button>
              </div>
            </div>
          )}

          {view === "audit" && chips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Active filters:</span>
              {chips.map((chip) => (
                <button
                  key={chip}
                  onClick={() => removeChip(chip, setFilters)}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium hover:bg-accent"
                >
                  {chip}
                  <X className="h-3 w-3" />
                </button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="border-b border-border p-4 text-sm text-destructive">{error}</div>
        )}

        {view === "login" ? (
          <LoginHistoryTable logs={filteredLoginHistory} loading={loading} />
        ) : (
          <AuditLogTable logs={filteredAuditLogs} loading={loading} />
        )}
      </div>
    </>
  );
}

const emptyLogData = { auditLogs: [], loginHistory: [] };

async function loadLogData() {
  const [auditResponse, loginResponse] = await Promise.all([
    readOptional(api.logs.audit),
    readOptional(api.logs.loginHistory),
  ]);

  return {
    auditLogs: mergeRows([
      ...toArray(auditResponse).map(normalizeLog),
      ...getStoredSystemLogs().map(normalizeStoredAuditLog),
    ]),
    loginHistory: mergeRows([
      ...toArray(loginResponse).map(normalizeLoginHistory),
      ...getStoredLoginHistory().map(normalizeLoginHistory),
    ]),
  };
}

async function readOptional(loader) {
  try {
    return await loader();
  } catch {
    return [];
  }
}

function AuditLogTable({ logs, loading }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="px-5 py-3 font-medium">User</th>
            <th className="px-5 py-3 font-medium">Action</th>
            <th className="px-5 py-3 font-medium">System Actions</th>
            <th className="px-5 py-3 font-medium">Timestamp</th>
            <th className="px-5 py-3 font-medium">IP Address</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr
              key={log.id}
              className="border-b border-border last:border-0 transition-colors hover:bg-secondary/40"
            >
              <td className="px-5 py-3.5 font-medium">{log.user}</td>
              <td className="px-5 py-3.5 text-muted-foreground">{log.action}</td>
              <td className="px-5 py-3.5">
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
                    moduleColors[log.module] ?? "bg-muted text-muted-foreground"
                  }`}
                >
                  <Activity className="h-3 w-3" />
                  {log.module}
                </span>
              </td>
              <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">{log.time}</td>
              <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">{log.ip}</td>
            </tr>
          ))}
          {logs.length === 0 && (
            <tr>
              <td colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                {loading ? "Loading audit logs..." : "No audit logs found."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function LoginHistoryTable({ logs, loading }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="px-5 py-3 font-medium">Name</th>
            <th className="px-5 py-3 font-medium">Role</th>
            <th className="px-5 py-3 font-medium">Email</th>
            <th className="px-5 py-3 font-medium">Timestamp</th>
            <th className="px-5 py-3 font-medium">IP Address</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr
              key={log.id}
              className="border-b border-border last:border-0 transition-colors hover:bg-secondary/40"
            >
              <td className="px-5 py-3.5 font-medium">{log.name}</td>
              <td className="px-5 py-3.5 text-muted-foreground">{log.role}</td>
              <td className="px-5 py-3.5 text-muted-foreground">{log.email}</td>
              <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">{log.time}</td>
              <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">{log.ip}</td>
            </tr>
          ))}
          {logs.length === 0 && (
            <tr>
              <td colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                {loading ? "Loading login history..." : "No login history found."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 bg-card">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All {label.toLowerCase()}s</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function normalizeStoredAuditLog(log, index) {
  return {
    ...normalizeLog(log, index),
    id: text(log.id ?? `stored-audit-${index}`),
    module: text(log.module, "System"),
    ip: text(log.ip, "-"),
  };
}

function normalizeLoginHistory(log, index = 0) {
  const name =
    readField(log, ["name", "Name", "fullName", "FullName", "user", "username"], "") ||
    readField(log.user, ["name", "Name", "fullName", "email"], "User");
  const role =
    readField(log, ["role", "roleName", "userRole"], "") ||
    readField(log.user, ["role", "roleName", "userRole"], "User");
  const email =
    readField(log, ["email", "Email", "mail"], "") ||
    readField(log.user, ["email", "Email", "username"], "");
  return {
    id: text(log.id ?? log._id ?? `${email || name}-${log.time ?? index}`),
    name: text(name, "User"),
    role: text(role, "User"),
    email: text(email, "-"),
    time: formatTimestamp(log.time ?? log.timestamp ?? log.createdAt ?? log.loginAt),
    ip: text(log.ip ?? log.ipAddress ?? log.ip_address, "-"),
  };
}

function mergeRows(rows) {
  const byKey = new Map();
  rows.forEach((row) => {
    const key = String(row.id ?? `${row.email ?? row.user}-${row.action ?? ""}-${row.time}`);
    byKey.set(key, row);
  });
  return [...byKey.values()].sort((a, b) => Date.parse(b.time) - Date.parse(a.time));
}

function formatTimestamp(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function removeChip(chip, setFilters) {
  if (chip.startsWith("User: ")) setFilters((current) => ({ ...current, user: "all" }));
  if (chip.startsWith("Module: ")) setFilters((current) => ({ ...current, module: "all" }));
  if (chip.startsWith("Action: ")) setFilters((current) => ({ ...current, action: "all" }));
}
