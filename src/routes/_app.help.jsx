import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Building2, ShieldCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";

export const Route = createFileRoute("/_app/help")({
  component: HelpPage,
  head: () => ({ meta: [{ title: "Help Docs - Medisuite" }] }),
});

const docs = [
  {
    icon: Building2,
    title: "Clinic Management",
    body: "Create clinics, update locations, export clinic data, and manage active or inactive status from the clinic actions menu.",
  },
  {
    icon: ShieldCheck,
    title: "Admin Management",
    body: "Invite admins, assign clinics and roles, update access status, and send welcome instructions when creating new accounts.",
  },
  {
    icon: Users,
    title: "User Management",
    body: "Review user status, last activity, profile details, and clinic assignments across the network.",
  },
];

function HelpPage() {
  return (
    <>
      <PageHeader
        title="Help Docs"
        description="Quick reference for common Clinical Management System workflows."
      />

      <section className="rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary-soft text-primary">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Super Admin Guide</h2>
            <p className="text-sm text-muted-foreground">Updated 21/05/2026</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {docs.map((item) => (
            <article key={item.title} className="rounded-lg border border-border p-4">
              <item.icon className="h-5 w-5 text-primary" />
              <h3 className="mt-3 text-sm font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
