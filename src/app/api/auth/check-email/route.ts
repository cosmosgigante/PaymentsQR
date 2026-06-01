import { NextResponse } from "next/server";

// Endpoint eliminado — exponía enumeración de emails de admins
export async function POST() {
  return NextResponse.json({ allowed: false }, { status: 410 });
}
