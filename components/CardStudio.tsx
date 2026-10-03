"use client";

// IFAGRITHM Network Card Studio.
// An approved member arrives via their claim link (/network?t=...) and the
// card comes pre-filled from their application — name, role, desk, clearance
// tier and their X profile photo. They can still fetch a different X photo,
// and everything exports client-side as a 1080x1350 PNG. Serial numbers
// live only in the admin console, never on the card.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toPng } from "html-to-image";
import "./network.css";

const ROLES = ["RESEARCH SCOUT", "PARTNERSHIP", "RESEARCH ANALYST"] as const;
const TIERS = ["BRONZE", "SILVER", "GOLD"] as const;
const DESK_LABELS = ["CONSUMER APPS", "DEFI", "RWA", "INFRASTRUCTURE", "MARKET INTEL"] as const;

type Role = (typeof ROLES)[number];
type Tier = (typeof TIERS)[number];
type Desk = "CONSUMER APPS" | "DEFI" | "RWA" | "INFRASTRUCTURE" | "MARKET INTEL";

type CardData = {
  name: string;
  role: Role;
  tier: Tier;
  desk: Desk;
  tagline: string;
  bio: string;
};

const SAMPLE: CardData = {
  name: "Tariq A.",
  role: "RESEARCH SCOUT",
  tier: "BRONZE",
  desk: "DEFI",
  tagline: "Mapping liquidity flows across African markets",
  bio: "Traces wallet cohorts and liquidity migration across L2s, turning raw onchain noise into signal.",
};

// demo photo lives in /public; production swaps this for the member's X photo
const SAMPLE_AVATAR = "/sample-dp.jpg";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "IF";
  return parts.slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

