// Admin session for /admin: one shared password, an HMAC-signed cookie,
// nothing else. Runs only in server route handlers.
import crypto from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "ifg_admin";
const MAX_AGE = 60 * 60 * 24 * 7; // one week

function password(): string {
  return process.env.ADMIN_PASSWORD || "";
}

function sign(expiry: number): string {
  const mac = crypto.createHmac("sha256", password()).update(`ifg-admin:${expiry}`).digest("hex");
  return `${expiry}.${mac}`;
}

function verify(token: string | undefined): boolean {
  if (!token || !password()) return false;
  const [expiry, mac] = token.split(".");
  const exp = Number(expiry);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = sign(exp).split(".")[1];
  const a = Buffer.from(mac ?? "");
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function passwordConfigured(): boolean {
  return password().length >= 8;
}

export async function checkPassword(candidate: string): Promise<boolean> {
  const a = Buffer.from(String(candidate ?? ""));
  const b = Buffer.from(password());
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!ok) return false;
  const store = await cookies();
  store.set(COOKIE, sign(Date.now() + MAX_AGE * 1000), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: MAX_AGE,
  });
  return true;
}

export async function sessionValid(): Promise<boolean> {
  const store = await cookies();
  return verify(store.get(COOKIE)?.value);
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}
