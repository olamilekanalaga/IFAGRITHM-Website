"use client";

// Network admin: one password, the application queue, Approve (requires
// picking a clearance) and Reject, an Excel export, and a sidebar with
// the counts and status views.

import { Fragment, useCallback, useEffect, useState } from "react";
import "./admin.css";

type Application = {
  id: number;
  created_at: string;
  full_name: string;
  x_handle: string;
  telegram: string;
  email: string;
  country: string;
  role: string;
  desks: string[];
  links: string;
  context: string;
  why: string;
  status: string;
  tier: string | null;
  claim_token: string | null;
  serial: string;
};

type Filter = "all" | "pending" | "approved" | "rejected";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All applications" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Declined" },
];
const TIERS = ["bronze", "silver", "gold"] as const;

function roleLabel(role: string): string {
  return role === "scout" ? "Research Scout" : role === "analyst" ? "Research Analyst" : "Partnership";
}

export default function AdminConsole() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [apps, setApps] = useState<Application[]>([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [openId, setOpenId] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [tierPick, setTierPick] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/applications", { cache: "no-store" });
    if (res.status === 401) { setAuthed(false); return; }
    if (!res.ok) { setError("Store unreachable — is the Contabo box up?"); setAuthed(true); return; }
    const data = await res.json();
    setApps(data.applications ?? []);
    setError("");
    setAuthed(true);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) { setError("Wrong password."); return; }
    setPassword("");
    load();
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setApps([]);
    setAuthed(false);
  }

  async function approve(id: number) {
    const tier = tierPick[id];
    if (!tier) { setError("Pick a clearance (bronze, silver or gold) before approving."); return; }
    setBusyId(id);
    setError("");
    try {
      const res = await fetch("/api/admin/approve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, tier }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Approve failed."); return; }
      setApps(rows => rows.map(r => r.id === id ? { ...r, status: "approved", tier, claim_token: data.claim_url?.split("t=")[1] ?? r.claim_token } : r));
      setNotes(n => ({ ...n, [id]: data.mail_error
        ? `Approved at ${tier}. Mail failed — ${data.mail_error}`
        : data.mail?.skipped
        ? `Approved at ${tier}. Mail skipped — no Resend key on the store yet.`
        : `Approved at ${tier}. Congratulations mail on its way.` }));
    } catch {
      setError("Approve failed — store unreachable.");
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: number) {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch("/api/admin/reject", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Reject failed."); return; }
      setApps(rows => rows.map(r => r.id === id ? { ...r, status: "rejected", claim_token: null } : r));
      setNotes(n => ({ ...n, [id]: data.mail_error
        ? `Rejected. Mail failed — ${data.mail_error}`
        : data.mail?.skipped
        ? "Rejected. Mail skipped — no Resend key on the store yet."
        : "Rejected. Decline mail on its way." }));
    } catch {
      setError("Reject failed — store unreachable.");
    } finally {
      setBusyId(null);
    }
  }

  async function copyClaim(id: number) {
    const claimUrl = `${window.location.origin}/network?t=${apps.find(a => a.id === id)?.claim_token ?? ""}`;
    try {
      await navigator.clipboard.writeText(claimUrl);
      setNotes(n => ({ ...n, [id]: "Claim link copied." }));
    } catch {
      setNotes(n => ({ ...n, [id]: claimUrl }));
    }
  }

  if (authed === null) {
    return <div className="adm-wrap"><p className="adm-status">Checking session…</p></div>;
  }

  if (!authed) {
    return (
      <div className="adm-wrap">
        <form className="adm-login" onSubmit={login}>
          <p className="adm-eyebrow">IFAGRITHM · NETWORK ADMIN</p>
          <h1>Sign in</h1>
          <input
            type="password"
            value={password}
            autoFocus
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            placeholder="Admin password"
            aria-label="Admin password"
          />
          <button className="adm-gold" type="submit" disabled={!password}>Enter</button>
          {error ? <p className="adm-error" role="alert">{error}</p> : null}
        </form>
      </div>
    );
  }

  const counts = {
    all: apps.length,
    pending: apps.filter(a => a.status === "pending").length,
    approved: apps.filter(a => a.status === "approved").length,
    rejected: apps.filter(a => a.status === "rejected").length,
  };
  const shown = filter === "all" ? apps : apps.filter(a => a.status === filter);

  return (
    <div className="adm-shell">
      <aside className="adm-side" aria-label="Overview">
        <p className="adm-eyebrow">IFAGRITHM · NETWORK ADMIN</p>
        <div className="adm-stats">
          <div className="adm-stat"><b>{counts.all}</b><span>total</span></div>
          <div className="adm-stat"><b>{counts.pending}</b><span>pending</span></div>
          <div className="adm-stat"><b>{counts.approved}</b><span>approved</span></div>
          <div className="adm-stat"><b>{counts.rejected}</b><span>declined</span></div>
        </div>
        <nav className="adm-filters" aria-label="Status views">
          {FILTERS.map(f => (
            <button
              key={f.id}
              type="button"
              className={`adm-filter${filter === f.id ? " is-on" : ""}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}<i>{counts[f.id]}</i>
            </button>
          ))}
        </nav>
        <a className="adm-export" href="/api/admin/export" download>Download Excel</a>
        <button className="adm-ghost" type="button" onClick={logout}>Sign out</button>
      </aside>

      <main className="adm-main">
        <header className="adm-head">
          <h1>Applications</h1>
          <button className="adm-ghost" type="button" onClick={load}>Refresh</button>
        </header>
        {error ? <p className="adm-error" role="alert">{error}</p> : null}

        {shown.length === 0 ? (
          <p className="adm-status">Nothing here yet.</p>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Serial</th><th>Applicant</th><th>Reach</th><th>Role / desk</th>
                  <th>Clearance</th><th></th><th>Status</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {shown.map(app => (
                  <Fragment key={app.id}>
                    <tr data-status={app.status} className={openId === app.id ? "is-open" : ""}>
                      <td>
                        <span className="adm-serial">{app.serial}</span>
                        <span className="adm-dim">{new Date(app.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>
                      </td>
                      <td>
                        <span className="adm-strong">{app.full_name}</span>
                        <span className="adm-dim">{app.country}</span>
                      </td>
                      <td>
                        <span>{app.x_handle}</span>
                        <span>{app.telegram}</span>
                        <span>{app.email}</span>
                      </td>
                      <td>
                        <span className="adm-strong">{roleLabel(app.role)}</span>
                        <span>{app.desks.join(", ")}</span>
                      </td>
                      <td>
                        {app.status === "pending" ? (
                          <span className="adm-tierpick" role="radiogroup" aria-label={`Clearance for ${app.full_name}`}>
                            {TIERS.map(t => (
                              <button
                                key={t}
                                type="button"
                                role="radio"
                                aria-checked={tierPick[app.id] === t}
                                data-tier={t}
                                className={`adm-tier-chip${tierPick[app.id] === t ? " is-on" : ""}`}
                                onClick={() => setTierPick(p => ({ ...p, [app.id]: t }))}
                              >
                                {t}
                              </button>
                            ))}
                          </span>
                        ) : (
                          <span className={`adm-tier-pill ${app.tier ?? "none"}`}>{app.tier ?? "—"}</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="adm-view"
                          type="button"
                          aria-expanded={openId === app.id}
                          onClick={() => setOpenId(current => current === app.id ? null : app.id)}
                        >
                          {openId === app.id ? "Hide" : "View"}
                        </button>
                      </td>
                      <td><span className={`adm-pill ${app.status}`}>{app.status}</span></td>
                      <td>
                        {app.status === "pending" ? (
                          <span className="adm-actions">
                            <button
                              className="adm-gold"
                              type="button"
                              disabled={busyId === app.id}
                              title={tierPick[app.id] ? `Approve at ${tierPick[app.id]}` : "Pick a clearance first"}
                              onClick={() => approve(app.id)}
                            >
                              {busyId === app.id ? "…" : "Approve"}
                            </button>
                            <button
                              className="adm-ghost"
                              type="button"
                              disabled={busyId === app.id}
                              onClick={() => reject(app.id)}
                            >
                              Reject
                            </button>
                          </span>
                        ) : app.status === "approved" ? (
                          <button className="adm-ghost" type="button" onClick={() => copyClaim(app.id)}>Copy claim link</button>
                        ) : null}
                        {notes[app.id] ? <span className="adm-note">{notes[app.id]}</span> : null}
                      </td>
                    </tr>
                    {openId === app.id ? (
                      <tr className="adm-expand">
                        <td colSpan={8}>
                          <div className="adm-expand-grid">
                            <section>
                              <h4>Proof of work</h4>
                              <p className="pre">{app.links}</p>
                              {app.context ? (
                                <>
                                  <h4>Context</h4>
                                  <p className="pre">{app.context}</p>
                                </>
                              ) : null}
                            </section>
                            <section>
                              <h4>Why IFAGRITHM</h4>
                              <p className="pre">{app.why}</p>
                            </section>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
