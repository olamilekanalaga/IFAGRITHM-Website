import { NextResponse } from "next/server";
import { sessionValid } from "@/lib/admin-auth";
import { listApplications } from "@/lib/ifg-store";

export async function GET() {
  if (!(await sessionValid())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const { status, data } = await listApplications();
    return NextResponse.json(data, { status });
  } catch {
    return NextResponse.json({ error: "store unreachable" }, { status: 503 });
  }
}
