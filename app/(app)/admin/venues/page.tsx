import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/authz";
import type { SessionUser } from "@/lib/authz";
import { VenueActions } from "@/components/admin/venue-actions";

export default async function AdminVenuesPage() {
  const session = await auth();
  const u = session!.user as SessionUser;
  if (!isAdmin(u)) redirect("/dashboard");

  const venues = await prisma.venue.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Venues</h1>
      <VenueActions venues={venues} />
    </div>
  );
}
