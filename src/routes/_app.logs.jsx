import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Filter, FileDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
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
  const [chips, setChips] = useState([]);
  const [q, setQ] = useState("");
  const {
    data: auditLogs,
    loading,
    error,
  } = useApiResource(async () => toArray(await api.logs.audit()).map(normalizeLog), [], []);
  const filtered = auditLogs.filter(
    (l) =>
      l.action.toLowerCase().includes(q.toLowerCase()) ||
      l.user.toLowerCase().includes(q.toLowerCase()),
  );
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
            <Button variant="outline" size="sm" className="gap-1.5">
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>
          {chips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Active filters:</span>
              {chips.map((c) => (
                <button
                  key={c}
                  onClick={() => setChips((p) => p.filter((x) => x !== c))}
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
