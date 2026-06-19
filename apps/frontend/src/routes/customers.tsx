import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { LayoutGrid, List, Search, ArrowRight, X, Building2, Plus, ChevronRight, Check } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { useRoleContext } from "@/lib/role-context";
import { type Client } from "@/lib/mock-data";
import { HealthPill, StatusPill, ProgressBar } from "@/components/pills";
import { Modal, Field } from "@/routes/projects.index";
import { dhStore, useDhStore, allClients, allProjects } from "@/lib/dh-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/customers")({
  head: () => ({
    meta: [
      { title: "Customers — Pulse PMO" },
      { name: "description", content: "All customers, projects and engagement health." },
    ],
  }),
  component: CustomersPage,
});

function CustomersPage() {
  const { isDhanshree } = useRoleContext();
  const [view, setView] = useState<"card" | "list">("card");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [openNew, setOpenNew] = useState(false);

  // Subscribe to store so newly created clients/projects appear immediately
  const extraCount = useDhStore((s) => s.extraClients.length + s.extraProjects.length);
  const clients = useMemo(() => allClients(), [extraCount]);
  const projects = useMemo(() => allProjects(), [extraCount]);

  if (!isDhanshree) return <Navigate to="/" />;

  const enriched = useMemo(() => clients.map((c) => {
    const projs = projects.filter((p) => p.clientId === c.id);
    return {
      client: c,
      total: projs.length,
      active: projs.filter((p) => p.status === "ongoing").length,
      completed: projs.filter((p) => p.status === "completed").length,
    };
  }), [clients, projects]);

  const filtered = enriched.filter(({ client: c }) =>
    !q.trim() || [c.name, c.industry].some((v) => v.toLowerCase().includes(q.toLowerCase())));

  const open = openId ? clients.find((c) => c.id === openId) : null;

  return (
    <AppShell title="Customers" subtitle="Client directory with active and completed engagements">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search customer or industry…"
            className="h-9 w-full rounded-md border border-input bg-card pl-8 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex gap-1 rounded-lg border border-border bg-card p-1 text-xs shadow-sm">
            <button onClick={() => setView("card")}
              className={cn("inline-flex items-center gap-1 rounded-md px-2.5 py-1",
                view === "card" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
              <LayoutGrid className="h-3.5 w-3.5" /> Card
            </button>
            <button onClick={() => setView("list")}
              className={cn("inline-flex items-center gap-1 rounded-md px-2.5 py-1",
                view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
              <List className="h-3.5 w-3.5" /> List
            </button>
          </div>
          <button onClick={() => setOpenNew(true)}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-3.5 w-3.5" /> New Client
          </button>
        </div>
      </div>

      {view === "card" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(({ client: c, total, active }) => (
            <article key={c.id} className="rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
              <header className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-info text-base font-semibold text-primary-foreground">
                  {c.logo}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.industry}</div>
                </div>
              </header>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div><dt className="text-muted-foreground">Projects</dt><dd className="font-semibold tabular-nums">{total}</dd></div>
                <div><dt className="text-muted-foreground">Active</dt><dd className="font-semibold tabular-nums text-info">{active}</dd></div>
              </dl>
              <Link to="/customer-detail/$clientId" params={{ clientId: c.id }}
                className="mt-4 inline-flex w-full items-center justify-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                View Details <ArrowRight className="h-3 w-3" />
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Client</th>
                <th className="px-3 py-2 font-medium">Industry</th>
                <th className="px-3 py-2 font-medium">Total</th>
                <th className="px-3 py-2 font-medium">Active</th>
                <th className="px-3 py-2 font-medium">Completed</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(({ client: c, total, active, completed }) => (
                <tr key={c.id} className="hover:bg-accent/30">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-primary to-info text-[11px] font-semibold text-primary-foreground">{c.logo}</span>
                      <span className="font-medium">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{c.industry}</td>
                  <td className="px-3 py-2.5 tabular-nums">{total}</td>
                  <td className="px-3 py-2.5 tabular-nums text-info">{active}</td>
                  <td className="px-3 py-2.5 tabular-nums text-success">{completed}</td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">Active</span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Link to="/customer-detail/$clientId" params={{ clientId: c.id }} className="inline-flex items-center gap-1 rounded-md border border-input bg-card px-2.5 py-1 text-xs hover:bg-accent">
                      Open <ArrowRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && <CustomerDrawer client={open} onClose={() => setOpenId(null)} />}
      {openNew && <NewClientModal onClose={() => setOpenNew(false)} />}
    </AppShell>
  );
}

// ---------- New Client onboarding (stepper) ----------
interface NewClientState {
  name: string; company: string; industry: string; contact: string;
  email: string; phone: string; address: string; businessType: string; notes: string;
}

function NewClientModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [s, setS] = useState<NewClientState>({
    name: "", company: "", industry: "", contact: "", email: "", phone: "",
    address: "", businessType: "Enterprise", notes: "",
  });
  const u = (k: keyof NewClientState, v: string) => setS((p) => ({ ...p, [k]: v }));

  const stepValid = () => {
    if (step === 1) return s.name.trim() && s.company.trim() && s.industry.trim();
    if (step === 2) return s.email.trim() && s.contact.trim();
    return true;
  };

  const submit = () => {
    setSubmitting(true);
    setTimeout(() => {
      dhStore.addClient({ name: s.name, industry: s.industry || "Other", contact: s.email });
      toast.success("Client onboarded", { description: `${s.name} added to your directory.` });
      setSubmitting(false);
      onClose();
    }, 500);
  };

  return (
    <Modal title="New Client Onboarding" onClose={onClose} wide>
      <div className="mb-5 flex items-center gap-2 text-xs">
        {["Company", "Contact", "Review"].map((label, i) => {
          const n = i + 1; const active = step === n; const done = step > n;
          return (
            <div key={label} className="flex items-center gap-2">
              <div className={cn("flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold",
                done ? "border-success bg-success text-success-foreground"
                : active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground")}>
                {done ? <Check className="h-3 w-3" /> : n}
              </div>
              <span className={cn("font-medium", active ? "text-foreground" : "text-muted-foreground")}>{label}</span>
              {i < 2 && <ChevronRight className="mx-1 h-3.5 w-3.5 text-muted-foreground" />}
            </div>
          );
        })}
      </div>

      {step === 1 && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Client Name" required><input className={inputCls} value={s.name} onChange={(e) => u("name", e.target.value)} /></Field>
          <Field label="Company Name" required><input className={inputCls} value={s.company} onChange={(e) => u("company", e.target.value)} /></Field>
          <Field label="Industry" required>
            <select className={inputCls} value={s.industry} onChange={(e) => u("industry", e.target.value)}>
              <option value="">Select industry</option>
              {["Banking", "Healthcare", "Retail", "Logistics", "Energy", "Manufacturing", "Telecom", "Media"].map((o) => <option key={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Business Type">
            <select className={inputCls} value={s.businessType} onChange={(e) => u("businessType", e.target.value)}>
              {["Enterprise", "Mid-Market", "SMB", "Public Sector"].map((o) => <option key={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <textarea rows={2} className={cn(inputCls, "py-2")} value={s.address} onChange={(e) => u("address", e.target.value)} />
          </Field>
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Contact Person" required><input className={inputCls} value={s.contact} onChange={(e) => u("contact", e.target.value)} /></Field>
          <Field label="Email" required><input type="email" className={inputCls} value={s.email} onChange={(e) => u("email", e.target.value)} /></Field>
          <Field label="Phone"><input className={inputCls} value={s.phone} onChange={(e) => u("phone", e.target.value)} /></Field>
          <Field label="Notes" className="sm:col-span-2">
            <textarea rows={3} className={cn(inputCls, "py-2")} value={s.notes} onChange={(e) => u("notes", e.target.value)} />
          </Field>
        </div>
      )}

      {step === 3 && (
        <div className="rounded-lg border border-border bg-accent/20 p-4">
          <h4 className="mb-3 text-sm font-semibold">Client Summary</h4>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <Row label="Client" v={s.name} />
            <Row label="Company" v={s.company} />
            <Row label="Industry" v={s.industry} />
            <Row label="Business Type" v={s.businessType} />
            <Row label="Contact" v={s.contact} />
            <Row label="Email" v={s.email} />
            <Row label="Phone" v={s.phone || "—"} />
            <Row label="Address" v={s.address || "—"} />
          </dl>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
        <button onClick={() => (step === 1 ? onClose() : setStep(step - 1))}
          className="rounded-md border border-input bg-card px-3 py-1.5 text-xs hover:bg-accent">
          {step === 1 ? "Cancel" : "Back"}
        </button>
        {step < 3 ? (
          <button onClick={() => { if (!stepValid()) return toast.error("Please complete required fields"); setStep(step + 1); }}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
            Next <ArrowRight className="h-3 w-3" />
          </button>
        ) : (
          <button disabled={submitting} onClick={submit}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {submitting ? "Submitting…" : "Submit"}
          </button>
        )}
      </div>
    </Modal>
  );
}

const inputCls = "h-9 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
const Row = ({ label, v }: { label: string; v: string }) => (<><dt className="text-muted-foreground">{label}</dt><dd className="font-medium">{v || "—"}</dd></>);

function CustomerDrawer({ client, onClose }: { client: Client; onClose: () => void }) {
  const projects = allProjects();
  const projs = projects.filter((p) => p.clientId === client.id);
  const active = projs.filter((p) => p.status !== "completed");
  const completed = projs.filter((p) => p.status === "completed");
  return (
    <div className="fixed inset-0 z-40 flex items-stretch justify-end bg-black/30" onClick={onClose}>
      <div className="w-full max-w-2xl overflow-y-auto bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-info text-base font-semibold text-primary-foreground">{client.logo}</div>
          <div className="flex-1">
            <h2 className="text-base font-semibold">{client.name}</h2>
            <p className="text-xs text-muted-foreground">{client.industry} · {client.contact}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-2 hover:bg-accent" aria-label="Close"><X className="h-4 w-4" /></button>
        </header>

        <Section title="Active Projects" projs={active} empty="No active projects" />
        <Section title="Completed Projects" projs={completed} empty="No completed projects" />
      </div>
    </div>
  );
}

function Section({ title, projs, empty }: { title: string; projs: ReturnType<typeof allProjects>; empty: string }) {
  return (
    <section className="border-b border-border p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Building2 className="h-4 w-4 text-muted-foreground" />{title} · {projs.length}</h3>
      {projs.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {projs.map((p) => (
            <li key={p.id}>
              <Link to="/projects/$projectId" params={{ projectId: p.id }}
                className="block rounded-lg border border-border bg-background p-3 hover:bg-accent/40">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{p.name}</span>
                  <HealthPill status={p.health} />
                  <StatusPill status={p.status} />
                  <span className="ml-auto text-xs tabular-nums text-muted-foreground">{p.progress}%</span>
                </div>
                <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{p.description}</p>
                <ProgressBar value={p.progress} className="mt-2" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
