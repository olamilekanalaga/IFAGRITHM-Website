// Applications export for the admin console — a real .xlsx with clean
// columns, sized headers row and an autofilter, ready for extraction.
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { sessionValid } from "@/lib/admin-auth";
import { listApplications, type StoreApplication } from "@/lib/ifg-store";

function roleLabel(role: string): string {
  return role === "scout" ? "Research Scout" : role === "analyst" ? "Research Analyst" : "Partnership";
}

export async function GET() {
  if (!(await sessionValid())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let applications: StoreApplication[] = [];
  try {
    const res = await listApplications();
    if (res.status !== 200) return NextResponse.json({ error: "store unavailable" }, { status: 503 });
    applications = res.data.applications ?? [];
  } catch {
    return NextResponse.json({ error: "store unreachable" }, { status: 503 });
  }

  const rows = applications.map(a => ({
    "Serial": a.serial,
    "Applied": new Date(a.created_at).toISOString().slice(0, 16).replace("T", " "),
    "Name": a.full_name,
    "X": a.x_handle,
    "Telegram": a.telegram,
    "Email": a.email,
    "Country": a.country,
    "Role": roleLabel(a.role),
    "Desks": a.desks.join(", "),
    "Clearance": a.tier ? a.tier.charAt(0).toUpperCase() + a.tier.slice(1) : "",
    "Status": a.status.charAt(0).toUpperCase() + a.status.slice(1),
    "Proof of work": a.links,
    "Context": a.context,
    "Why IFAGRITHM": a.why,
  }));

  const sheet = XLSX.utils.json_to_sheet(rows, {
    header: ["Serial", "Applied", "Name", "X", "Telegram", "Email", "Country", "Role", "Desks", "Clearance", "Status", "Proof of work", "Context", "Why IFAGRITHM"],
  });
  sheet["!cols"] = [
    { wch: 13 }, { wch: 17 }, { wch: 22 }, { wch: 16 }, { wch: 16 }, { wch: 26 },
    { wch: 14 }, { wch: 16 }, { wch: 24 }, { wch: 11 }, { wch: 11 },
    { wch: 42 }, { wch: 34 }, { wch: 52 },
  ];
  sheet["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: 13 } }) };
  sheet["!freeze"] = { xSplit: "0", ySplit: "1" };

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Applications");
  const buffer = XLSX.write(book, { type: "buffer", bookType: "xlsx" }) as Buffer;

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(buffer, {
    status: 200,
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="ifagrithm-applications-${stamp}.xlsx"`,
      "cache-control": "no-store",
    },
  });
}
