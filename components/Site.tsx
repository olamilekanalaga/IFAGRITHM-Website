"use client";

import Image from "next/image";
import { type FormEvent, useEffect, useRef, useState } from "react";
import HeroScene from "./HeroScene";

const X_URL = "https://x.com/ifagrithm?s=11";
const LINKEDIN_URL = "https://www.linkedin.com/company/ifagrithm/";
const EMAIL = "Ifagrithm@gmail.com";

const heroChips = ["User research", "Market intelligence", "Growth research"];

const services = [
  {
    title: "User & Behaviour Research",
    description: "Understand how people use your product, what different user groups do, and how activity changes over time. We map the segments that exist today and show how behaviour shifts as the product and its market move.",
    outputs: ["Behaviour segments", "User journey analysis", "Retention and activity research"],
    motif: "segments",
  },
  {
    title: "Market & Competitor Intelligence",
    description: "Investigate competing products, market activity and the alternatives your users already choose. Know where you actually stand: who else is competing for the same behaviour, and on what terms.",
    outputs: ["Competitor studies", "Market briefs", "Product comparisons"],
    motif: "candles",
  },
  {
    title: "Growth & Distribution Research",
    description: "Investigate where relevant audiences already are and assess channels, communities and partnerships worth testing. Growth research here means evidence about the real places people gather, not a checklist of channels.",
    outputs: ["Audience research", "Distribution maps", "Partnership assessments"],
    motif: "network",
  },
  {
    title: "Decision Research & Measurement",
    description: "Combine evidence around a business question, then measure what happens when a team acts on it. The work circles back to a decision: assemble the evidence, act on it, and check what actually happened.",
    outputs: ["Decision briefs", "Intervention analysis", "Custom analytical studies"],
    motif: "fork",
  },
];

const tickerItems = services.flatMap(service => service.outputs);

const evidence = [
  {
    title: "On-chain activity",
    text: "What wallets actually do: where activity concentrates, how it moves between products, and how it changes over time. Raw activity becomes a picture of behaviour once it is grouped, compared and watched across weeks rather than moments.",
    viz: "bars",
  },
  {
    title: "Market information",
    text: "How competing products are positioned, where activity in the market happens, and what alternatives people already choose. It is the context that turns an isolated pattern into a finding you can act on with confidence.",
    viz: "line",
  },
  {
    title: "Qualitative research",
    text: "The reasons behind the patterns: what users say they do, what they actually mean, and where the two come apart. Numbers describe behaviour; conversations and communities explain it, and the gap between the two is usually where the insight lives.",
    viz: "dots",
  },
];

const approach = [
  ["Define the decision", "Agree on the question, the scope and what the research needs to inform. A narrow question with a clear owner beats a broad study nobody acts on."],
  ["Investigate the evidence", "Use on-chain activity, market information and qualitative research as the question requires. The mix is chosen for the decision, not for the sake of covering every source."],
  ["Deliver the findings", "Explain the patterns, limitations and practical options in a clear research brief. Written to be read, argued with and acted on, not filed away."],
];

const sectors = ["DeFi protocols", "Exchanges & wallets", "Infrastructure", "Consumer Web3", "Market makers"];

// Drafted strictly from claims already published on this site — pending approval before release.
const faq = [
  {
    q: "What does IFAGRITHM do?",
    a: "IFAGRITHM is a Web3 research and intelligence practice. We help Web3 teams understand what their users do, assess markets and competitors, and investigate where growth can come from — so product and growth decisions rest on evidence rather than assumption.",
  },
  {
    q: "Who do you work with?",
    a: "Web3 teams making product and growth decisions. Most briefs touch user behaviour, market position or distribution — from understanding early users to investigating new audiences, communities and partnerships.",
  },
  {
    q: "How does a project work?",
    a: "We agree on the decision the research needs to inform, investigate the evidence — on-chain activity, market information and qualitative research as the question requires — then deliver the findings in a clear research brief you can interrogate and use.",
  },
  {
    q: "What do we get at the end?",
    a: "A research brief built around your question: findings explained plainly, limitations stated and practical options for what to do next. Depending on the brief, that can be behaviour segments, competitor studies, distribution maps or a custom analytical study.",
  },
  {
    q: "What if our question is not fully formed yet?",
    a: "That is what the first step is for. Defining the decision — the question, the scope and what the research needs to inform — is part of the work, and a narrower question with a clear owner beats a broad study nobody acts on.",
  },
  {
    q: "How do we start?",
    a: "Tell us about your product and the decision you are working through. Use the project brief form below or email us directly.",
  },
];

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={diagonal ? "M6 18 18 6M6 6h12v12" : "M4 12h16m-6-6 6 6-6 6"} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function Brand() {
  return <a className="brand" href="#top" aria-label="IFAGRITHM home"><span className="logo-wrap"><Image src="/ifagrithm-logo.png" alt="" width={36} height={36} priority /></span><span>IFAGRITHM</span></a>;
}

