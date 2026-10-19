import { NextResponse } from "next/server";
import { getStore, resetStore } from "@/lib/store";

export async function GET() {
  return NextResponse.json(getStore());
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (body.action === "reset") {
    return NextResponse.json(resetStore());
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
