import { NextResponse } from "next/server";
import { status } from "@/lib/display-lock";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(status());
}
