import { NextResponse } from "next/server";
import { release } from "@/lib/display-lock";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  return NextResponse.json(release(body?.id));
}
