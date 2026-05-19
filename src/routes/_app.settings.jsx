import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Save, Globe, Mail, MessageSquare, CreditCard, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api, getPayload } from "@/lib/api";
import { useApiResource } from "@/hooks/use-api-resource";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Settings - Medisuite" }] }),
});

const tabs = [
  { id: "general", label: "General", icon: Globe },
  { id: "email", label: "Email", icon: Mail },
  { id: "sms", label: "SMS", icon: MessageSquare },
  { id: "payment", label: "Payment", icon: CreditCard },
];

function SettingsPage() {
  const [active, setActive] = useState("general");
  const {
    data: settings,
    error,
    reload,
  } = useApiResource(async () => getPayload(await api.settings.get()) ?? {}, {}, []);

  return (
    <>
      <PageHeader
        title="System Settings"
        description="Configure platform-wide preferences and integrations."
      />

      <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
        <nav className="rounded-xl border border-border bg-card p-2 shadow-card">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active === t.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </nav>

        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          {error && <div className="mb-4 text-sm text-destructive">{error}</div>}
          {active === "general" && (
            <GeneralForm settings={settings.general ?? settings} onSaved={reload} />
          )}
          {active === "email" && <EmailForm settings={settings.email ?? {}} onSaved={reload} />}
          {active === "sms" && <SmsForm settings={settings.sms ?? {}} onSaved={reload} />}
          {active === "payment" && (
            <PaymentForm settings={settings.payment ?? {}} onSaved={reload} />
          )}
        </div>
      </div>
    </>
  );
}

function Section({ title, description, children, onSave }) {
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await onSave(Object.fromEntries(new FormData(e.currentTarget)));
          toast.success("Settings saved");
        } catch (err) {
          toast.error(err?.message ?? "Unable to save settings");
        }
      }}
    >
      <div className="mb-6 border-b border-border pb-4">
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-5">{children}</div>
      <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
        <Button variant="outline" type="button">
          Cancel
        </Button>
        <Button type="submit" className="gap-1.5">
          <Save className="h-4 w-4" />
          Save changes
        </Button>
      </div>
    </form>
  );
}

function FormField({ label, hint, children }) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-[200px_1fr] sm:items-start sm:gap-6">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

const inputCls =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20";

function GeneralForm({ settings, onSaved }) {
  return (
    <Section
      title="General settings"
      description="Basic information about your platform."
      onSave={async (payload) => {
        await api.settings.updateGeneral(payload);
        onSaved();
      }}
    >
      <FormField label="Application name">
        <input
          name="applicationName"
          className={inputCls}
          defaultValue={settings.applicationName ?? settings.appName ?? ""}
        />
      </FormField>
      <FormField label="Logo" hint="PNG up to 2MB">
        <div className="flex items-center gap-4 rounded-lg border border-dashed border-border bg-secondary/40 p-4">
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-card text-muted-foreground">
            <Upload className="h-4 w-4" />
          </div>
          <div className="text-xs text-muted-foreground">
            Drop your logo here or <span className="font-medium text-primary">browse</span>
          </div>
        </div>
      </FormField>
      <FormField label="Timezone">
        <Select name="timezone" defaultValue={settings.timezone ?? ""}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["UTC-08:00", "UTC-05:00", "UTC+00:00", "UTC+05:30"].map((z) => (
              <SelectItem key={z} value={z}>
                {z}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      <FormField label="Currency">
        <Select name="currency" defaultValue={settings.currency ?? ""}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["USD", "EUR", "GBP", "INR"].map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      <FormField label="Default language">
        <Select name="language" defaultValue={settings.language ?? settings.defaultLanguage ?? ""}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["English", "Spanish", "French", "German"].map((l) => (
              <SelectItem key={l} value={l}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      <FormField label="Maintenance mode" hint="Disables platform login">
        <div className="flex items-center gap-3 pt-1.5">
          <Switch name="maintenanceMode" defaultChecked={Boolean(settings.maintenanceMode)} />
          <span className="text-sm text-muted-foreground">
            {settings.maintenanceMode ? "On" : "Off"}
          </span>
        </div>
      </FormField>
    </Section>
  );
}

function EmailForm({ settings, onSaved }) {
  return (
    <Section
      title="Email settings"
      description="SMTP configuration for transactional email."
      onSave={async (payload) => {
        await api.settings.updateEmail(payload);
        onSaved();
      }}
    >
      <FormField label="SMTP host">
        <input
          name="smtpHost"
          className={inputCls}
          defaultValue={settings.smtpHost ?? settings.host ?? ""}
        />
      </FormField>
      <FormField label="Port">
        <input name="port" className={inputCls} defaultValue={settings.port ?? ""} />
      </FormField>
      <FormField label="Username">
        <input name="username" className={inputCls} defaultValue={settings.username ?? ""} />
      </FormField>
      <FormField label="Password">
        <input name="password" type="password" className={inputCls} defaultValue="" />
      </FormField>
      <FormField label="Use TLS">
        <div className="pt-1.5">
          <Switch name="useTls" defaultChecked={Boolean(settings.useTls ?? settings.tls)} />
        </div>
      </FormField>
    </Section>
  );
}

function SmsForm({ settings, onSaved }) {
  return (
    <Section
      title="SMS settings"
      description="Configure your SMS gateway provider."
      onSave={async (payload) => {
        await api.settings.updateSms(payload);
        onSaved();
      }}
    >
      <FormField label="Provider">
        <Select name="provider" defaultValue={settings.provider ?? ""}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["Twilio", "MessageBird", "Vonage"].map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      <FormField label="Account SID">
        <input
          name="accountSid"
          className={inputCls}
          defaultValue={settings.accountSid ?? settings.sid ?? ""}
        />
      </FormField>
      <FormField label="Auth token">
        <input name="authToken" type="password" className={inputCls} defaultValue="" />
      </FormField>
      <FormField label="Sender ID">
        <input name="senderId" className={inputCls} defaultValue={settings.senderId ?? ""} />
      </FormField>
    </Section>
  );
}

function PaymentForm({ settings, onSaved }) {
  return (
    <Section
      title="Payment settings"
      description="Manage payment gateway and currency settings."
      onSave={async (payload) => {
        await api.settings.updatePayment(payload);
        onSaved();
      }}
    >
      <FormField label="Provider">
        <Select name="provider" defaultValue={settings.provider ?? ""}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["Stripe", "PayPal", "Razorpay"].map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      <FormField label="Publishable key">
        <input
          name="publishableKey"
          className={inputCls}
          defaultValue={settings.publishableKey ?? ""}
        />
      </FormField>
      <FormField label="Secret key">
        <input name="secretKey" type="password" className={inputCls} defaultValue="" />
      </FormField>
      <FormField label="Test mode">
        <div className="pt-1.5">
          <Switch name="testMode" defaultChecked={Boolean(settings.testMode)} />
        </div>
      </FormField>
    </Section>
  );
}