function Words({ text, base = 0 }: { text: string; base?: number }) {
  return <>{text.split(" ").map((word, index) => <span className="w" key={`${word}-${index}`} style={{ animationDelay: `${base + index * 0.07}s` }}>{word}</span>)}</>;
}

function ResearchMap() {
  return <figure className="research-map" aria-labelledby="map-caption">
    <figcaption id="map-caption"><span className="map-title">Illustrative research map</span><span className="map-label">CONCEPTUAL ILLUSTRATION</span></figcaption>
    <div className="map-canvas">
      <svg className="map-connections" viewBox="0 0 480 390" preserveAspectRatio="none" fill="none" aria-hidden="true">
        <path d="M240 100v30H110v28M211 200h58M368 254v36H240v18" stroke="currentColor" strokeWidth="1.4" />
        <path d="m106 150 4 8 4-8M261 196l8 4-8 4M236 300l4 8 4-8" stroke="currentColor" strokeWidth="1.4" />
        <circle className="flow-spark" r="3"><animateMotion dur="5.2s" repeatCount="indefinite" path="M240 100v30H110v28" /></circle>
        <circle className="flow-spark" r="2.6"><animateMotion dur="2.2s" repeatCount="indefinite" path="M211 200h58" /></circle>
        <circle className="flow-spark" r="3"><animateMotion dur="5.2s" begin="-2.6s" repeatCount="indefinite" path="M368 254v36H240v18" /></circle>
      </svg>
      <div className="map-node node-activity"><span className="node-index">01 / OBSERVE</span><strong>Product activity</strong><span className="node-detail">How people use a product</span></div>
      <span className="mobile-connector" aria-hidden="true">↓</span>
      <div className="map-node node-segments"><span className="node-index">02 / UNDERSTAND</span><strong>User segments</strong></div>
      <span className="mobile-connector" aria-hidden="true">↓</span>
      <div className="map-node node-related"><span className="node-index">03 / INVESTIGATE</span><strong>Related products<br />and channels</strong></div>
      <span className="mobile-connector" aria-hidden="true">↓</span>
      <div className="map-node node-hypotheses"><span className="node-index">04 / EXPLORE</span><strong>Acquisition hypotheses</strong><span className="node-detail">Routes worth testing</span></div>
    </div>
  </figure>;
}

function EvidenceViz({ kind }: { kind: string }) {
  if (kind === "bars") return <div className="viz" aria-hidden="true"><div className="viz-bars">{Array.from({ length: 14 }).map((_, index) => <i key={index} style={{ height: `${28 + Math.abs(Math.sin(index * 1.7)) * 62}%`, animationDelay: `${index * 0.14}s` }} />)}</div></div>;
  if (kind === "line") return <div className="viz" aria-hidden="true"><svg className="viz-line" viewBox="0 0 200 56" preserveAspectRatio="none" fill="none"><path className="viz-flow" d="M0 44 C 24 40, 34 22, 52 26 S 84 48, 102 38 S 128 8, 148 14 S 182 30, 200 12" pathLength="100" stroke="var(--accent)" strokeWidth="1.6" /><path d="M0 44 C 24 40, 34 22, 52 26 S 84 48, 102 38 S 128 8, 148 14 S 182 30, 200 12 V 56 H 0 Z" fill="var(--accent)" opacity=".07" /></svg></div>;
  return <div className="viz" aria-hidden="true"><div className="viz-dots">{Array.from({ length: 16 }).map((_, index) => <i key={index} style={{ left: `${6 + (index % 8) * 12.5}%`, top: `${18 + Math.abs(Math.cos(index * 2.1)) * 58}%`, width: `${7 + (index % 4) * 3}px`, height: `${7 + (index % 4) * 3}px`, opacity: 0.35 + (index % 5) * 0.13, animationDelay: `${index * 0.3}s` }} />)}</div></div>;
}

