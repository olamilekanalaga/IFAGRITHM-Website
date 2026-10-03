import { NextResponse } from "next/server";
import { sessionValid } from "@/lib/admin-auth";
import { rejectApplication } from "@/lib/ifg-store";

export async function POST(request: Request) {
  if (!(await sessionValid())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: { id?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  try {
    const { status, data } = await rejectApplication(id);
    return NextResponse.json(data, { status });
  } catch {
    return NextResponse.json({ error: "store unreachable" }, { status: 503 });
  }
}
