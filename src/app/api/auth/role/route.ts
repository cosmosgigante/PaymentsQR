import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ role: null }, { status: 401 });
  }

  const admin = await db.admin.findUnique({
    where: { email: user.email.toLowerCase() },
  });

  if (!admin) {
    return NextResponse.json({ role: null }, { status: 403 });
  }

  return NextResponse.json({ role: admin.role, restaurantId: admin.restaurantId });
}
