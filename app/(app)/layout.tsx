import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/app-shell/sidebar";
import { TopBar } from "@/components/app-shell/topbar";
import { BottomNav } from "@/components/app-shell/bottom-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  if (session.user.mustChangePassword) redirect("/change-password");

  const user = {
    displayName: session.user.displayName,
    email: session.user.email,
    roles: session.user.roles,
  };

  return (
    <div className="flex min-h-dvh">
      <Sidebar roles={user.roles} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar user={user} />
        <main className="flex-1 px-4 py-6 pb-24 lg:px-8 lg:pb-8">
          <div className="mx-auto w-full max-w-7xl animate-fade-in-up">
            {children}
          </div>
        </main>
        <BottomNav roles={user.roles} />
      </div>
    </div>
  );
}
