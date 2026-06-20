import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { put } from "@vercel/blob";
import { rateLimit } from "@/lib/rateLimit";

const MAX_SIZE = 4 * 1024 * 1024; // 4MB
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (!await rateLimit(`upload:${session.restaurantId}`, 20, 5 * 60 * 1000)) {
    return NextResponse.json({ error: "Demasiadas subidas. Esperá un momento." }, { status: 429 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Request inválido" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) return NextResponse.json({ error: "Solo se permiten imágenes (JPG, PNG, WEBP, GIF)" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "La imagen no puede superar 4MB" }, { status: 400 });

  const filename = `menu/${session.restaurantId}/${Date.now()}.${ext}`;
  const blob = await put(filename, file, { access: "public" });

  return NextResponse.json({ url: blob.url });
}
