// Resolves a claim token for the card studio (/network?t=...).
import { NextResponse } from "next/server";
import { resolveClaim, storeConfigured } from "@/lib/ifg-store";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("t") || "";
  if (!/^[a-f0-9]{48}$/.test(token)) {
    return NextResponse.json({ error: "invalid token" }, { status: 400 });
  }
  if (!storeConfigured()) {
    return NextResponse.json({ error: "store unavailable" }, { status: 503 });
  }
  try {
    const { status, data } = await resolveClaim(token);
    return NextResponse.json(data, { status });
  } catch {
    return NextResponse.json({ error: "store unreachable" }, { status: 503 });
  }
}
