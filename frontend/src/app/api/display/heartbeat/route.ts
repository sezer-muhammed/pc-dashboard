import { NextResponse } from "next/server";
import { heartbeat, status } from "@/lib/display-lock";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const result = heartbeat(body?.id, body?.upgrade === true);
  if (!result) return NextResponse.json({ error: "expired", ...status() }, { status: 410 });
  return NextResponse.json(result);
}
