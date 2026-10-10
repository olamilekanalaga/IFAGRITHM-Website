// IFAGRITHM network store — applications of record for the research network.
// Runs on the Contabo box, loopback only; nginx on 443 fronts it with a
// pinned-CA cert. Vercel's functions are the only intended clients.
import http from "node:http";
import crypto from "node:crypto";
import postgres from "postgres";
import { isIP } from "node:net";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateApplication, validateEnquiry, validId } from "./validation.js";
import { readJson, RequestError } from "./http.js";

export function createStoreServer({ sql, secret, resendKey = "", resendFrom = "onboarding@resend.dev", claimBase = "https://www.ifagrithm.xyz", enquiryNotifyEmail = "" }) {
if (typeof secret !== "string" || !secret) throw new Error("STORE_SECRET is required.");
const SECRET = secret;
const RESEND_KEY = resendKey;
const RESEND_FROM = resendFrom;
const base = new URL(claimBase);
if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash) throw new Error("CLAIM_BASE must be an HTTPS URL.");
const CLAIM_BASE = claimBase.replace(/\/+$/, "");
const TIERS = new Set(["bronze", "silver", "gold"]);

function roleLabel(role) {
  return role === "scout" ? "Research Scout"
    : role === "analyst" ? "Research Analyst"
    : "BD/Partnership";
}

function timingSafeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

function authorized(req) {
  return SECRET.length > 0 && timingSafeEqual(req.headers["x-ifg-secret"] || "", SECRET);
}

function send(res, code, body, headers = {}) {
  const json = JSON.stringify(body);
  res.writeHead(code, { "content-type": "application/json", "content-length": Buffer.byteLength(json), "cache-control": "no-store", "x-content-type-options": "nosniff", ...headers });
  res.end(json);
}

function serialFor(id) {
  return `IFG-2026-${String(id).padStart(3, "0")}`;
}

// test-mode 403s are expected until a domain is verified — surface a short,
// actionable reason instead of Resend's raw response
function shortMailError(detail) {
  if (detail.includes("testing emails")) {
    return "Verify a sending domain to email applicants outside the email provider's test account.";
  }
  return "Email delivery failed. Check the email provider configuration.";
}

function escapeHtml(value) { return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }

function mailHtml(app, claimUrl) {
  const desk = escapeHtml(app.desks.join(", "));
  return `<!doctype html><html><body style="margin:0;background:#060607;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 28px;color:#f4efe2;">
    <p style="color:#e5be31;font-size:11px;letter-spacing:.22em;margin:0 0 18px;">IFAGRITHM · RESEARCH NETWORK</p>
    <h1 style="font-size:26px;margin:0 0 16px;color:#ffffff;">You're in, ${escapeHtml(app.full_name)}.</h1>
    <p style="font-size:15px;line-height:1.6;color:#b9b5a6;margin:0 0 22px;">
      Congratulations — your application to the IFAGRITHM research network has been approved.
      You are joining as a <strong style="color:#e5be31;">${roleLabel(app.role)}</strong>
      on the ${desk} desk, with <strong style="color:#e5be31;">${escapeHtml(app.tier)}</strong> clearance.
    </p>
    <p style="margin:0 0 28px;">
      <a href="${escapeHtml(claimUrl)}" style="background:#e5be31;color:#141005;font-weight:bold;font-size:15px;padding:14px 26px;border-radius:10px;text-decoration:none;display:inline-block;">Claim your network card</a>
    </p>
    <p style="font-size:13px;line-height:1.6;color:#8f8b7d;margin:0 0 10px;">
      The link opens your card studio: add your photo or X handle, then download your card — sized for X posts.
      Your serial is ${escapeHtml(app.serial)}.
    </p>
    <p style="font-size:12px;color:#6f6c60;margin:28px 0 0;">Web3 Research &amp; Intelligence · ifagrithm.xyz</p>
  </div>
</body></html>`;
}

async function sendApprovalMail(app) {
  if (!RESEND_KEY) return { skipped: true };
  const claimUrl = `${CLAIM_BASE}/network?t=${app.claim_token}`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    signal: AbortSignal.timeout(10000),
    headers: { authorization: `Bearer ${RESEND_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [app.email],
      subject: "You're in — IFAGRITHM Research Network",
      html: mailHtml(app, claimUrl),
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`resend ${res.status}: ${detail.slice(0, 200)}`);
  }
  return { skipped: false };
}

function declineHtml(app) {
  return `<!doctype html><html><body style="margin:0;background:#060607;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 28px;color:#f4efe2;">
    <p style="color:#e5be31;font-size:11px;letter-spacing:.22em;margin:0 0 18px;">IFAGRITHM · RESEARCH NETWORK</p>
    <h1 style="font-size:24px;margin:0 0 16px;color:#ffffff;">Thanks for applying, ${escapeHtml(app.full_name)}.</h1>
    <p style="font-size:15px;line-height:1.6;color:#b9b5a6;margin:0 0 22px;">
      We read every application carefully. This time round we are not moving forward — the network is small
      and the fit has to be right for both sides. That can change: when we open new desks, you are welcome to apply again.
    </p>
    <p style="font-size:12px;color:#6f6c60;margin:28px 0 0;">Web3 Research &amp; Intelligence · ifagrithm.xyz</p>
  </div>
</body></html>`;
}

async function sendDeclineMail(app) {
  if (!RESEND_KEY) return { skipped: true };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    signal: AbortSignal.timeout(10000),
    headers: { authorization: `Bearer ${RESEND_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [app.email],
      subject: "Your IFAGRITHM application",
      html: declineHtml(app),
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`resend ${res.status}: ${detail.slice(0, 200)}`);
  }
  return { skipped: false };
}

