// IFAGRITHM network store — applications of record for the research network.
// Runs on the Contabo box, loopback only; nginx on 443 fronts it with a
// pinned-CA cert. Vercel's functions are the only intended clients.
import http from "node:http";
import crypto from "node:crypto";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 4 });
const PORT = Number(process.env.PORT || 4100);
const SECRET = process.env.STORE_SECRET || "";
const RESEND_KEY = process.env.RESEND_KEY || "";
const RESEND_FROM = process.env.RESEND_FROM || "onboarding@resend.dev";
const CLAIM_BASE = process.env.CLAIM_BASE || "https://ifagrithm-website.vercel.app";

const LIMITS = {
  full_name: 120, x_handle: 32, telegram: 32, email: 254, country: 80,
  links: 4000, context: 2000, why: 4000,
};
const DESKS = ["Consumer apps", "DeFi", "RWA", "Infrastructure", "Market intel"];
const ROLES = new Set(["scout", "partnership", "analyst"]);
const TIERS = new Set(["bronze", "silver", "gold"]);

function roleLabel(role) {
  return role === "scout" ? "Research Scout"
    : role === "analyst" ? "Research Analyst"
    : "Partnership";
}

function timingSafeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

function authorized(req) {
  return SECRET.length > 0 && timingSafeEqual(req.headers["x-ifg-secret"] || "", SECRET);
}

function send(res, code, body) {
  const json = JSON.stringify(body);
  res.writeHead(code, { "content-type": "application/json", "content-length": Buffer.byteLength(json) });
  res.end(json);
}

function readJson(req, max = 32 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > max) { reject(new Error("body too large")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
      catch { reject(new Error("invalid json")); }
    });
    req.on("error", reject);
  });
}

function cleanText(value, limit) {
  return String(value ?? "").trim().slice(0, limit);
}

function validateApplication(body) {
  const errors = [];
  const app = {};
  for (const [field, limit] of Object.entries(LIMITS)) {
    const value = cleanText(body[field], limit);
    app[field] = value;
    if (!value && field !== "context") errors.push(`${field} is required`);
  }
  if (app.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(app.email)) errors.push("email is not valid");
  if (!ROLES.has(body.role)) errors.push("role must be scout or analyst");
  app.role = body.role;
  const desks = Array.isArray(body.desks) ? body.desks.filter(d => DESKS.includes(d)) : [];
  if (desks.length === 0) errors.push("at least one desk is required");
  app.desks = desks;
  // honeypot — real applicants never fill this
  if (cleanText(body.company, 200) !== "") errors.push("spam");
  return { app, errors };
}

function serialFor(id) {
  return `IFG-2026-${String(id).padStart(3, "0")}`;
}

// test-mode 403s are expected until a domain is verified — surface a short,
// actionable reason instead of Resend's raw response
function shortMailError(detail) {
  if (detail.includes("testing emails")) {
    return "Resend test mode can only mail the account owner (ghostofiyanu@gmail.com) — verify a domain to mail anyone";
  }
  return detail.slice(0, 120);
}

function mailHtml(app, claimUrl) {
  const desk = app.desks.join(", ");
  return `<!doctype html><html><body style="margin:0;background:#060607;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 28px;color:#f4efe2;">
    <p style="color:#e5be31;font-size:11px;letter-spacing:.22em;margin:0 0 18px;">IFAGRITHM · RESEARCH NETWORK</p>
    <h1 style="font-size:26px;margin:0 0 16px;color:#ffffff;">You're in, ${app.full_name}.</h1>
    <p style="font-size:15px;line-height:1.6;color:#b9b5a6;margin:0 0 22px;">
      Congratulations — your application to the IFAGRITHM research network has been approved.
      You are joining as a <strong style="color:#e5be31;">${roleLabel(app.role)}</strong>
      on the ${desk} desk, with <strong style="color:#e5be31;">${app.tier}</strong> clearance.
    </p>
    <p style="margin:0 0 28px;">
      <a href="${claimUrl}" style="background:#e5be31;color:#141005;font-weight:bold;font-size:15px;padding:14px 26px;border-radius:10px;text-decoration:none;display:inline-block;">Claim your network card</a>
    </p>
    <p style="font-size:13px;line-height:1.6;color:#8f8b7d;margin:0 0 10px;">
      The link opens your card studio: add your photo or X handle, then download your card — sized for X posts.
      Your serial is ${app.serial}.
    </p>
    <p style="font-size:12px;color:#6f6c60;margin:28px 0 0;">Web3 Research &amp; Intelligence · ifagrithm.site</p>
  </div>
</body></html>`;
}

