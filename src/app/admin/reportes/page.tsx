import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import ReportsView from "./ReportsView";

export const dynamic = "force-dynamic";

export default async function ReportesPage() {
  const session = await getSession();
  if (!session) redirect("/");
  return <ReportsView />;
}
