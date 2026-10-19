import { NextResponse } from "next/server";
import { getStore, updateStore } from "@/lib/store";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const childId = String(body?.childId ?? "");
  const trainingId = String(body?.trainingId ?? "");
  if (!childId || !trainingId) {
    return NextResponse.json({ error: "childId und trainingId fehlen" }, { status: 400 });
  }

  const store = getStore();
  if (!store.children.some((c) => c.id === childId)) {
    return NextResponse.json({ error: "Kind nicht gefunden" }, { status: 400 });
  }
  if (!store.trainings.some((t) => t.id === trainingId)) {
    return NextResponse.json({ error: "Training nicht gefunden" }, { status: 400 });
  }
  if (store.enrollments.some((e) => e.childId === childId && e.trainingId === trainingId)) {
    return NextResponse.json({ error: "Kind ist bereits für dieses Training angemeldet" }, { status: 400 });
  }

  updateStore((s) => s.enrollments.push({ childId, trainingId }));
  return NextResponse.json(getStore(), { status: 201 });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const childId = searchParams.get("childId");
  const trainingId = searchParams.get("trainingId");
  if (!childId || !trainingId) {
    return NextResponse.json({ error: "childId und trainingId fehlen" }, { status: 400 });
  }

  updateStore((s) => {
    s.enrollments = s.enrollments.filter(
      (e) => !(e.childId === childId && e.trainingId === trainingId)
    );
  });
  return NextResponse.json(getStore());
}
