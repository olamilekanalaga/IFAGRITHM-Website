// Client for the IFAGRITHM network store, which lives on the Contabo box
// behind nginx. TLS is verified against a pinned private CA (the server
// cert carries an IP SAN), so the raw-IP endpoint is as trustworthy as a
// named domain — and when the boss's domain arrives, only the envs change.
import { Agent, request } from "undici";

const STORE_URL = process.env.IFG_STORE_URL || "";
const STORE_SECRET = process.env.IFG_STORE_SECRET || "";
const CA_PEM = (process.env.IFG_CA_CERT || "").replace(/\\n/g, "\n");

let agent: Agent | null = null;

function storeAgent(): Agent {
  if (!agent) {
    agent = CA_PEM
      ? new Agent({ connect: { ca: CA_PEM } })
      : new Agent();
  }
  return agent;
}

export type StoreApplication = {
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

async function call<T>(path: string, init?: { method?: string; body?: unknown }): Promise<{ status: number; data: T }> {
  const { statusCode, body } = await request(`${STORE_URL}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      "content-type": "application/json",
      "x-ifg-secret": STORE_SECRET,
    },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    dispatcher: storeAgent(),
  });
  const text = await body.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  return { status: statusCode, data: data as T };
}

export function storeConfigured(): boolean {
  return Boolean(STORE_URL && STORE_SECRET);
}

export function submitApplication(application: Record<string, unknown>) {
  return call<{ ok?: boolean; id?: number; error?: string }>("/apply", { method: "POST", body: application });
}

export function listApplications() {
  return call<{ applications?: StoreApplication[]; error?: string }>("/applications");
}

export function approveApplication(id: number, tier: string) {
  return call<{ ok?: boolean; claim_url?: string; mail?: { skipped: boolean }; mail_error?: string; error?: string }>(
    "/approve", { method: "POST", body: { id, tier } }
  );
}

export function rejectApplication(id: number) {
  return call<{ ok?: boolean; mail?: { skipped: boolean }; error?: string }>("/reject", { method: "POST", body: { id } });
}

export function resolveClaim(token: string) {
  return call<{ serial: string; name: string; x_handle?: string; role: string; desk: string; tier?: string; error?: string }>(`/claim/${token}`);
}
