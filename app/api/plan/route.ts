import { NextResponse } from "next/server";
import { autoAssignDrivers, findConflicts } from "@/lib/planner";
import { getStore, updateStore } from "@/lib/store";

export async function GET() {
  const store = getStore();
  return NextResponse.json({
    plan: store.plan,
    conflicts: findConflicts(store),
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  if (body.action === "auto") {
    const store = getStore();
    const { plan, unassigned } = autoAssignDrivers(store);
    updateStore((s) => {
      s.plan = plan;
    });
    const updated = getStore();
    return NextResponse.json({
      plan: updated.plan,
      conflicts: findConflicts(updated),
      unassigned,
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
