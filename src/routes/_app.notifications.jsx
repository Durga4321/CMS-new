import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Send, Bell, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, toArray } from "@/lib/api";
import { useApiResource } from "@/hooks/use-api-resource";
import {
  normalizeAdmin,
  normalizeClinic,
  normalizeNotification,
  normalizeUser,
} from "@/lib/api-normalizers";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
export const Route = createFileRoute("/_app/notifications")({
  component: NotificationsPage,
  head: () => ({ meta: [{ title: "Notifications — Medisuite" }] }),
});
const typeIcons = { success: CheckCircle2, warning: AlertTriangle, info: Info };
const READ_NOTIFICATIONS_KEY = "clinic_command_center_read_notifications";
const targetOptions = [
  { label: "All admins", value: "admins" },
  { label: "All users", value: "users" },
  { label: "Specific clinic", value: "clinic" },
  { label: "Custom segment", value: "segment" },
];
function NotificationsPage() {
  const [open, setOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [readSynced, setReadSynced] = useState(false);
  const [targetType, setTargetType] = useState("admins");
  const [targetId, setTargetId] = useState("");
  const {
    data: notifications,
    setData: setNotifications,
    loading,
    error,
    reload,
  } = useApiResource(
    async () =>
      applyStoredReadState(toArray(await api.notifications.list()).map(normalizeNotification)),
    [],
    [],
  );
  const { data: admins, reload: reloadAdmins } = useApiResource(
    async () => (open ? toArray(await api.admins.list()).map(normalizeAdmin) : []),
    [],
    [],
  );
  const { data: users, reload: reloadUsers } = useApiResource(
    async () => (open ? toArray(await api.users.list()).map(normalizeUser) : []),
    [],
    [],
  );
  const { data: clinics, reload: reloadClinics } = useApiResource(
    async () => (open ? toArray(await api.clinics.list()).map(normalizeClinic) : []),
    [],
    [],
  );
  const templates = [...new Set(notifications.map((notification) => notification.title))].slice(
    0,
    5,
  );
  const delivered = notifications.filter((notification) => notification.read).length;
  const deliveryRate = notifications.length
    ? Math.round((delivered / notifications.length) * 100)
    : 0;
  const segmentOptions = [
    { label: "Active users", value: "active-users" },
    { label: "Inactive users", value: "inactive-users" },
    { label: "Pending users", value: "pending-users" },
  ];
  const targetLabel =
    targetOptions.find((option) => option.value === targetType)?.label ?? "All admins";
  const selectedClinic = clinics.find((clinic) => clinic.id === targetId);
  const selectedSegment = segmentOptions.find((segment) => segment.value === targetId);
  const resolvedTargetLabel =
    targetType === "clinic"
      ? selectedClinic?.name
      : targetType === "segment"
        ? selectedSegment?.label
        : targetLabel;

  const getTargetUsers = () => {
    if (targetType === "admins") return admins;
    if (targetType === "users") return users;
    if (targetType === "clinic") {
      return [...admins, ...users].filter(
        (person) => person.clinic === selectedClinic?.name || person.clinic === selectedClinic?.id,
      );
    }
    if (targetType === "segment") {
      const status = targetId.replace("-users", "");
      return users.filter((user) => user.status === status);
    }
    return [];
  };

  useEffect(() => {
    if (open) {
      reloadAdmins();
      reloadUsers();
      reloadClinics();
    }
  }, [open, reloadAdmins, reloadClinics, reloadUsers]);

  useEffect(() => {
    if (!readSynced && notifications.length) {
      markNotificationsRead(notifications);
      setReadSynced(true);
      if (notifications.some((notification) => !notification.read)) {
        reload();
      }
    }
  }, [notifications, readSynced, reload]);

  const sendNotification = async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const message = String(form.get("message") ?? "").trim();
    const targetUsers = getTargetUsers();
    const targetUserIds = targetUsers.map((user) => user.id);

    if (!title || !message) {
      toast.error("Title and message are required");
      return;
    }
    if ((targetType === "clinic" || targetType === "segment") && !targetId) {
      toast.error("Please select the target users");
      return;
    }
    if (targetUsers.length === 0) {
      toast.error("No target users found for this notification");
      return;
    }
    try {
      await api.notifications.create({
        title,
        message,
        target: targetLabel,
        targetType,
        targetId: targetId || undefined,
        targetLabel,
        targetName: resolvedTargetLabel ?? targetLabel,
        targetUsers: targetUserIds,
        targetUserIds,
        recipientIds: targetUserIds,
        recipients: targetUserIds,
        type: form.get("type"),
      });
      setOpen(false);
      toast.success("Notification queued for delivery");
      reload();
    } catch (err) {
      console.error("Notification send failed", err?.data ?? err);
      toast.error(err?.message ?? "Unable to send notification");
    }
  };
  const openNotification = (notification) => {
    markNotificationsRead([notification]);
    setNotifications((current) =>
      current.map((item) =>
        getNotificationKey(item) === getNotificationKey(notification)
          ? { ...item, read: true }
          : item,
      ),
    );
    setSelectedNotification({ ...notification, read: true });
  };
  return (
    <>
      <PageHeader
        title="Notifications"
        description="Send announcements and view notification history."
        actions={
          <Button onClick={() => setOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Send notification
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-border bg-card shadow-card">
          <div className="border-b border-border p-5">
            <h3 className="text-base font-semibold">Recent notifications</h3>
            <p className="text-xs text-muted-foreground">All system and user notifications</p>
          </div>
          <ul>
            {error && (
              <li className="border-b border-border p-5 text-sm text-destructive">{error}</li>
            )}
            {notifications.map((n) => {
              const Icon = typeIcons[n.type] ?? Bell;
              return (
                <li
                  key={n.id}
                  className={cn(
                    "border-b border-border last:border-0 transition-colors hover:bg-secondary/40",
                    !n.read && "bg-primary-soft/20",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => openNotification(n)}
                    className="flex w-full gap-4 p-5 text-left focus:bg-secondary/40 focus:outline-none"
                  >
                    <div
                      className={cn(
                        "grid h-10 w-10 shrink-0 place-items-center rounded-lg",
                        n.type === "success" && "bg-success/10 text-success",
                        n.type === "warning" && "bg-warning/15 text-warning-foreground",
                        n.type === "info" && "bg-info/10 text-info",
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-medium">{n.title}</div>
                        <span className="shrink-0 text-xs text-muted-foreground">{n.time}</span>
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                    </div>
                  </button>
                </li>
              );
            })}
            {notifications.length === 0 && (
              <li className="p-8 text-center text-sm text-muted-foreground">
                {loading ? "Loading notifications..." : "No notifications found."}
              </li>
            )}
          </ul>
        </div>

        <div className="space-y-5">
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h3 className="mb-3 text-base font-semibold">Templates</h3>
            <ul className="space-y-2">
              {templates.map((t) => (
                <li
                  key={t}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm hover:bg-secondary"
                >
                  {t}
                  <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
                    <Send className="h-3 w-3" />
                    Use
                  </Button>
                </li>
              ))}
              {templates.length === 0 && (
                <li className="rounded-lg border border-border px-3 py-2.5 text-sm text-muted-foreground">
                  No templates available
                </li>
              )}
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-gradient-soft p-5 shadow-card">
            <Bell className="h-5 w-5 text-primary" />
            <h4 className="mt-2 text-sm font-semibold">Delivery stats</h4>
            <p className="mt-1 text-xs text-muted-foreground">Last 30 days</p>
            <div className="mt-3 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg bg-card p-3">
                <div className="text-xl font-semibold">{deliveryRate}%</div>
                <div className="text-[11px] text-muted-foreground">Delivered</div>
              </div>
              <div className="rounded-lg bg-card p-3">
                <div className="text-xl font-semibold">{notifications.length}</div>
                <div className="text-[11px] text-muted-foreground">Sent</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Send notification</DialogTitle>
          </DialogHeader>
          <form onSubmit={sendNotification} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Title</label>
              <input
                name="title"
                required
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                placeholder="Subscription renewing soon"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Message</label>
              <textarea
                name="message"
                required
                rows={4}
                className="w-full rounded-lg border border-input bg-background p-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                placeholder="Your subscription will renew on…"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Target users</label>
                <Select
                  name="target"
                  value={targetType}
                  onValueChange={(value) => {
                    setTargetType(value);
                    setTargetId("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {targetOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Type</label>
                <Select name="type" defaultValue="info">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(targetType === "clinic" || targetType === "segment") && (
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  {targetType === "clinic" ? "Select clinic" : "Select segment"}
                </label>
                <Select name="targetId" value={targetId} onValueChange={setTargetId}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={targetType === "clinic" ? "Choose clinic" : "Choose segment"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {(targetType === "clinic" ? clinics : segmentOptions).map((option) => (
                      <SelectItem key={option.id ?? option.value} value={option.id ?? option.value}>
                        {option.name ?? option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
              {getTargetUsers().length} target user{getTargetUsers().length === 1 ? "" : "s"} will
              receive this notification.
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="gap-1.5">
                <Send className="h-4 w-4" />
                Send now
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!selectedNotification}
        onOpenChange={(nextOpen) => !nextOpen && setSelectedNotification(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedNotification?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">{selectedNotification?.message}</p>
            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs">
              <span className="text-muted-foreground">Type</span>
              <span className="font-medium capitalize">{selectedNotification?.type}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs">
              <span className="text-muted-foreground">Time</span>
              <span className="font-medium">{selectedNotification?.time || "Not provided"}</span>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setSelectedNotification(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function getNotificationKey(notification) {
  return String(
    notification?.id ??
      notification?._id ??
      `${notification?.title ?? ""}|${notification?.message ?? ""}|${notification?.time ?? ""}`,
  );
}

function getStoredReadNotificationKeys() {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(window.localStorage.getItem(READ_NOTIFICATIONS_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}

function storeReadNotificationKeys(readKeys) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify([...readKeys]));
}

function markNotificationsRead(notifications) {
  const readKeys = getStoredReadNotificationKeys();
  notifications.forEach((notification) => readKeys.add(getNotificationKey(notification)));
  storeReadNotificationKeys(readKeys);
}

function applyStoredReadState(notifications) {
  const readKeys = getStoredReadNotificationKeys();
  return notifications.map((notification) =>
    readKeys.has(getNotificationKey(notification)) ? { ...notification, read: true } : notification,
  );
}