function readFileAsDataURL(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

export default function CardStudio() {
  const searchParams = useSearchParams();
  const claimToken = searchParams.get("t");
  const [data, setData] = useState<CardData>(SAMPLE);
  const [avatar, setAvatar] = useState<string | null>(SAMPLE_AVATAR);
  const [claim, setClaim] = useState<{ name: string; serial: string } | null>(null);
  const [claimState, setClaimState] = useState<"idle" | "ok" | "invalid">("idle");
  const [xHandle, setXHandle] = useState("");
  const [xStatus, setXStatus] = useState<"idle" | "loading" | "miss" | "error">("idle");
  const [exporting, setExporting] = useState(false);
  const [exportNote, setExportNote] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [fontsTick, setFontsTick] = useState(0);

  const cardRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLHeadingElement>(null);
  const taglineRef = useRef<HTMLParagraphElement>(null);

  const set = <K extends keyof CardData>(key: K, value: CardData[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  // boot animation once mounted (direct set — rAF can be throttled to
  // oblivion in background/headless tabs and the entrance would never run)
  useEffect(() => {
    setLive(true);
  }, []);

  // webfonts land after first paint — re-fit once they do
  useEffect(() => {
    let alive = true;
    document.fonts.ready.then(() => { if (alive) setFontsTick((t) => t + 1); });
    return () => { alive = false; };
  }, []);

  const fetchAvatar = useCallback(async (handle: string) => {
    const clean = handle.trim().replace(/^@/, "");
    if (!/^[A-Za-z0-9_]{1,15}$/.test(clean)) {
      setXStatus("error");
      return false;
    }
    setXStatus("loading");
    try {
      const res = await fetch(`/api/avatar?handle=${encodeURIComponent(clean)}`);
      if (!res.ok) throw new Error(res.status === 404 ? "miss" : "error");
      setAvatar(await readFileAsDataURL(await res.blob()));
      setXStatus("idle");
      return true;
    } catch (err) {
      setXStatus(err instanceof Error && err.message === "miss" ? "miss" : "error");
      return false;
    }
  }, []);

  // an approved member arrives via a claim link: /network?t=<token>
  useEffect(() => {
    if (!/^[a-f0-9]{48}$/.test(claimToken ?? "")) {
      if (claimToken) setClaimState("invalid");
      return;
    }
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/claim?t=${claimToken}`);
        if (!res.ok) throw new Error();
        const info = await res.json();
        if (!alive) return;
        const desk = DESK_LABELS.find(d => d === String(info.desk ?? "").toUpperCase());
        const tier = TIERS.find(t => t === String(info.tier ?? "").toUpperCase());
        setData(d => ({
          ...d,
          name: info.name || d.name,
          role: (ROLES as readonly string[]).includes(info.role) ? info.role as Role : d.role,
          desk: desk ?? d.desk,
          tier: tier ?? d.tier,
        }));
        setXHandle(info.x_handle ?? "");
        setAvatar(null); // their card, their photo — fetched next line
        setClaim({ name: info.name ?? "", serial: info.serial ?? "" });
        setClaimState("ok");
        if (info.x_handle) void fetchAvatar(String(info.x_handle));
      } catch {
        if (alive) setClaimState("invalid");
      }
    })();
    return () => { alive = false; };
  }, [claimToken, fetchAvatar]);

  // long names/taglines shrink to fit the card instead of overflowing
  useLayoutEffect(() => {
    const fit = (el: HTMLElement | null, maxWidth: number, start: number, min: number) => {
      if (!el) return;
      el.style.fontSize = `${start}px`;
      let size = start;
      while (size > min && el.scrollWidth > maxWidth) {
        size -= 2;
        el.style.fontSize = `${size}px`;
      }
    };
    fit(nameRef.current, 860, 118, 62);
    fit(taglineRef.current, 800, 26, 17);
  }, [data.name, data.tagline, fontsTick]);

  // scale the fixed 1080x1350 canvas into whatever space the shell has
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const ro = new ResizeObserver(() => {
      const scale = shell.clientWidth / 1080;
      shell.style.setProperty("--card-scale", String(scale));
    });
    ro.observe(shell);
    return () => ro.disconnect();
  }, []);

  const download = useCallback(async () => {
    const node = cardRef.current;
    if (!node || exporting) return;
    setExporting(true);
    setExportNote(null);
    node.classList.add("is-export");
    const options = {
      width: 1080,
      height: 1350,
      pixelRatio: 1,
      backgroundColor: "#060607",
      // the preview scales the card into its shell via transform on the
      // node itself — the clone must render at natural size
      style: { transform: "none", transformOrigin: "top left" as const },
    };
    try {
      await document.fonts.ready;
      // render twice: the first pass primes image/font inlining, which
      // Safari and some mobile browsers otherwise miss (blank exports)
      await toPng(node, options);
      const url = await toPng(node, options);
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], `IFAGRITHM-${data.name.trim().replace(/\s+/g, "-") || "card"}.png`, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (data: { files?: File[] }) => boolean };
      // iOS Safari ignores the download attribute — hand it to the share
      // sheet (Save Image), falling back to opening it in a new tab
      if (nav.canShare?.({ files: [file] })) {
        await nav.share!({ files: [file], title: "IFAGRITHM network card" });
      } else {
        const link = document.createElement("a");
        link.download = file.name;
        link.href = URL.createObjectURL(blob);
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 4000);
      }
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === "AbortError";
      if (!aborted) setExportNote("Export failed — try again.");
    } finally {
      node.classList.remove("is-export");
      setExporting(false);
    }
  }, [data.name, exporting]);

  const xNote =
    xStatus === "loading" ? "Resolving avatar…" :
    xStatus === "miss" ? "No avatar on that handle." :
    xStatus === "error" ? "That handle doesn't look right." : null;

  return (
    <div className="ifg-studio">
      <header className="ifg-head">
        <Link className="ifg-back" href="/">← ifagrithm.site</Link>
        <div className="ifg-head-title">
          <h1>Card Studio</h1>
          <span className="ifg-head-chip">NETWORK · INTERNAL PREVIEW</span>
        </div>
      </header>

      <div className="ifg-grid">
        {/* ------- controls ------- */}
        <section className="ifg-panel" aria-label="Card details">
          <div className="ifg-fieldset">
            <span className="ifg-legend">Identity</span>
            <label className="ifg-field">
              <span>Full name</span>
              <input value={data.name} maxLength={28} onChange={(e) => set("name", e.target.value)} />
            </label>
            <div className="ifg-field">
              <span>Pull photo from X</span>
              <div className="ifg-inline">
                <input
                  value={xHandle}
                  placeholder="@handle"
                  maxLength={16}
                  onChange={(e) => { setXHandle(e.target.value); setXStatus("idle"); }}
                  onKeyDown={(e) => { if (e.key === "Enter") void fetchAvatar(xHandle); }}
                />
                <button type="button" className="ifg-btn" onClick={() => void fetchAvatar(xHandle)} disabled={xStatus === "loading"}>
                  Fetch
                </button>
              </div>
              {xNote ? <em className="ifg-note">{xNote}</em> : null}
            </div>
          </div>

          <div className="ifg-fieldset">
            <span className="ifg-legend">Role</span>
            <div className="ifg-seg" role="radiogroup" aria-label="Role">
              {ROLES.map((role) => (
                <button
                  key={role}
                  type="button"
                  role="radio"
                  aria-checked={data.role === role}
                  className={data.role === role ? "on" : ""}
                  onClick={() => set("role", role)}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <div className="ifg-fieldset">
            <span className="ifg-legend">Clearance</span>
            <p className="ifg-hint">
              {claimState === "ok"
                ? "Set by your approval mail — the card wears its colour."
                : "Sample only. Members receive theirs with the approval."}
            </p>
            <div className="ifg-seg" role="radiogroup" aria-label="Clearance tier">
              {TIERS.map((tier) => (
                <button
                  key={tier}
                  type="button"
                  role="radio"
                  aria-checked={data.tier === tier}
                  data-tier={tier.toLowerCase()}
                  className={data.tier === tier ? "on" : ""}
                  onClick={() => set("tier", tier)}
                >
                  <i aria-hidden /> {tier}
                </button>
              ))}
            </div>
          </div>

          <div className="ifg-fieldset">
            <span className="ifg-legend">Presentation</span>
            <label className="ifg-field">
              <span>Tagline</span>
              <input
                value={data.tagline}
                maxLength={58}
                onChange={(e) => set("tagline", e.target.value)}
              />
            </label>
            <label className="ifg-field">
              <span>Bio <em>· {data.bio.length}/132 — three lines on the card</em></span>
              <textarea
                value={data.bio}
                maxLength={132}
                rows={4}
                onChange={(e) => set("bio", e.target.value)}
              />
            </label>
          </div>

          <button type="button" className="ifg-btn ifg-btn-quiet" onClick={() => { setData(SAMPLE); setAvatar(SAMPLE_AVATAR); setXHandle(""); }}>
            Reset to sample
          </button>
          <p className="ifg-panel-foot">
            {claimState === "ok" && claim
              ? `Verified member ${claim.serial}. Your details came from the approval — add your photo and make it yours.`
              : "Sample data. Members open this screen from their approval mail, pre-filled with verified details."}
          </p>
        </section>

        {/* ------- preview ------- */}
        <section className="ifg-stage" aria-label="Card preview">
          {claimState === "ok" && claim ? (
            <div className="ifg-claim-banner" role="status">
              VERIFIED · {claim.serial} — your details are loaded. Add your photo, make it yours, download.
            </div>
          ) : null}
          {claimState === "invalid" ? (
            <div className="ifg-claim-banner bad" role="alert">
              This claim link isn&apos;t valid — ask for a fresh approval mail.
            </div>
          ) : null}
          <div className="ifg-card-shell" ref={shellRef}>
            <div
              ref={cardRef}
              className={`ifg-card${live ? " is-live" : ""}`}
              data-tier={data.tier.toLowerCase()}
            >
              <div className="ifg-card-bg" aria-hidden="true" />
              <div className="ifg-frame" aria-hidden="true" />
              <span className="ifg-corner c-tl" aria-hidden="true" />
              <span className="ifg-corner c-tr" aria-hidden="true" />
              <span className="ifg-corner c-bl" aria-hidden="true" />
              <span className="ifg-corner c-br" aria-hidden="true" />
              <span className="ifg-rail rail-l" aria-hidden="true" />
              <span className="ifg-rail rail-r" aria-hidden="true" />

              <header className="ifg-badge" data-boot>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <span className="ifg-badge-logo"><img src="/ifagrithm-logo.png" alt="" /></span>
                <span className="ifg-badge-name">IFAGRITHM</span>
                <span className="ifg-badge-sub">RESEARCH&nbsp;NETWORK</span>
              </header>

              <figure className="ifg-photo" data-boot>
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="ifg-avatar" src={avatar} alt="" />
                ) : (
                  <div className="ifg-monogram">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/ifagrithm-logo.png" alt="" aria-hidden="true" />
                    <span>{initialsOf(data.name)}</span>
                  </div>
                )}
                <span className="ifg-photo-chip">{data.desk}</span>
                <span className="ifg-photo-sheen" aria-hidden="true" />
              </figure>

              <div className="ifg-role" data-boot><span>{data.role}</span></div>

              <h2 className="ifg-name" ref={nameRef} data-boot>{data.name}</h2>
              <p className="ifg-tagline" ref={taglineRef} data-boot>{data.tagline.toUpperCase()}</p>

              <div className="ifg-tier" data-boot>
                <i className="ifg-tier-gem" aria-hidden="true" />
                <span>{data.tier}</span>
              </div>

              <p className="ifg-bio" data-boot>{data.bio.toUpperCase()}</p>

              <footer className="ifg-foot" data-boot>
                <span className="ifg-foot-line" aria-hidden="true" />
                <span className="ifg-foot-plate">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/ifagrithm-logo.png" alt="" />
                </span>
                <span className="ifg-foot-line" aria-hidden="true" />
              </footer>
            </div>
          </div>

          <div className="ifg-stage-bar">
            <button
              type="button"
              className="ifg-btn ifg-btn-gold"
              onClick={download}
              disabled={exporting}
            >
              {exporting ? "Rendering…" : "Download card · PNG"}
            </button>
            <span className="ifg-stage-hint">
              {exportNote ? <em className="ifg-note">{exportNote}</em> : <>Exports at 1080 × 1350 — sized for X posts.</>}
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