const limits = new Map();
function rateLimited(req, path) {
 const supplied = req.headers["x-ifg-client-ip"];
 const proxyIp = req.headers["x-real-ip"];
 const ip = typeof supplied === "string" && isIP(supplied) ? supplied : typeof proxyIp === "string" && isIP(proxyIp) ? proxyIp : req.socket.remoteAddress;
 const key = `${ip}:${path}`, now = Date.now();
 let entry = limits.get(key);
 if (!entry || now >= entry.until) {
   if (limits.size >= 10000) {
     for (const [k,v] of limits) if (v.until <= now) limits.delete(k);
     if (limits.size >= 10000) return 60;
   }
   entry = {count:0,until:now+60000};
 }
 const limit = ["/apply", "/enquiries"].includes(path) ? 5 : 60;
 if (entry.count >= limit) return Math.max(1, Math.ceil((entry.until-now)/1000));
 entry.count++; limits.set(key,entry);
 return 0;
}
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://127.0.0.1");
    if (!authorized(req)) return send(res, 401, { error: "unauthorized" });
    if(req.method === "POST" && ["/apply", "/enquiries", "/approve", "/reject"].includes(url.pathname)) {
      const retry = rateLimited(req, url.pathname);
      if (retry) return send(res,429,{error:"Too many requests. Try again shortly."},{"retry-after":String(retry)});
    }
    if (req.method === "POST" && url.pathname === "/enquiries") {
      if (!authorized(req)) return send(res, 401, { error: "unauthorized" });
      const body = await readJson(req);
      const { enquiry, errors } = validateEnquiry(body);
      if (errors.length) return send(res, 400, { error: errors.join("; ") });
      const { name, email, company, question } = enquiry;
      const [row] = await sql`INSERT INTO enquiries (name,email,company,question) VALUES (${name},${email},${company},${question}) RETURNING id`;
      let mail_error;
      if (RESEND_KEY && enquiryNotifyEmail) {
        try { const notice = await fetch("https://api.resend.com/emails", {
          method:"POST", signal:AbortSignal.timeout(10000), headers:{authorization:`Bearer ${RESEND_KEY}`,"content-type":"application/json"},
          body:JSON.stringify({from:RESEND_FROM,to:[enquiryNotifyEmail],reply_to:email,subject:"New IFAGRITHM project enquiry",text:`Name: ${name}\nEmail: ${email}\nCompany: ${company}\n\n${question}`})
        }); if (!notice.ok) mail_error = "Notification failed; enquiry is saved.";
        } catch { mail_error = "Notification failed; enquiry is saved."; }
      }
      return send(res, 201, {ok:true,id:row.id,mail_error});
    }
    // public: submit an application
    if (req.method === "POST" && url.pathname === "/apply") {
      if (!authorized(req)) return send(res, 401, {error:"unauthorized"});
      const body = await readJson(req);
      const { app, errors } = validateApplication(body);
      if (errors.length) return send(res, 400, { error: errors.join("; ") });
      const [row] = await sql`
        INSERT INTO applications (full_name, x_handle, telegram, email, country, role, desks, links, context, why)
        VALUES (${app.full_name}, ${app.x_handle}, ${app.telegram}, ${app.email}, ${app.country},
                ${app.role}, ${app.desks}, ${app.links}, ${app.context}, ${app.why})
        RETURNING id`;
      return send(res, 201, { ok: true, id: row.id });
    }

    // public: resolve a claim token for the card studio
    const claimMatch = url.pathname.match(/^\/claim\/([a-f0-9]{48})$/);
    if (req.method === "GET" && claimMatch) {
      const [row] = await sql`
        SELECT id, full_name, x_handle, role, desks, tier, status, claimed_at
        FROM applications WHERE claim_token = ${claimMatch[1]} LIMIT 1`;
      if (!row || row.status !== "approved") return send(res, 404, { error: "not found" });
      if (!row.claimed_at) await sql`UPDATE applications SET claimed_at = now() WHERE id = ${row.id} AND status = 'approved' AND claim_token = ${claimMatch[1]} AND claimed_at IS NULL`;
      return send(res, 200, {
        serial: serialFor(row.id),
        name: row.full_name,
        x_handle: row.x_handle,
        role: roleLabel(row.role).toUpperCase(),
        desk: row.desks[0] ?? "",
        tier: row.tier ?? "bronze",
      });
    }

    // everything below needs the shared secret
    if (!authorized(req)) return send(res, 401, { error: "unauthorized" });

    if (req.method === "GET" && url.pathname === "/enquiries") {
      const rows = await sql`SELECT id,created_at,name,email,company,question FROM enquiries ORDER BY id DESC`;
      return send(res, 200, {enquiries:rows});
    }
    if (req.method === "GET" && url.pathname === "/applications") {
      const rows = await sql`
        SELECT id, created_at, full_name, x_handle, telegram, email, country, role, desks, links, context, why, status, tier, claim_token
        FROM applications ORDER BY id DESC`;
      return send(res, 200, { applications: rows.map(r => ({ ...r, serial: serialFor(r.id) })) });
    }

    if (req.method === "POST" && url.pathname === "/approve") {
      const body = await readJson(req);
      const id = body.id;
      const tier = body.tier;
      if (!validId(id)) return send(res, 400, { error: "id is required" });
      if (!TIERS.has(tier)) return send(res, 400, { error: "clearance tier is required (bronze, silver or gold)" });
      const token = crypto.randomBytes(24).toString("hex");
      const [updated] = await sql`
        UPDATE applications SET status = 'approved', claim_token = ${token}, tier = ${tier}
        WHERE id = ${id} AND status = 'pending' RETURNING *`;
      if (!updated) {
        const [existing] = await sql`SELECT id FROM applications WHERE id = ${id}`;
        return send(res, existing ? 409 : 404, { error: existing ? "Application already reviewed. Refresh the records." : "not found" });
      }
      let mail;
      let mail_error;
      try {
        mail = await sendApprovalMail({ ...updated, serial: serialFor(updated.id) });
      } catch (err) {
        console.error("Approval email failed.");
        mail = { skipped: false, failed: true };
        mail_error = shortMailError(err.message);
      }
      return send(res, 200, { ok: true, claim_url: `${CLAIM_BASE}/network?t=${token}`, mail, mail_error });
    }

    if (req.method === "POST" && url.pathname === "/reject") {
      const body = await readJson(req);
      const id = body.id;
      if (!validId(id)) return send(res, 400, { error: "id is required" });
      // rejecting kills any claim link the row may have had
      const [updated] = await sql`
        UPDATE applications SET status = 'rejected', claim_token = NULL, tier = NULL, claimed_at = NULL
        WHERE id = ${id} AND status = 'pending' RETURNING *`;
      if (!updated) {
        const [existing] = await sql`SELECT id FROM applications WHERE id = ${id}`;
        return send(res, existing ? 409 : 404, { error: existing ? "Application already reviewed. Refresh the records." : "not found" });
      }
      let mail;
      let mail_error;
      try {
        mail = await sendDeclineMail(updated);
      } catch (err) {
        console.error("Decline email failed.");
        mail = { skipped: false, failed: true };
        mail_error = shortMailError(err.message);
      }
      return send(res, 200, { ok: true, mail, mail_error });
    }

    send(res, 404, { error: "not found" });
  } catch (err) {
    if (err instanceof RequestError) {
      if ([408, 413, 415].includes(err.status)) { res.shouldKeepAlive = false; req.resume(); }
      return send(res, err.status, { error: err.message });
    }
    if (err instanceof TypeError && err.code === "ERR_INVALID_URL") return send(res, 400, { error: "Invalid URL." });
    console.error("Store request failed.");
    send(res, 500, { error: "internal error" });
  }
});
server.requestTimeout = 15000;
server.headersTimeout = 10000;
return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
if (!process.env.DATABASE_URL || !process.env.STORE_SECRET) throw new Error("DATABASE_URL and STORE_SECRET are required.");
const PORT = Number(process.env.PORT || 4100);
const sql = postgres(process.env.DATABASE_URL, { max: 4, connection: { statement_timeout: 10000 } });
const server = createStoreServer({ sql, secret: process.env.STORE_SECRET, resendKey: process.env.RESEND_KEY, resendFrom: process.env.RESEND_FROM, claimBase: process.env.CLAIM_BASE, enquiryNotifyEmail: process.env.ENQUIRY_NOTIFY_EMAIL });
server.listen(PORT, "127.0.0.1", () => console.log(`ifg-network store on 127.0.0.1:${PORT}`));

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, async () => {
    server.close();
    await sql.end({ timeout: 3 });
    process.exit(0);
  });
}
}