// One unique motif per service row. No repeats anywhere else on the page.
function RowViz({ kind }: { kind: string }) {
  if (kind === "segments") return <div className="rowviz" aria-hidden="true">
    <svg className="rv-donut" viewBox="0 0 120 120" fill="none">
      <circle cx="60" cy="60" r="42" stroke="var(--line)" strokeWidth="12" />
      <circle className="rv-seg" cx="60" cy="60" r="42" stroke="var(--accent)" strokeWidth="12" strokeDasharray="58 206" strokeDashoffset="0" transform="rotate(-90 60 60)" />
      <circle className="rv-seg rv-seg-2" cx="60" cy="60" r="42" stroke="var(--accent)" strokeWidth="12" strokeDasharray="34 230" strokeDashoffset="-70" transform="rotate(-90 60 60)" opacity=".55" />
      <circle className="rv-seg rv-seg-3" cx="60" cy="60" r="42" stroke="var(--accent)" strokeWidth="12" strokeDasharray="22 242" strokeDashoffset="-116" transform="rotate(-90 60 60)" opacity=".3" />
      <circle cx="60" cy="60" r="5" fill="var(--accent)" />
    </svg>
  </div>;
  if (kind === "candles") return <div className="rowviz" aria-hidden="true">
    <svg className="rv-candles" viewBox="0 0 200 84" preserveAspectRatio="none" fill="none">
      {Array.from({ length: 9 }).map((_, index) => {
        const up = index % 2 === 0;
        const bodyH = 12 + Math.abs(Math.sin(index * 1.3)) * 22;
        const y = up ? 46 - bodyH : 38;
        return <g key={index} opacity={0.45 + (index / 9) * 0.55}>
          <line x1={12 + index * 22} y1={y - 8} x2={12 + index * 22} y2={y + bodyH + 8} stroke="var(--accent)" strokeWidth="1.2" />
          <rect x={8 + index * 22} y={y} width="8" height={bodyH} fill="var(--accent)" opacity={up ? 0.9 : 0.4} rx="1.5" />
        </g>;
      })}
      <path className="viz-flow" d="M6 62 C 40 54, 60 40, 92 44 S 150 22, 196 14" pathLength="100" stroke="var(--accent)" strokeWidth="1.4" strokeDasharray="4 6" opacity=".8" />
    </svg>
  </div>;
  if (kind === "network") return <div className="rowviz" aria-hidden="true">
    <svg className="rv-net" viewBox="0 0 200 84" fill="none">
      <path d="M20 62 L64 26 L112 48 L156 18 M64 26 L96 66 L156 18 M112 48 L176 60" stroke="var(--accent)" strokeWidth="1" opacity=".3" />
      {[[20, 62], [64, 26], [112, 48], [156, 18], [96, 66], [176, 60]].map(([x, y], index) => <circle key={index} cx={x} cy={y} r={index % 3 === 0 ? 5 : 3.4} fill="var(--accent)" opacity={0.5 + (index % 3) * 0.22} style={{ animationDelay: `${index * 0.5}s` }} className="rv-node" />)}
      <circle className="rv-pulse" r="2.6" fill="var(--accent)"><animateMotion dur="6s" repeatCount="indefinite" path="M20 62 L64 26 L112 48 L156 18" /></circle>
    </svg>
  </div>;
  return <div className="rowviz" aria-hidden="true">
    <svg className="rv-fork" viewBox="0 0 200 84" fill="none">
      <path d="M8 42 H 84" stroke="var(--accent)" strokeWidth="1.6" />
      <path className="rv-branch" d="M84 42 C 110 42, 118 20, 146 18 H 186" stroke="var(--accent)" strokeWidth="1.4" opacity=".75" />
      <path className="rv-branch rv-branch-2" d="M84 42 C 112 42, 122 44, 148 44 H 186" stroke="var(--accent)" strokeWidth="1.4" opacity=".45" strokeDasharray="5 6" />
      <path className="rv-branch rv-branch-3" d="M84 42 C 110 42, 118 64, 146 66 H 186" stroke="var(--accent)" strokeWidth="1.4" opacity=".3" strokeDasharray="5 6" />
      <circle cx="190" cy="18" r="4" fill="var(--accent)" />
      <circle cx="190" cy="44" r="3" fill="var(--accent)" opacity=".45" />
      <circle cx="190" cy="66" r="3" fill="var(--accent)" opacity=".28" />
      <circle className="rv-pulse" r="2.6" fill="var(--accent)"><animateMotion dur="5s" repeatCount="indefinite" path="M8 42 H 84 C 110 42, 118 20, 146 18 H 186" /></circle>
    </svg>
  </div>;
}

