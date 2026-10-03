// Receives an application from /application and hands it to the store on
// the Contabo box. Nothing is stored on Vercel.
import { NextResponse } from "next/server";
import { storeConfigured, submitApplication } from "@/lib/ifg-store";

export async function POST(request: Request) {
  if (!storeConfigured()) {
    return NextResponse.json({ error: "store unavailable" }, { status: 503 });
  }
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  try {
    const { status, data } = await submitApplication(body);
    return NextResponse.json(data, { status });
  } catch {
    return NextResponse.json({ error: "store unreachable" }, { status: 503 });
  }
}
