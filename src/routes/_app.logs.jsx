import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Filter, FileDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, toArray } from "@/lib/api";
import { useApiResource } from "@/hooks/use-api-resource";
import { normalizeLog } from "@/lib/api-normalizers";
export const Route = createFileRoute("/_app/logs")({
  component: LogsPage,
  head: () => ({ meta: [{ title: "Audit Logs — Medisuite" }] }),
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
function LogsPage() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({ user: "all", module: "all", action: "all" });
  const [q, setQ] = useState("");
  const {
    data: auditLogs,
    loading,
    error,
  } = useApiResource(async () => toArray(await api.logs.audit()).map(normalizeLog), [], []);
  const users = [...new Set(auditLogs.map((log) => log.user).filter(Boolean))];
  const modules = [...new Set(auditLogs.map((log) => log.module).filter(Boolean))];
  const actions = [...new Set(auditLogs.map((log) => log.action).filter(Boolean))];
  const chips = [
    filters.user !== "all" ? `User: ${filters.user}` : "",
    filters.module !== "all" ? `Module: ${filters.module}` : "",
    filters.action !== "all" ? `Action: ${filters.action}` : "",
  ].filter(Boolean);
  const filtered = auditLogs.filter((l) => {
    const query = q.trim().toLowerCase();
    const matchesSearch =
      !query || [l.action, l.user, l.module, l.time, l.ip].join(" ").toLowerCase().includes(query);
    return (
      matchesSearch &&
      (filters.user === "all" || l.user === filters.user) &&
      (filters.module === "all" || l.module === filters.module) &&
      (filters.action === "all" || l.action === filters.action)
    );
  });
  return (
    <>
      <PageHeader
        title="Audit Logs"
        description="Track every admin action across the platform."
        actions={
          <Button variant="outline" className="gap-1.5">
            <FileDown className="h-4 w-4" />
            Export
          </Button>
        }
      />

      <div className="rounded-xl border border-border bg-card shadow-card">
        <div className="space-y-3 border-b border-border p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative max-w-sm flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search logs…"
                className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setFiltersOpen((open) => !open)}
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>
          {filtersOpen && (
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
          {chips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Active filters:</span>
              {chips.map((c) => (
                <button
                  key={c}
                  onClick={() => removeChip(c, setFilters)}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium hover:bg-accent"
                >
                  {c}
                  <X className="h-3 w-3" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          {error && (
            <div className="border-b border-border p-4 text-sm text-destructive">{error}</div>
          )}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">Action</th>
                <th className="px-5 py-3 font-medium">Module</th>
                <th className="px-5 py-3 font-medium">Timestamp</th>
                <th className="px-5 py-3 font-medium">IP Address</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l, i) => (
                <tr
                  key={i}
                  className="border-b border-border last:border-0 transition-colors hover:bg-secondary/40"
                >
                  <td className="px-5 py-3.5 font-medium">{l.user}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{l.action}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-medium ${moduleColors[l.module] ?? "bg-muted"}`}
                    >
                      {l.module}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">{l.time}</td>
                  <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">{l.ip}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                    {loading ? "Loading audit logs..." : "No audit logs found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
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

function removeChip(chip, setFilters) {
  if (chip.startsWith("User: ")) setFilters((current) => ({ ...current, user: "all" }));
  if (chip.startsWith("Module: ")) setFilters((current) => ({ ...current, module: "all" }));
  if (chip.startsWith("Action: ")) setFilters((current) => ({ ...current, action: "all" }));
}
