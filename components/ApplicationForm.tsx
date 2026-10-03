"use client";

// Join-the-network application. The form composes a structured mail to
// IFAGRITHM (nothing is stored server-side — same constraint as the project
// brief form). Approved applicants later receive a card-studio link.

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import "./application.css";

const EMAIL = "Ifagrithm@gmail.com";
const ROLES = [
  { id: "scout", title: "Research Scout", line: "Spot the communities, apps and behaviour shifts worth investigating, early." },
  { id: "partnership", title: "Partnership", line: "Bring IFAGRITHM in as a research partner for your team, project or community." },
  { id: "analyst", title: "Research Analyst", line: "Run structured investigations and turn raw onchain evidence into findings." },
] as const;
const DESKS = ["Consumer apps", "DeFi", "RWA", "Infrastructure", "Market intel"];

type Application = {
  fullName: string; x: string; telegram: string; email: string; country: string;
  role: string; desks: string[]; links: string; context: string; why: string;
};

const EMPTY: Application = {
  fullName: "", x: "", telegram: "", email: "", country: "",
  role: "", desks: [], links: "", context: "", why: "",
};

function roleLabel(role: string): string {
  return role === "scout" ? "Research Scout" : role === "analyst" ? "Research Analyst" : "Partnership";
}

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return diagonal ? (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
  );
}

