import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
export function AppShell({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setOpen(true)} />
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1400px] animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
