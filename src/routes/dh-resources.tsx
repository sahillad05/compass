import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Eye, Check, Users, UserPlus, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { useRoleContext } from "@/lib/role-context";
import { people, projects, benchResourceIds, type Person } from "@/lib/mock-data";
import { Avatar, ProgressBar } from "@/components/pills";
import { Modal, Field } from "@/routes/projects.index";
import { getDept, getSubDept } from "@/lib/dh-helpers";
import { dhStore, useDhStore, type ResignationStatus } from "@/lib/dh-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dh-resources")({
  head: () => ({
    meta: [
      { title: "Resources — Pulse PMO" },
      { name: "description", content: "Resource directory with allocation, utilization and actions." },
    ],
  }),
  component: DhResourcesPage,
});

type Status = "Dedicated" | "Available" | "Bench" | "Partial Allocation";
type ResourceTab = "all" | "onboarded" | "offboarding";

interface ResourceRow {
  id: string;
  person: Person;
  department: string;
  subDepartment: string;
  project?: typeof projects[number];
  status: Status;
  allocation: number;
  endDate: string;
  utilization: number;
  availability: number;
  assignedTasks: number;
  skills: string[];
  isExited?: boolean;
}

const SKILLS_POOL = ["React", "Java", "Kafka", "Python", "AWS", "Figma", "Snowflake", "iOS", "DevOps", "QA"];