async function sendApprovalMail(app) {
  if (!RESEND_KEY) return { skipped: true };
  const claimUrl = `${CLAIM_BASE}/network?t=${app.claim_token}`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
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
    <h1 style="font-size:24px;margin:0 0 16px;color:#ffffff;">Thanks for applying, ${app.full_name}.</h1>
    <p style="font-size:15px;line-height:1.6;color:#b9b5a6;margin:0 0 22px;">
      We read every application carefully. This time round we are not moving forward — the network is small
      and the fit has to be right for both sides. That can change: when we open new desks, you are welcome to apply again.
    </p>
    <p style="font-size:12px;color:#6f6c60;margin:28px 0 0;">Web3 Research &amp; Intelligence · ifagrithm.site</p>
  </div>
</body></html>`;
}

async function sendDeclineMail(app) {
  if (!RESEND_KEY) return { skipped: true };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
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

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  try {
    // public: submit an application
    if (req.method === "POST" && url.pathname === "/apply") {
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
      if (!row.claimed_at) await sql`UPDATE applications SET claimed_at = now() WHERE id = ${row.id}`;
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

    if (req.method === "GET" && url.pathname === "/applications") {
      const rows = await sql`
        SELECT id, created_at, full_name, x_handle, telegram, email, country, role, desks, links, context, why, status, tier, claim_token
        FROM applications ORDER BY id DESC LIMIT 200`;
      return send(res, 200, { applications: rows.map(r => ({ ...r, serial: serialFor(r.id) })) });
    }

    if (req.method === "POST" && url.pathname === "/approve") {
      const body = await readJson(req);
      const id = Number(body.id);
      const tier = String(body.tier || "").toLowerCase();
      if (!Number.isInteger(id) || id <= 0) return send(res, 400, { error: "id is required" });
      if (!TIERS.has(tier)) return send(res, 400, { error: "clearance tier is required (bronze, silver or gold)" });
      const [row] = await sql`SELECT * FROM applications WHERE id = ${id} LIMIT 1`;
      if (!row) return send(res, 404, { error: "not found" });
      const token = row.claim_token ?? crypto.randomBytes(24).toString("hex");
      const [updated] = await sql`
        UPDATE applications SET status = 'approved', claim_token = ${token}, tier = ${tier}
        WHERE id = ${id} RETURNING *`;
      let mail;
      let mail_error;
      try {
        mail = await sendApprovalMail({ ...updated, serial: serialFor(updated.id) });
      } catch (err) {
        console.error("mail failed:", err.message);
        mail = { skipped: false, failed: true };
        mail_error = shortMailError(err.message);
      }
      return send(res, 200, { ok: true, claim_url: `${CLAIM_BASE}/network?t=${token}`, mail, mail_error });
    }

    if (req.method === "POST" && url.pathname === "/reject") {
      const body = await readJson(req);
      const id = Number(body.id);
      if (!Number.isInteger(id) || id <= 0) return send(res, 400, { error: "id is required" });
      const [row] = await sql`SELECT * FROM applications WHERE id = ${id} LIMIT 1`;
      if (!row) return send(res, 404, { error: "not found" });
      // rejecting kills any claim link the row may have had
      const [updated] = await sql`
        UPDATE applications SET status = 'rejected', claim_token = NULL
        WHERE id = ${id} RETURNING *`;
      let mail;
      let mail_error;
      try {
        mail = await sendDeclineMail(updated);
      } catch (err) {
        console.error("mail failed:", err.message);
        mail = { skipped: false, failed: true };
        mail_error = shortMailError(err.message);
      }
      return send(res, 200, { ok: true, mail, mail_error });
    }

    send(res, 404, { error: "not found" });
  } catch (err) {
    console.error("request failed:", err.message);
    send(res, 500, { error: "internal error" });
  }
});

server.listen(PORT, "127.0.0.1", () => console.log(`ifg-network store on 127.0.0.1:${PORT}`));

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, async () => {
    server.close();
    await sql.end({ timeout: 3 });
    process.exit(0);
  });
}
