import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";

export const Route = createFileRoute("/_app/schedule")({
  component: SchedulePage,
  head: () => ({ meta: [{ title: "Schedule Setup - Medisuite" }] }),
});

function SchedulePage() {
  const [settings, setSettings] = useState({
    defaultSlotDuration: "30",
    clinicStart: "09:00",
    clinicEnd: "18:00",
    holidays: "2026-08-15, 2026-10-02, 2026-12-25",
  });

  return (
    <>
      <PageHeader
        title="Global Schedule Settings"
        description="Saved settings are applied globally for appointment slot generation."
      />
      <form
        className="rounded-xl border border-border bg-card p-5 shadow-card"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Default Slot Duration"
            value={settings.defaultSlotDuration}
            onChange={(value) => setSettings({ ...settings, defaultSlotDuration: value })}
            suffix="minutes"
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium">Clinic Working Hours</label>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                type="time"
                value={settings.clinicStart}
                onChange={(event) => setSettings({ ...settings, clinicStart: event.target.value })}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
              <input
                type="time"
                value={settings.clinicEnd}
                onChange={(event) => setSettings({ ...settings, clinicEnd: event.target.value })}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium">Holidays</label>
            <textarea
              value={settings.holidays}
              onChange={(event) => setSettings({ ...settings, holidays: event.target.value })}
              rows={4}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <Button className="gap-1.5">
            <Save className="h-4 w-4" />
            Save
          </Button>
        </div>
      </form>
    </>
  );
}

function Field({ label, value, onChange, suffix }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      <div className="flex items-center gap-2">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
        />
        <span className="text-sm text-muted-foreground">{suffix}</span>
      </div>
    </div>
  );
}
