import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "./sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { count: pendingAlerts } = await supabase
    .from("coach_alerts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "pending");

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar user={user} pendingAlerts={pendingAlerts ?? 0} />
      <main className="flex-1 overflow-auto pt-12 pb-14 md:pt-0 md:pb-0">{children}</main>
    </div>
  );
}
