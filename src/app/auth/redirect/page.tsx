"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    async function redirect() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }

      const res = await fetch("/api/auth/role");
      const { role } = await res.json();

      if (role === "SUPERADMIN") router.push("/superadmin");
      else if (role) router.push("/admin");
      else router.push("/?error=unauthorized");
    }
    redirect();
  }, [router]);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
