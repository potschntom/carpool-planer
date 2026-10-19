import { NextResponse } from "next/server";
import { getStore, updateStore } from "@/lib/store";
import { nextId } from "@/lib/seed";
import { Child, Parent, Training } from "@/lib/types";

type Kind = "parent" | "child" | "training";

export async function POST(req: Request, { params }: { params: { kind: Kind } }) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const store = getStore();
  const id = nextId(params.kind[0]);

  if (params.kind === "parent") {
    const item: Parent = { id, name: String(body.name ?? "").trim() };
    if (!item.name) return NextResponse.json({ error: "Name fehlt" }, { status: 400 });
    if (body.phone) item.phone = String(body.phone);
    updateStore((s) => s.parents.push(item));
  } else if (params.kind === "child") {
    const item: Child = { id, name: String(body.name ?? "").trim(), parentId: String(body.parentId ?? "") };
    if (!item.name || !item.parentId) return NextResponse.json({ error: "Name und Eltern-ID fehlen" }, { status: 400 });
    if (!store.parents.some((p) => p.id === item.parentId)) {
      return NextResponse.json({ error: "Elternteil nicht gefunden" }, { status: 400 });
    }
    updateStore((s) => s.children.push(item));
  } else if (params.kind === "training") {
    const item: Training = {
      id,
      name: String(body.name ?? "").trim(),
      weekday: Number(body.weekday),
      startTime: String(body.startTime ?? ""),
      endTime: String(body.endTime ?? ""),
      location: String(body.location ?? "").trim(),
    };
    if (!item.name || Number.isNaN(item.weekday) || !item.startTime || !item.endTime) {
      return NextResponse.json({ error: "Name, Wochentag, Start- und Endzeit fehlen" }, { status: 400 });
    }
    if (item.startTime >= item.endTime) {
      return NextResponse.json({ error: "Endzeit muss nach der Startzeit liegen" }, { status: 400 });
    }
    updateStore((s) => s.trainings.push(item));
  } else {
    return NextResponse.json({ error: "Unknown kind" }, { status: 404 });
  }

  return NextResponse.json(getStore(), { status: 201 });
}

export async function DELETE(req: Request, { params }: { params: { kind: Kind } }) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id fehlt" }, { status: 400 });

  updateStore((s) => {
    if (params.kind === "parent") {
      s.parents = s.parents.filter((p) => p.id !== id);
      const childIds = s.children.filter((c) => c.parentId === id).map((c) => c.id);
      s.children = s.children.filter((c) => c.parentId !== id);
      s.enrollments = s.enrollments.filter((e) => !childIds.includes(e.childId));
      s.plan = s.plan.map((a) => ({
        ...a,
        passengerChildIds: a.passengerChildIds.filter((c) => !childIds.includes(c)),
      }));
    } else if (params.kind === "child") {
      s.children = s.children.filter((c) => c.id !== id);
      s.enrollments = s.enrollments.filter((e) => e.childId !== id);
      s.plan = s.plan.map((a) => ({
        ...a,
        passengerChildIds: a.passengerChildIds.filter((c) => c !== id),
      }));
    } else if (params.kind === "training") {
      s.trainings = s.trainings.filter((t) => t.id !== id);
      s.enrollments = s.enrollments.filter((e) => e.trainingId !== id);
      s.plan = s.plan.filter((a) => a.trainingId !== id);
    } else {
      return;
    }
  });

  return NextResponse.json(getStore());
}
