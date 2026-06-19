import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Briefcase,
  Activity,
  CheckCircle2,
  Users,
  Inbox,
  BarChart3,
  Layers,
  ListChecks,
  FolderKanban,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRoleContext } from "@/lib/role-context";

type Item = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };

const dashboardItem: Item = { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true };
const clientsItem: Item = { to: "/clients", label: "Clients & Projects", icon: Briefcase };
const portfolioItem: Item = { to: "/portfolio", label: "Portfolio", icon: Layers };
const wbsItem: Item = { to: "/wbs-allocation", label: "WBS Allocation", icon: Inbox };
const resourcesItem: Item = { to: "/resources", label: "Resources", icon: Users };
const healthItem: Item = { to: "/health", label: "Health & Governance", icon: Activity };
const approvalsItem: Item = { to: "/approvals", label: "Approvals", icon: CheckCircle2 };
const reportsItem: Item = { to: "/reports", label: "Reports", icon: BarChart3 };

// Dhanshree-specific items
const dhActionCentre: Item = { to: "/action-centre", label: "Action Centre", icon: ListChecks };
const dhProjects: Item = { to: "/projects", label: "Projects", icon: FolderKanban };
const dhReports: Item = { to: "/dh-reports", label: "Reports", icon: BarChart3 };
const dhResources: Item = { to: "/dh-resources", label: "Resources", icon: Users };
const dhCustomers: Item = { to: "/customers", label: "Customers", icon: Building2 };

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { assignedIssues, pendingTimesheets, isPMO, isHOD, isBO, isDhanshree } = useRoleContext();
  const openIssues = assignedIssues.filter((i) => i.status === "open").length;

  const items: Item[] = isDhanshree
    ? [dashboardItem, dhActionCentre, dhProjects, dhReports, dhResources, dhCustomers]
    : isBO
      ? [dashboardItem, portfolioItem, clientsItem, resourcesItem, healthItem, reportsItem]
      : isHOD
        ? [dashboardItem, portfolioItem, resourcesItem, healthItem, approvalsItem, reportsItem]
        : isPMO
          ? [dashboardItem, clientsItem, wbsItem, resourcesItem, healthItem, approvalsItem]
          : [dashboardItem, clientsItem, healthItem, approvalsItem];

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
          P
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">Pulse PMO</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Enterprise
          </span>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {items.map((it) => {
          const active = isActive(it.to, it.exact);
          const badge =
            it.to === "/health" ? openIssues :
            it.to === "/approvals" ? pendingTimesheets.length :
            0;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <it.icon className="h-4 w-4" />
              <span className="flex-1">{it.label}</span>
              {badge > 0 && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-3 text-[11px] text-muted-foreground">
        {isDhanshree ? "v1.0 · Workspace" : isBO ? "v1.0 · Executive oversight" : isHOD ? "v1.0 · Department oversight" : isPMO ? "v1.0 · Governance + allocation" : "v1.0 · Read-only tracking"}
      </div>
    </aside>
  );
}
