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
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Admin
        </p>
        <h1 className="mt-1 text-display">Venues</h1>
        <p className="text-sm text-muted-foreground">
          {venues.length} venue{venues.length === 1 ? "" : "s"}
        </p>
      </div>
      <VenueActions venues={venues} />
    </div>
  );
}
