import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Filter, FileDown, Activity, Mail, Phone, MapPin, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, StatusBadge } from "@/components/layout/PageHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { api, toArray } from "@/lib/api";
import { useApiResource } from "@/hooks/use-api-resource";
import { normalizeUser } from "@/lib/api-normalizers";
import { toast } from "sonner";
export const Route = createFileRoute("/_app/users")({
  component: UsersPage,
  head: () => ({ meta: [{ title: "Users — Medisuite" }] }),
});
function UsersPage() {
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(null);
  const {
    data: users,
    loading,
    error,
    reload,
  } = useApiResource(async () => toArray(await api.users.list()).map(normalizeUser), [], []);
  const filtered = users.filter(
    (u) =>
      (tab === "all" || u.status === tab) &&
      (u.name.toLowerCase().includes(q.toLowerCase()) ||
        u.email.toLowerCase().includes(q.toLowerCase())),
  );
  const counts = {
    all: users.length,
    active: users.filter((u) => u.status === "active").length,
    inactive: users.filter((u) => u.status === "inactive").length,
    pending: users.filter((u) => u.status === "pending").length,
  };
  const updateStatus = async (user, active) => {
    try {
      await api.users.updateStatus(user.id, { status: active ? "active" : "inactive" });
      toast.success("User status updated");
      reload();
    } catch (err) {
      toast.error(err?.message ?? "Unable to update user");
    }
  };
  return (
    <>
      <PageHeader
        title="User Management"
        description="View and manage users across all your clinics."
        actions={
          <Button variant="outline" className="gap-1.5">
            <FileDown className="h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {["all", "active", "inactive", "pending"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium capitalize transition-colors ${tab === t ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:bg-accent"}`}
          >
            {t}
            <span
              className={`rounded-full px-1.5 text-[11px] ${tab === t ? "bg-primary-foreground/20" : "bg-secondary"}`}
            >
              {counts[t]}
            </span>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card">
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search users…"
              className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Filter className="h-4 w-4" />
            Advanced filters
          </Button>
        </div>

        <div className="overflow-x-auto">
          {error && (
            <div className="border-b border-border p-4 text-sm text-destructive">{error}</div>
          )}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Clinic</th>
                <th className="px-5 py-3 font-medium">Last active</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => setSelected(u)}
                  className="cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-secondary/40"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-info/10 text-xs font-semibold text-info">
                          {u.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{u.name}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">{u.role}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{u.clinic}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{u.lastActive}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={u.status} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    {loading ? "Loading users..." : "No users found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>User details</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-gradient-primary text-lg text-primary-foreground">
                      {selected.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-lg font-semibold">{selected.name}</div>
                    <div className="text-sm text-muted-foreground">{selected.role}</div>
                    <div className="mt-1.5">
                      <StatusBadge status={selected.status} />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 rounded-lg border border-border bg-secondary/40 p-4">
                  <Row icon={Mail} label="Email" value={selected.email} />
                  <Row icon={Phone} label="Phone" value={selected.phone} />
                  <Row icon={MapPin} label="Clinic" value={selected.clinic} />
                  <Row icon={Calendar} label="Member since" value={selected.memberSince} />
                </div>

                <div>
                  <h4 className="mb-2 text-sm font-semibold">Activity history</h4>
                  <ul className="space-y-2.5">
                    <li className="flex items-center gap-3 text-sm">
                      <div className="grid h-7 w-7 place-items-center rounded-full bg-primary-soft text-primary">
                        <Activity className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1">Last active</div>
                      <div className="text-xs text-muted-foreground">{selected.lastActive}</div>
                    </li>
                  </ul>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <div className="text-sm font-medium">Account active</div>
                    <div className="text-xs text-muted-foreground">Toggle to deactivate</div>
                  </div>
                  <Switch
                    defaultChecked={selected.status === "active"}
                    onCheckedChange={(active) => updateStatus(selected, active)}
                  />
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1">
                    Edit
                  </Button>
                  <Button variant="destructive" className="flex-1">
                    Deactivate
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div className="text-muted-foreground">{label}</div>
      <div className="ml-auto font-medium">{value}</div>
    </div>
  );
}
