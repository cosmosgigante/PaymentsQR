import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveServerAdmin } from "@/lib/account";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await resolveServerAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const invitations = await db.orgInvitation.findMany({
    where: { inviteeEmail: admin.email, status: "PENDING", expiresAt: { gt: new Date() } },
    include: { account: { select: { id: true, name: true, ownerEmail: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ invitations });
}
