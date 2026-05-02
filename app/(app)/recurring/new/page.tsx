import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canCreateEvent } from "@/lib/authz";
import type { SessionUser } from "@/lib/authz";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { TemplateForm } from "@/components/events/template-form";

export default async function NewTemplatePage() {
  const session = await auth();
  const u = session!.user as SessionUser;
  if (!canCreateEvent(u)) redirect("/dashboard");

  const departments = await prisma.department.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link
          href="/recurring"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to templates
        </Link>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Recurring events
        </p>
        <h1 className="mt-1 text-display">New template</h1>
        <p className="text-sm text-muted-foreground">
          Define the default departments, requirements, and agenda so you can
          create events from it quickly.
        </p>
      </div>

      <TemplateForm
        deptOptions={departments}
      />
    </div>
  );
}
