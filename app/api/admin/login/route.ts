import { NextResponse } from "next/server";
import { checkPassword, passwordConfigured } from "@/lib/admin-auth";

export async function POST(request: Request) {
  if (!passwordConfigured()) {
    return NextResponse.json({ error: "admin password not configured" }, { status: 503 });
  }
  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  if (!(await checkPassword(String(body.password ?? "")))) {
    return NextResponse.json({ error: "wrong password" }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