export default function Site() {
  const [menu, setMenu] = useState(false);
  const [status, setStatus] = useState("");
  const [copyFallback, setCopyFallback] = useState("");
  const [brief, setBrief] = useState({ name: "", email: "", company: "", question: "" });
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("ifg-theme", next); } catch { /* private mode */ }
    setTheme(next);
  }

  useEffect(() => {
    if (!menu) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setMenu(false); menuButton.current?.focus(); }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menu]);

  // sections arrive as you reach them
  useEffect(() => {
    const items = Array.from(document.querySelectorAll("[data-reveal]"));
    if (!items.length) return;
    const io = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add("is-in"); io.unobserve(entry.target); }
    }, { threshold: 0.1 });
    items.forEach(item => io.observe(item));
    return () => io.disconnect();
  }, []);

  function briefText() {
    return `IFAGRITHM PROJECT BRIEF\n\nName: ${brief.name.trim()}\nWork email: ${brief.email.trim()}\nCompany: ${brief.company.trim() || "Not provided"}\n\nWhat would you like us to investigate?\n${brief.question.trim()}`;
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!brief.name.trim() || !brief.email.trim() || !brief.question.trim()) {
      setStatus("Please complete your name, work email and research question.");
      return;
    }
    const subject = `IFAGRITHM project brief${brief.company.trim() ? ` — ${brief.company.trim()}` : ""}`;
    const mailto = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(briefText())}`;
    setStatus("Review and send your brief in your email app. If it does not open, use Copy brief or the email link.");
    window.location.assign(mailto);
  }

  async function copyBrief() {
    const text = briefText();
    try {
      await navigator.clipboard.writeText(text);
      setCopyFallback("");
      setStatus("Brief copied. Paste it into an email when you are ready.");
    } catch {
      setCopyFallback(text);
      setStatus("Automatic copying is unavailable. Select and copy your brief below, then email it to us.");
    }
  }

  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header" id="top">
      <div className="shell header-inner">
        <Brand />
        <nav id="primary-navigation" aria-label="Main navigation" className={`nav-links${menu ? " is-open" : ""}`}>
          <a href="#services" onClick={() => setMenu(false)}>Services</a>
          <a href="#approach" onClick={() => setMenu(false)}>Approach</a>
          <a href="#faq" onClick={() => setMenu(false)}>FAQ</a>
          <a href="/application" onClick={() => setMenu(false)}>Join the network</a>
          <a className="nav-cta" href="#contact" onClick={() => setMenu(false)}>Discuss a project <Arrow diagonal /></a>
        </nav>
        <div className="nav-actions">
          <button className="icon-button theme-toggle" type="button" onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"} title="Toggle theme">
            {theme === "dark" ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="4.4" stroke="currentColor" strokeWidth="1.6" /><path d="M12 2.6v2.4M12 19v2.4M2.6 12H5m14 0h2.4M5.3 5.3l1.7 1.7m9.9 9.9 1.7 1.7m0-13.4-1.7 1.7M7 17l-1.7 1.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
            )}
          </button>
          <button ref={menuButton} className="icon-button menu-button" type="button" onClick={() => setMenu(current => !current)} aria-label={menu ? "Close menu" : "Open menu"} aria-expanded={menu} aria-controls="primary-navigation"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={menu ? "m6 6 12 12M6 18 18 6" : "M4 8h16M4 16h16"} stroke="currentColor" strokeWidth="1.5" /></svg></button>
        </div>
      </div>
    </header>

    <main id="main">
      <section className="hero" aria-labelledby="hero-title">
        <HeroScene variant={0} />
        <div className="hero-vignette" aria-hidden="true" />
        <div className="shell hero-inner">
          <div className="hero-copy">
            <p className="chip-row rise" style={{ animationDelay: ".1s" }}>{heroChips.map(chip => <span className="chip" key={chip}>{chip}</span>)}</p>
            <h1 id="hero-title" aria-label="Understand your users. Find where growth can come from.">
              <span className="line" aria-hidden="true"><Words text="Understand your users." base={0.25} /></span>
              <span className="line gold" aria-hidden="true"><Words text="Find where growth can come from." base={0.55} /></span>
            </h1>
            <p className="hero-body rise" style={{ animationDelay: "1.05s" }}>IFAGRITHM helps Web3 teams understand what their users do, identify meaningful behavioural segments, and investigate where similar users already are.</p>
            <div className="hero-actions rise" style={{ animationDelay: "1.2s" }}>
              <a className="primary" href="#contact">Discuss a project <Arrow diagonal /></a>
              <a className="quiet-link" href={`mailto:${EMAIL}`}>{EMAIL} <Arrow diagonal /></a>
            </div>
          </div>
        </div>
      </section>

      <div className="ticker" aria-hidden="true">
        <div className="ticker-track">{[...tickerItems, ...tickerItems].map((item, index) => <span className="ticker-item" key={`${item}-${index}`}><span className="ticker-mark">✦</span>{item}</span>)}</div>
      </div>

      <section className="services section" id="services" aria-labelledby="services-title" data-reveal>
        <div className="shell">
          <div className="section-heading"><p className="eyebrow">WHAT WE DO</p><h2 id="services-title">Research built around<br />your next decision.</h2></div>
          <div className="service-rows">{services.map((service, index) => <article className="service-row" key={service.title} data-reveal style={{ transitionDelay: `${index * 90}ms` }}>
            <span className="service-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <div className="service-main"><h3>{service.title}</h3><p>{service.description}</p></div>
            <div className="service-side"><span className="micro-label">Typical outputs</span><ul>{service.outputs.map(output => <li key={output}>{output}</li>)}</ul></div>
            <RowViz kind={service.motif} />
          </article>)}</div>
        </div>
      </section>

      <section className="evidence section" aria-labelledby="evidence-title" data-reveal>
        <div className="shell">
          <p className="eyebrow">WHAT GOES INTO THE RESEARCH</p>
          <h2 id="evidence-title">Three kinds of evidence.<br />One clear answer.</h2>
          <p className="section-sub">Every brief draws on a different mix of these, chosen for the decision in front of you. Individually each one says something; together they say something you can bet on.</p>
          <div className="evidence-grid">{evidence.map((item, index) => <article className="evidence-card" key={item.title} data-reveal style={{ transitionDelay: `${200 + index * 110}ms` }}>
            <EvidenceViz kind={item.viz} />
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>)}</div>
        </div>
      </section>

      <section className="mapband section" aria-labelledby="mapband-title" data-reveal>
        <div className="shell mapband-grid">
          <div className="mapband-copy">
            <p className="eyebrow">THE SHAPE OF A BRIEF</p>
            <h2 id="mapband-title">From product activity<br />to acquisition.</h2>
            <p>Every brief follows the same spine: observe what is happening, understand who it is happening with, investigate where similar people already are, then explore the routes worth testing.</p>
            <p>The steps flex to the question. Some briefs live entirely in the first two stages, others run the full route through to acquisition hypotheses and the measurement that follows.</p>
          </div>
          <ResearchMap />
        </div>
      </section>

      <section className="approach section" id="approach" aria-labelledby="approach-title" data-reveal>
        <span id="method" className="anchor-alias" aria-hidden="true" /><span id="about" className="anchor-alias" aria-hidden="true" />
        <div className="shell">
          <p className="eyebrow">HOW WE WORK</p>
          <h2 id="approach-title">A clear question. <span>Evidence you can inspect.</span> A useful next step.</h2>
          <p className="section-sub">Nothing in the process exists for its own sake. Each step ends with something you can read, question and use, and the brief is written for the people who have to make the call.</p>
          <ol className="approach-steps">{approach.map(([title, description], index) => <li key={title} data-reveal style={{ transitionDelay: `${200 + index * 120}ms` }}><span className="step-index">{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{description}</p></li>)}</ol>
        </div>
      </section>

      <section className="sectors" aria-label="Who we work with" data-reveal>
        <div className="shell sectors-inner">
          <p>Web3 teams making product and growth decisions. These are the lanes where the research usually lands.</p>
          <div className="sector-row">{sectors.map(sector => <span className="sector-chip" key={sector}>{sector}</span>)}</div>
        </div>
      </section>

      <section className="faq section" id="faq" aria-labelledby="faq-title" data-reveal>
        <div className="shell faq-grid">
          <div className="faq-copy">
            <p className="eyebrow">COMMON QUESTIONS</p>
            <h2 id="faq-title">Straight answers,<br />before you ask.</h2>
            <p className="faq-more">Something else on your mind? <a href="#contact">Tell us what you are trying to understand</a>.</p>
          </div>
          <div className="faq-list">{faq.map(item => <details className="faq-item" key={item.q}>
            <summary>{item.q}<span className="faq-icon" aria-hidden="true" /></summary>
            <p>{item.a}</p>
          </details>)}</div>
        </div>
      </section>

      <section className="contact section" id="contact" aria-labelledby="contact-title" data-reveal>
        <div className="shell contact-grid">
          <div className="contact-copy"><p className="eyebrow">START A PROJECT</p><h2 id="contact-title">What are you trying to understand?</h2><p>Tell us about your product and the decision you are working through.</p><a className="email-link" href={`mailto:${EMAIL}`}>{EMAIL} <Arrow diagonal /></a><div className="social-links"><a href={X_URL} target="_blank" rel="noopener noreferrer">X / @ifagrithm <Arrow diagonal /></a><a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer">LinkedIn <Arrow diagonal /></a></div></div>
          <form className="brief-form" onSubmit={submit}>
            <div className="form-row"><label htmlFor="brief-name">Name <span aria-hidden="true">*</span><input id="brief-name" name="name" required autoComplete="name" maxLength={200} value={brief.name} onChange={event => setBrief({ ...brief, name: event.target.value })} /></label><label htmlFor="brief-email">Work email <span aria-hidden="true">*</span><input id="brief-email" name="email" required type="email" autoComplete="email" maxLength={254} value={brief.email} onChange={event => setBrief({ ...brief, email: event.target.value })} /></label></div>
            <label htmlFor="brief-company">Company <span className="optional">(optional)</span><input id="brief-company" name="company" autoComplete="organization" maxLength={200} value={brief.company} onChange={event => setBrief({ ...brief, company: event.target.value })} /></label>
            <label htmlFor="brief-question">What would you like us to investigate? <span aria-hidden="true">*</span><textarea id="brief-question" name="question" required maxLength={4000} rows={5} value={brief.question} onChange={event => setBrief({ ...brief, question: event.target.value })} /></label>
            <div className="form-actions"><button className="primary" type="submit">Open email with your brief <Arrow diagonal /></button><button className="text-button" type="button" onClick={copyBrief}>Copy brief <Arrow /></button></div>
            <p className="form-helper">Opens your email app. Review and send your message there.</p>
            <p className="form-status" role="status">{status}</p>
            {copyFallback && <label className="copy-fallback" htmlFor="copy-fallback">Your brief to copy<textarea id="copy-fallback" readOnly value={copyFallback} rows={8} onFocus={event => event.currentTarget.select()} /></label>}
          </form>
        </div>
      </section>
    </main>

    <footer className="site-footer"><div className="shell footer-inner"><div><Brand /><p>Web3 research. Clearer decisions.</p></div><nav aria-label="Footer navigation"><a href="#services">Services</a><a href="#faq">FAQ</a><a href="#contact">Contact</a><a href="/application">Join the network</a><a href={X_URL} target="_blank" rel="noopener noreferrer">X <Arrow diagonal /></a><a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer">LinkedIn <Arrow diagonal /></a></nav><small>© {new Date().getFullYear()} IFAGRITHM</small></div><div className="footer-ghost" aria-hidden="true">IFAGRITHM</div></footer>
  </>;
}
