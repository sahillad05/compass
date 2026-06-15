import type { ReactNode } from "react";
import { AppSidebar } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";
import { MobileTabs } from "./mobile-tabs";

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar title={title} subtitle={subtitle} />
        <main className="flex-1 overflow-x-hidden p-4 md:p-6">{children}</main>
        <MobileTabs />
      </div>
    </div>
  );
}