export default function ApplicationForm() {
  const [form, setForm] = useState<Application>(EMPTY);
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copyFallback, setCopyFallback] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof Application>(key: K, value: Application[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  const toggleDesk = (desk: string) =>
    setForm(f => ({
      ...f,
      desks: f.desks.includes(desk) ? f.desks.filter(d => d !== desk) : [...f.desks, desk],
    }));

  // sections arrive as you reach them
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll("[data-reveal]"));
    if (!items.length) return;
    const io = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add("is-in"); io.unobserve(entry.target); }
    }, { threshold: 0.08 });
    items.forEach(item => io.observe(item));
    return () => io.disconnect();
  }, []);

  // after a successful submit, walk them back to the site
  useEffect(() => {
    if (!submitted) return;
    const t = setTimeout(() => { window.location.assign("/"); }, 9000);
    return () => clearTimeout(t);
  }, [submitted]);

  function applicationText(): string {
    return [
      "IFAGRITHM RESEARCH NETWORK APPLICATION",
      "",
      `Name: ${form.fullName.trim()}`,
      `X: ${form.x.trim()}`,
      `Telegram: ${form.telegram.trim()}`,
      `Email: ${form.email.trim()}`,
      `Country: ${form.country.trim()}`,
      `Role: ${roleLabel(form.role)}`,
      `Desks: ${form.desks.join(", ") || "None selected"}`,
      "",
      "Proof of work (links):",
      form.links.trim(),
      "",
      form.context.trim() ? `Context:\n${form.context.trim()}` : "",
      "",
      "Why IFAGRITHM:",
      form.why.trim(),
    ].filter(line => line !== "").join("\n");
  }

  function missing(): string | null {
    if (!form.fullName.trim() || !form.x.trim() || !form.telegram.trim() || !form.email.trim() || !form.country.trim()) {
      return "Complete your information in section 01.";
    }
    if (!form.role) return "Choose the role that fits you in section 02.";
    if (form.desks.length === 0) return "Pick at least one desk in section 02.";
    if (!form.links.trim()) return "Add links to your work in section 03.";
    if (form.why.trim().length < 40) return "Tell us a little more in section 04 — at least a couple of sentences.";
    return null;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const gap = missing();
    if (gap) { setStatus(gap); return; }
    setSending(true);
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          full_name: form.fullName.trim(),
          x_handle: form.x.trim(),
          telegram: form.telegram.trim(),
          email: form.email.trim(),
          country: form.country.trim(),
          role: form.role,
          desks: form.desks,
          links: form.links.trim(),
          context: form.context.trim(),
          why: form.why.trim(),
        }),
      });
      if (res.status === 201) {
        setSubmitted(true);
        setStatus("");
        return;
      }
      const data = await res.json().catch(() => null);
      setStatus(
        res.status >= 500
          ? `We couldn't receive it just now — use Copy application and email it to ${EMAIL}.`
          : data?.error || "Something went wrong — check your details and try again."
      );
    } catch {
      setStatus(`Network error — use Copy application and email it to ${EMAIL}.`);
    } finally {
      setSending(false);
    }
  }

  async function copyApplication() {
    const gap = missing();
    if (gap) { setStatus(gap); return; }
    const text = applicationText();
    try {
      await navigator.clipboard.writeText(text);
      setCopyFallback("");
      setStatus("Application copied. Paste it into an email to " + EMAIL + ".");
    } catch {
      setCopyFallback(text);
      setStatus("Automatic copying is unavailable. Select and copy your application below, then email it to us.");
    }
  }

  return (
    <div className="apply" ref={rootRef}>
      <a className="skip-link" href="#apply-main">Skip to content</a>

      <header className="apply-header">
        <div className="shell apply-header-inner">
          <Link className="apply-back" href="/">← ifagrithm.site</Link>
          <span className="apply-tag">RESEARCH NETWORK · APPLICATION</span>
        </div>
      </header>

      <main id="apply-main">
        <section className="apply-hero">
          <div className="shell">
            <p className="eyebrow" data-reveal>JOIN THE NETWORK</p>
            <h1 data-reveal>Investigate the frontier<br /><span>with us.</span></h1>
            <p className="apply-intro" data-reveal>
              IFAGRITHM is a Web3 data &amp; research consultancy. We are building a network of
              Research Scouts and Research Analysts to work on investigations across consumer apps,
              DeFi, RWA, infrastructure and the wider Web3 market.
            </p>
            <p className="apply-minutes" data-reveal>Takes about 5–10 minutes.</p>
          </div>
        </section>

        <div className="shell apply-grid">
          {submitted ? (
            <div className="apply-success" role="status">
              <svg className="apply-check" viewBox="0 0 72 72" aria-hidden="true">
                <circle cx="36" cy="36" r="33" />
                <path d="M22 37.5 32 47.5 50 27" />
              </svg>
              <h2>Application received.</h2>
              <p>We read every application and reply to each one. If it is a fit, you get an approval mail with your desk and a link to claim your card.</p>
              <Link className="primary" href="/">Back to the site <Arrow diagonal /></Link>
              <p className="apply-return-note">Taking you back to the site…</p>
            </div>
          ) : (
            <form className="apply-form" onSubmit={submit} noValidate>
            {/* 01 — identity */}
            <fieldset className="apply-block" data-reveal>
              <legend><i>01</i> Your information</legend>
              <div className="apply-row">
                <label htmlFor="ap-name"><span>Full name <span aria-hidden="true">*</span></span>
                  <input id="ap-name" required autoComplete="name" maxLength={120} value={form.fullName} onChange={e => set("fullName", e.target.value)} />
                </label>
                <label htmlFor="ap-x"><span>X handle <span aria-hidden="true">*</span></span>
                  <input id="ap-x" required placeholder="@handle" maxLength={16} value={form.x} onChange={e => set("x", e.target.value)} />
                </label>
              </div>
              <div className="apply-row">
                <label htmlFor="ap-telegram"><span>Telegram <span aria-hidden="true">*</span></span>
                  <input id="ap-telegram" required placeholder="@handle" maxLength={32} value={form.telegram} onChange={e => set("telegram", e.target.value)} />
                </label>
                <label htmlFor="ap-email"><span>Email <span aria-hidden="true">*</span></span>
                  <input id="ap-email" required type="email" autoComplete="email" maxLength={254} value={form.email} onChange={e => set("email", e.target.value)} />
                </label>
              </div>
              <label htmlFor="ap-country"><span>Country <span aria-hidden="true">*</span></span>
                <input id="ap-country" required autoComplete="country-name" maxLength={80} value={form.country} onChange={e => set("country", e.target.value)} />
              </label>
            </fieldset>

            {/* 02 — role */}
            <fieldset className="apply-block" data-reveal>
              <legend><i>02</i> Your role</legend>
              <div className="apply-roles" role="radiogroup" aria-label="Role">
                {ROLES.map(role => (
                  <button
                    key={role.id}
                    type="button"
                    role="radio"
                    aria-checked={form.role === role.id}
                    className={`apply-role${form.role === role.id ? " is-on" : ""}`}
                    onClick={() => set("role", role.id)}
                  >
                    <span className="apply-role-title">{role.title}</span>
                    <span className="apply-role-line">{role.line}</span>
                  </button>
                ))}
              </div>
              <p className="apply-label">Which desks fit you? <span aria-hidden="true">*</span></p>
              <div className="apply-desks" role="group" aria-label="Desks">
                {DESKS.map(desk => (
                  <button key={desk} type="button" aria-pressed={form.desks.includes(desk)} className={`apply-chip${form.desks.includes(desk) ? " is-on" : ""}`} onClick={() => toggleDesk(desk)}>
                    {desk}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* 03 — proof */}
            <fieldset className="apply-block" data-reveal>
              <legend><i>03</i> Proof of work</legend>
              <label htmlFor="ap-links"><span>Links to things you have researched, built or published <span aria-hidden="true">*</span></span>
                <textarea id="ap-links" required rows={3} maxLength={4000} placeholder="X threads, Dune dashboards, GitHub, Notion, articles — one per line" value={form.links} onChange={e => set("links", e.target.value)} />
              </label>
              <label htmlFor="ap-context"><span>Anything we should know about them <span className="apply-optional">(optional)</span></span>
                <textarea id="ap-context" rows={3} maxLength={2000} value={form.context} onChange={e => set("context", e.target.value)} />
              </label>
            </fieldset>

            {/* 04 — motivation */}
            <fieldset className="apply-block" data-reveal>
              <legend><i>04</i> Why you</legend>
              <label htmlFor="ap-why"><span>What makes you a fit for the network? <span aria-hidden="true">*</span></span>
                <textarea id="ap-why" required rows={5} maxLength={4000} value={form.why} onChange={e => set("why", e.target.value)} />
              </label>
            </fieldset>

            <div className="apply-actions" data-reveal>
              <button className="primary" type="submit" disabled={sending}>{sending ? "Sending…" : "Submit application"} <Arrow diagonal /></button>
              <button className="apply-copy" type="button" onClick={copyApplication}>Copy application <Arrow /></button>
            </div>
            <p className="apply-helper" data-reveal>Goes straight to the review inbox — we reply to every application we receive.</p>
            <p className="apply-status" role="status" data-reveal>{status}</p>
            {copyFallback && (
              <label className="apply-fallback" htmlFor="ap-fallback">Your application to copy
                <textarea id="ap-fallback" readOnly value={copyFallback} rows={10} onFocus={e => e.currentTarget.select()} />
              </label>
            )}
            </form>
          )}

          <aside className="apply-side" data-reveal aria-label="What happens next">
            <p className="apply-side-eyebrow">WHAT HAPPENS NEXT</p>
            <ol className="apply-steps">
              <li><span>01</span><div><h3>Apply</h3><p>Fill the form and send it in.</p></div></li>
              <li><span>02</span><div><h3>We review</h3><p>We read every application.</p></div></li>
              <li><span>03</span><div><h3>You get a mail</h3><p>If it is a fit, we send you an approval mail.</p></div></li>
              <li><span>04</span><div><h3>Your card</h3><p>Open the link, add your photo, download your card.</p></div></li>
            </ol>
          </aside>
        </div>

        <footer className="apply-footer">
          <div className="shell apply-footer-inner">
            <small>© {new Date().getFullYear()} IFAGRITHM — Web3 Research &amp; Intelligence</small>
            <Link href="/">Main site <Arrow diagonal /></Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