function DhResourcesPage() {
  const { isDhanshree } = useRoleContext();
  const [activeTab, setActiveTab] = useState<ResourceTab>("all");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [action, setAction] = useState<{ type: "view" | "assign" | "replace" | "shuffle"; row: ResourceRow } | null>(null);

  // Subscribe to store for onboarded/offboarding resources
  const onboardedResources = useDhStore(s => s.onboardedResources);
  const offboardingResources = useDhStore(s => s.offboardingResources);
  const exitedResources = useDhStore(s => s.exitedResources);

  if (!isDhanshree) return <Navigate to="/" />;

  const exitedPersonIds = new Set(exitedResources.map(e => e.personId));

  const rows = useMemo<ResourceRow[]>(() => {
    const utilization: Record<string, { count: number; projectId?: string }> = {};
    projects.forEach((p) => {
      [p.pmId, p.tlId, ...p.teamIds].forEach((id) => {
        utilization[id] = { count: (utilization[id]?.count ?? 0) + 1, projectId: utilization[id]?.projectId ?? p.id };
      });
    });
    const benchSet = new Set(benchResourceIds);
    return people.map((p, idx) => {
      const u = utilization[p.id];
      const onBench = benchSet.has(p.id);
      const count = u?.count ?? 0;
      const allocation = onBench ? 0 : Math.min(100, count * 35 + 20);
      const status: Status = onBench ? "Bench" : count >= 2 ? "Dedicated" : count === 1 ? "Partial Allocation" : "Available";
      const proj = u?.projectId ? projects.find((pr) => pr.id === u.projectId) : undefined;
      return {
        id: `EMP-${String(idx + 1).padStart(4, "0")}`,
        person: p,
        department: getDept(p),
        subDepartment: getSubDept(p),
        project: proj,
        status,
        allocation,
        endDate: proj?.endDate ?? "—",
        utilization: allocation,
        availability: 100 - allocation,
        assignedTasks: count * 3,
        skills: SKILLS_POOL.slice(idx % SKILLS_POOL.length, (idx % SKILLS_POOL.length) + 3),
        isExited: exitedPersonIds.has(p.id),
      };
    });
  }, [exitedPersonIds]);

  const filtered = rows.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (!q.trim()) return true;
    return [r.person.name, r.person.email, r.department, r.subDepartment, r.id].some((v) =>
      v.toLowerCase().includes(q.toLowerCase())
    );
  });

  const statusCls = (s: Status) =>
    ({
      Dedicated: "border-info/30 bg-info/10 text-info",
      Available: "border-success/30 bg-success/10 text-success",
      Bench: "border-warning/40 bg-warning/15 text-warning-foreground",
      "Partial Allocation": "border-muted-foreground/30 bg-muted text-muted-foreground",
    }[s]);

  const filters = ["all", "Dedicated", "Available", "Bench", "Partial Allocation"] as const;

  const tabs: { id: ResourceTab; label: string; icon: typeof Users; count?: number }[] = [
    { id: "all", label: "All Resources", icon: Users, count: rows.length },
    { id: "onboarded", label: "Newly Onboarded", icon: UserPlus, count: onboardedResources.length },
    { id: "offboarding", label: "Offboarding Resources", icon: UserMinus, count: offboardingResources.length },
  ];

  const resignStatusCls = (s: ResignationStatus) => ({
    Accepted: "border-destructive/30 bg-destructive/10 text-destructive",
    Pending: "border-warning/40 bg-warning/15 text-warning-foreground",
    Retain: "border-success/30 bg-success/10 text-success",
  }[s]);

  return (
    <AppShell title="Resources" subtitle="Allocation, utilization and bench tracking">
      {/* Tab Bar */}
      <div className="mb-4 flex gap-1 rounded-lg border border-border bg-muted/30 p-1 text-sm overflow-x-auto">
        {tabs.map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            onClick={() => { setActiveTab(id); setQ(""); setStatusFilter("all"); }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors whitespace-nowrap",
              activeTab === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {count !== undefined && (
              <span className={cn(
                "ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                activeTab === id ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: All Resources */}
      {activeTab === "all" && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative max-w-xs flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Search resource, id or department…"
                className="h-9 w-full rounded-md border border-input bg-card pl-8 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
            <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card p-1 text-xs">
              {filters.map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={cn("rounded-md px-2.5 py-1",
                    statusFilter === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                  {s === "all" ? "All status" : s}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4 grid gap-3 sm:grid-cols-4">
            <Stat label="Total resources" value={rows.length} />
            <Stat label="Dedicated" value={rows.filter((r) => r.status === "Dedicated").length} />
            <Stat label="Bench" value={rows.filter((r) => r.status === "Bench").length} tone="warn" />
            <Stat label="Avg utilization" value={`${Math.round(rows.reduce((s, r) => s + r.utilization, 0) / rows.length)}%`} />
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Emp ID</th>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Department</th>
                  <th className="px-3 py-2 font-medium">Sub Department</th>
                  <th className="px-3 py-2 font-medium">Current Project</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Allocation</th>
                  <th className="px-3 py-2 font-medium">Utilization</th>
                  <th className="px-3 py-2 font-medium">Availability Date</th>
                  <th className="px-3 py-2 font-medium">Tasks</th>
                  <th className="px-3 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((r) => (
                  <tr key={r.person.id}
                    className={cn("hover:bg-accent/30 transition-colors", r.isExited && "opacity-50 bg-muted/20")}>
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{r.id}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Avatar name={r.person.name} size={26} />
                        <div className="min-w-0">
                          <span className={cn("font-medium", r.isExited && "text-muted-foreground")}>{r.person.name}</span>
                          {r.isExited && (
                            <span className="ml-2 inline-flex rounded-full border border-muted-foreground/30 bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase text-muted-foreground">Exited</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className={cn("px-3 py-2.5", r.isExited && "text-muted-foreground")}>{r.department}</td>
                    <td className={cn("px-3 py-2.5 text-muted-foreground")}>{r.subDepartment}</td>
                    <td className={cn("px-3 py-2.5", r.isExited && "text-muted-foreground")}>{r.project?.name ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      {r.isExited
                        ? <span className="inline-flex items-center rounded-full border border-muted-foreground/30 bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Inactive</span>
                        : <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", statusCls(r.status))}>{r.status}</span>
                      }
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <ProgressBar value={r.isExited ? 0 : r.allocation} className="w-20" />
                        <span className="text-xs tabular-nums text-muted-foreground">{r.isExited ? "0" : r.allocation}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">{r.isExited ? "0" : r.utilization}%</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {r.isExited ? "—" : r.endDate !== "—" ? new Date(r.endDate).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">{r.isExited ? 0 : r.assignedTasks}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end gap-1">
                        <IconBtn label="View" icon={Eye} onClick={() => setAction({ type: "view", row: r })} />
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={11} className="px-3 py-10 text-center text-sm text-muted-foreground">No resources match your filters</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* TAB 2: Newly Onboarded */}
      {activeTab === "onboarded" && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative max-w-xs flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name, department…"
                className="h-9 w-full rounded-md border border-input bg-card pl-8 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
          </div>

          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <Stat label="Total Onboarded" value={onboardedResources.length} />
            <Stat label="On Probation" value={onboardedResources.filter(r => r.status === "Probation").length} tone="warn" />
            <Stat label="Active" value={onboardedResources.filter(r => r.status === "Active").length} />
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Employee ID</th>
                  <th className="px-3 py-2 font-medium">Resource Name</th>
                  <th className="px-3 py-2 font-medium">Department</th>
                  <th className="px-3 py-2 font-medium">Sub Department</th>
                  <th className="px-3 py-2 font-medium">Joining Date</th>
                  <th className="px-3 py-2 font-medium">Designation</th>
                  <th className="px-3 py-2 font-medium">Current Project</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {onboardedResources
                  .filter(r => !q.trim() || [r.name, r.department, r.subDepartment, r.employeeId, r.designation].some(v => v.toLowerCase().includes(q.toLowerCase())))
                  .map((r) => (
                    <tr key={r.employeeId} className="hover:bg-accent/30">
                      <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{r.employeeId}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <Avatar name={r.name} size={26} />
                          <span className="font-medium">{r.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">{r.department}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{r.subDepartment}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{new Date(r.joiningDate).toLocaleDateString()}</td>
                      <td className="px-3 py-2.5">{r.designation}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{r.currentProject ?? "—"}</td>
                      <td className="px-3 py-2.5">
                        <span className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                          r.status === "Active" ? "border-success/30 bg-success/10 text-success" : "border-warning/40 bg-warning/15 text-warning-foreground"
                        )}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                {onboardedResources.length === 0 && (
                  <tr><td colSpan={8} className="px-3 py-10 text-center text-sm text-muted-foreground">No newly onboarded resources</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* TAB 3: Offboarding Resources */}
      {activeTab === "offboarding" && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative max-w-xs flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name, department…"
                className="h-9 w-full rounded-md border border-input bg-card pl-8 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
          </div>

          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <Stat label="Total Offboarding" value={offboardingResources.length} />
            <Stat label="Accepted" value={offboardingResources.filter(r => r.resignationStatus === "Accepted").length} tone="warn" />
            <Stat label="Retained" value={offboardingResources.filter(r => r.resignationStatus === "Retain").length} />
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Employee ID</th>
                  <th className="px-3 py-2 font-medium">Resource Name</th>
                  <th className="px-3 py-2 font-medium">Department</th>
                  <th className="px-3 py-2 font-medium">Sub Department</th>
                  <th className="px-3 py-2 font-medium">Resignation Date</th>
                  <th className="px-3 py-2 font-medium">Last Working Date</th>
                  <th className="px-3 py-2 font-medium">Resignation Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {offboardingResources
                  .filter(r => !q.trim() || [r.name, r.department, r.subDepartment, r.employeeId].some(v => v.toLowerCase().includes(q.toLowerCase())))
                  .map((r) => (
                    <tr key={r.employeeId} className="hover:bg-accent/30">
                      <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{r.employeeId}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <Avatar name={r.name} size={26} />
                          <span className="font-medium">{r.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">{r.department}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{r.subDepartment}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{new Date(r.resignationDate).toLocaleDateString()}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {/* Hide Last Working Date when status is Retain */}
                        {r.resignationStatus === "Retain" ? (
                          <span className="text-success text-[11px] font-medium italic">— (Retained)</span>
                        ) : r.lastWorkingDate ? (
                          new Date(r.lastWorkingDate).toLocaleDateString()
                        ) : "TBD"}
                      </td>
                      <td className="px-3 py-2.5">
                        <select
                          value={r.resignationStatus}
                          onChange={(e) => {
                            dhStore.updateOffboardingStatus(r.employeeId, { resignationStatus: e.target.value as ResignationStatus });
                            toast.success(`Status updated to ${e.target.value}`);
                          }}
                          className={cn(
                            "h-7 rounded-md border px-2 text-[10px] font-bold shadow-xs transition-colors cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-ring",
                            r.resignationStatus === "Accepted" ? "bg-red-50 border-red-200 text-red-700 hover:bg-red-100" :
                            r.resignationStatus === "Retain" ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100" :
                            "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                          )}
                        >
                          {(["Pending", "Accepted", "Retain"] as ResignationStatus[]).map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                {offboardingResources.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-10 text-center text-sm text-muted-foreground">No offboarding resources</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {action && <ResourceActionModal action={action.type} row={action.row} allRows={rows} onClose={() => setAction(null)} />}
    </AppShell>
  );
}

function IconBtn({ label, icon: Icon, onClick }: { label: string; icon: typeof Eye; onClick?: () => void }) {
  return (
    <button aria-label={label} title={label} onClick={onClick}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-input bg-card text-muted-foreground hover:bg-accent hover:text-foreground">
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

function Stat({ label, value, tone = "default" }: { label: string; value: number | string; tone?: "default" | "warn" }) {
  const cls = tone === "warn" ? "text-warning-foreground" : "";
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("mt-2 text-2xl font-semibold tabular-nums", cls)}>{value}</div>
    </div>
  );
}

// ---------- Action Modals ----------
function ResourceActionModal({ action, row, allRows, onClose }: {
  action: "view" | "assign" | "replace" | "shuffle";
  row: ResourceRow; allRows: ResourceRow[]; onClose: () => void;
}) {
  const [filters, setFilters] = useState({ dept: "", skill: "", minAvailability: 0 });
  const candidates = allRows.filter((c) =>
    c.person.id !== row.person.id &&
    (!filters.dept || c.department === filters.dept) &&
    (!filters.skill || c.skills.includes(filters.skill)) &&
    c.availability >= filters.minAvailability,
  );
  const departments = Array.from(new Set(allRows.map((r) => r.department)));

  if (action === "view") {
    const otherProjs = projects.filter((p) => p.pmId === row.person.id || p.tlId === row.person.id || p.teamIds.includes(row.person.id));
    return (
      <Modal title={`${row.person.name} — Workload`} onClose={onClose} wide>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-accent/30 p-3">
              <Avatar name={row.person.name} size={42} />
              <div>
                <div className="text-sm font-semibold">{row.person.name}</div>
                <div className="text-[11px] text-muted-foreground">{row.department} · {row.subDepartment}</div>
                <div className="text-[11px] text-muted-foreground">{row.id}</div>
                {row.isExited && (
                  <span className="mt-1 inline-flex rounded-full border border-muted-foreground/30 bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase text-muted-foreground">Exited</span>
                )}
              </div>
            </div>
            <MetricRow label="Utilization" value={`${row.isExited ? 0 : row.utilization}%`} bar={row.isExited ? 0 : row.utilization} />
            <MetricRow label="Availability" value={`${row.isExited ? 100 : row.availability}%`} bar={row.isExited ? 100 : row.availability} />
            <MetricRow label="Allocation" value={`${row.isExited ? 0 : row.allocation}%`} bar={row.isExited ? 0 : row.allocation} />
            <div>
              <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Skills</div>
              <div className="flex flex-wrap gap-1">
                {row.skills.map((s) => <span key={s} className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px]">{s}</span>)}
              </div>
            </div>
          </div>
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {row.isExited ? "Project History" : "Assigned Projects"} · {otherProjs.length}
            </h4>
            <ul className="space-y-1.5">
              {otherProjs.length === 0 && <li className="text-sm text-muted-foreground">No active project assignments</li>}
              {otherProjs.map((p) => (
                <li key={p.id} className="flex items-center gap-2 rounded-md border border-border bg-card p-2 text-xs">
                  <span className="flex-1 truncate font-medium">{p.name}</span>
                  <ProgressBar value={p.progress} className="w-24" />
                  <span className="w-10 text-right tabular-nums text-muted-foreground">{p.progress}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Modal>
    );
  }

  const titleMap = { assign: "Assign Resource", replace: "Replace Resource", shuffle: "Shuffle / Rotate Resource" };
  const ctaMap = { assign: "Assign", replace: "Replace", shuffle: "Swap" };

  const submit = (target: ResourceRow) => {
    const verbs = { assign: "Assigned", replace: "Replaced with", shuffle: "Swapped with" };
    toast.success(`${verbs[action]} ${target.person.name}`, { description: action === "assign" ? `Allocated to ${row.person.name}'s queue` : `${row.person.name} → ${target.person.name}` });
    onClose();
  };

  return (
    <Modal title={`${titleMap[action]} — ${row.person.name}`} onClose={onClose} wide>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Department">
            <select className={inputCls} value={filters.dept} onChange={(e) => setFilters((s) => ({ ...s, dept: e.target.value }))}>
              <option value="">All</option>
              {departments.map((d) => <option key={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Skill">
            <select className={inputCls} value={filters.skill} onChange={(e) => setFilters((s) => ({ ...s, skill: e.target.value }))}>
              <option value="">Any</option>
              {SKILLS_POOL.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label={`Min availability: ${filters.minAvailability}%`}>
            <input type="range" min={0} max={100} step={10} value={filters.minAvailability}
              onChange={(e) => setFilters((s) => ({ ...s, minAvailability: Number(e.target.value) }))} className="w-full" />
          </Field>
        </div>
        <div className="max-h-80 overflow-y-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Resource</th>
                <th className="px-3 py-2 font-medium">Department</th>
                <th className="px-3 py-2 font-medium">Utilization</th>
                <th className="px-3 py-2 font-medium">Availability</th>
                <th className="px-3 py-2 font-medium">Allocation</th>
                <th className="px-3 py-2 font-medium">Skills</th>
                <th className="px-3 py-2 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {candidates.map((c) => (
                <tr key={c.person.id} className="hover:bg-accent/30">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2"><Avatar name={c.person.name} size={22} /><span className="text-xs font-medium">{c.person.name}</span></div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{c.department}</td>
                  <td className="px-3 py-2.5 tabular-nums text-xs">{c.utilization}%</td>
                  <td className="px-3 py-2.5 tabular-nums text-xs">{c.availability}%</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5"><ProgressBar value={c.allocation} className="w-16" /><span className="text-[11px] tabular-nums text-muted-foreground">{c.allocation}%</span></div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">{c.skills.slice(0, 3).map((s) => <span key={s} className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{s}</span>)}</div>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button onClick={() => submit(c)}
                      className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground hover:bg-primary/90">
                      <Check className="h-3 w-3" /> {ctaMap[action]}
                    </button>
                  </td>
                </tr>
              ))}
              {candidates.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-xs text-muted-foreground">No eligible candidates match the filters</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <button onClick={onClose} className="rounded-md border border-input bg-card px-3 py-1.5 text-xs hover:bg-accent">Cancel</button>
        </div>
      </div>
    </Modal>
  );
}

function MetricRow({ label, value, bar }: { label: string; value: string; bar: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]"><span className="text-muted-foreground">{label}</span><span className="font-medium tabular-nums">{value}</span></div>
      <ProgressBar value={bar} />
    </div>
  );
}

const inputCls = "h-9 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
