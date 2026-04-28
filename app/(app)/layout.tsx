import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppNav } from "@/components/app-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  if (session.user.mustChangePassword) redirect("/change-password");

  return (
    <div className="min-h-screen flex flex-col">
      <AppNav
        user={{
          displayName: session.user.displayName,
          email: session.user.email,
          roles: session.user.roles,
        }}
      />
      <main className="container flex-1 py-6">{children}</main>
    </div>
  );
}
