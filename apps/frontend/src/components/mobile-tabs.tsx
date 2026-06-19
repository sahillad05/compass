import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Briefcase, Activity, CheckCircle2, Users, Layers, BarChart3, ListChecks, FolderKanban, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRoleContext } from "@/lib/role-context";

type Item = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };
const baseItems: Item[] = [
  { to: "/", label: "Home", icon: LayoutDashboard, exact: true },
  { to: "/clients", label: "Clients", icon: Briefcase },
];
const tail: Item[] = [
  { to: "/health", label: "Health", icon: Activity },
  { to: "/approvals", label: "Approvals", icon: CheckCircle2 },
];

export function MobileTabs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isPMO, isHOD, isBO, isDhanshree } = useRoleContext();
  const items: Item[] = isDhanshree
    ? [
        { to: "/", label: "Home", icon: LayoutDashboard, exact: true },
        { to: "/action-centre", label: "Action", icon: ListChecks },
        { to: "/projects", label: "Projects", icon: FolderKanban },
        { to: "/customers", label: "Clients", icon: Building2 },
        { to: "/dh-reports", label: "Reports", icon: BarChart3 },
      ]
    : isBO
    ? [
        { to: "/", label: "Home", icon: LayoutDashboard, exact: true },
        { to: "/portfolio", label: "Portfolio", icon: Layers },
        { to: "/clients", label: "Clients", icon: Briefcase },
        { to: "/health", label: "Health", icon: Activity },
        { to: "/reports", label: "Reports", icon: BarChart3 },
      ]
    : isHOD
      ? [
          { to: "/", label: "Home", icon: LayoutDashboard, exact: true },
          { to: "/portfolio", label: "Portfolio", icon: Layers },
          { to: "/resources", label: "Resources", icon: Users },
          { to: "/health", label: "Health", icon: Activity },
          { to: "/reports", label: "Reports", icon: BarChart3 },
        ]
      : isPMO
        ? [...baseItems, { to: "/resources", label: "Resources", icon: Users }, ...tail]
        : [...baseItems, ...tail];
  return (
    <nav
      className={cn(
        "md:hidden sticky bottom-0 z-20 grid border-t border-border bg-background",
        items.length === 5 ? "grid-cols-5" : "grid-cols-4",
      )}
    >
      {items.map((it) => {
        const active = it.exact ? pathname === it.to : pathname.startsWith(it.to);
        return (
          <Link
            key={it.to}
            to={it.to}
            className={cn(
              "flex flex-col items-center gap-1 py-2 text-[10px]",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <it.icon className="h-5 w-5" />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
