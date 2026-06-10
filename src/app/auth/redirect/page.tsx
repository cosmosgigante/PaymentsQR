"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    async function redirect() {
      const res = await fetch("/api/auth/role");
      if (!res.ok) { router.push("/?error=unauthorized"); return; }
      const { role, accountId } = await res.json();

      if (role === "SUPERADMIN") router.push("/setup");
      else if (accountId) router.push("/cuenta");
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
