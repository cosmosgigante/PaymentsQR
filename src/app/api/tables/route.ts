import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tables = await db.table.findMany({
    where: { restaurantId: session.restaurantId },
    orderBy: { number: "asc" },
  });

  return NextResponse.json(tables);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let body: { number?: unknown; label?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request inválido" }, { status: 400 });
  }

  const { number, label } = body;
  if (!number) return NextResponse.json({ error: "Falta número de mesa" }, { status: 400 });

  const parsedNumber = parseInt(String(number), 10);
  if (isNaN(parsedNumber) || parsedNumber < 1 || parsedNumber > 9999) {
    return NextResponse.json({ error: "Número de mesa inválido" }, { status: 400 });
  }

  const exists = await db.table.findFirst({
    where: { restaurantId: session.restaurantId, number: parsedNumber },
  });
  if (exists) return NextResponse.json({ error: "Esa mesa ya existe" }, { status: 409 });

  const table = await db.table.create({
    data: {
      number: parsedNumber,
      label: label ? String(label).slice(0, 100) : null,
      restaurantId: session.restaurantId,
    },
  });

  return NextResponse.json(table, { status: 201 });
}
