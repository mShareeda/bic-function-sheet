"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/authz";
import { generateTempPassword, hashPassword } from "@/lib/password";
import { getMailer } from "@/lib/mailer";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import type { RoleName } from "@prisma/client";

export type ActionResult = { ok: true } | { ok: false; error: string };

const createUserSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(2),
  roles: z.array(z.enum(["ADMIN", "COORDINATOR", "DEPT_MANAGER", "DEPT_TEAM_MEMBER"])),
});

export async function createUserAction(formData: FormData): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");
  const parsed = createUserSchema.safeParse({
    email: String(formData.get("email") ?? "").toLowerCase(),
    displayName: String(formData.get("displayName") ?? ""),
    roles: formData.getAll("roles"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { email, displayName, roles } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { ok: false, error: "A user with that email already exists." };

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const user = await prisma.user.create({
    data: {
      email,
      displayName,
      passwordHash,
      mustChangePassword: true,
      roles: { create: roles.map((r) => ({ role: r as RoleName })) },
    },
  });

  await logAudit({ actorId: actor.id, action: "CREATE", entityType: "User", entityId: user.id, message: `Created user ${email}` });

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  await getMailer().send({
    to: email,
    subject: "Your BIC Function Sheet account",
    text: `Hi ${displayName},\n\nYour account has been created.\nEmail: ${email}\nTemporary password: ${tempPassword}\n\nSign in at ${appUrl}/signin — you'll be asked to change your password on first login.`,
    html: `<p>Hi ${displayName},</p><p>Your account has been created.<br>Email: ${email}<br>Temporary password: <strong>${tempPassword}</strong></p><p><a href="${appUrl}/signin">Sign in here</a> — you'll be asked to change your password on first login.</p>`,
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function updateUserRolesAction(
  userId: string,
  roles: RoleName[],
): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");

  await prisma.$transaction([
    prisma.userRole.deleteMany({ where: { userId } }),
    prisma.userRole.createMany({ data: roles.map((role) => ({ userId, role })) }),
  ]);

  await logAudit({ actorId: actor.id, action: "UPDATE", entityType: "User", entityId: userId, message: `Roles set to: ${roles.join(", ")}` });
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function setDeptMembershipAction(
  userId: string,
  departmentId: string,
  isManager: boolean,
): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");

  await prisma.departmentMember.upsert({
    where: { userId_departmentId: { userId, departmentId } },
    update: { isManager },
    create: { userId, departmentId, isManager },
  });

  await logAudit({ actorId: actor.id, action: "ASSIGN", entityType: "DepartmentMember", entityId: userId, message: `Set dept ${departmentId} isManager=${isManager}` });
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function removeDeptMembershipAction(
  userId: string,
  departmentId: string,
): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");
  await prisma.departmentMember.deleteMany({ where: { userId, departmentId } });
  await logAudit({ actorId: actor.id, action: "UNASSIGN", entityType: "DepartmentMember", entityId: userId });
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function toggleUserActiveAction(userId: string): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "User not found." };
  await prisma.user.update({ where: { id: userId }, data: { isActive: !user.isActive } });
  await logAudit({ actorId: actor.id, action: "UPDATE", entityType: "User", entityId: userId, message: `isActive set to ${!user.isActive}` });
  revalidatePath("/admin/users");
  return { ok: true };
}

const deptSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
});

export async function createDepartmentAction(formData: FormData): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");
  const parsed = deptSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const dept = await prisma.department.create({
    data: { name: parsed.data.name, slug: parsed.data.slug },
  });
  await logAudit({ actorId: actor.id, action: "CREATE", entityType: "Department", entityId: dept.id });
  revalidatePath("/admin/departments");
  return { ok: true };
}

export async function toggleDepartmentActiveAction(deptId: string): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");
  const dept = await prisma.department.findUnique({ where: { id: deptId } });
  if (!dept) return { ok: false, error: "Not found." };
  await prisma.department.update({ where: { id: deptId }, data: { isActive: !dept.isActive } });
  await logAudit({ actorId: actor.id, action: "UPDATE", entityType: "Department", entityId: deptId });
  revalidatePath("/admin/departments");
  return { ok: true };
}

export async function createVenueAction(name: string): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");
  if (!name.trim()) return { ok: false, error: "Name required." };
  const venue = await prisma.venue.create({ data: { name: name.trim() } });
  await logAudit({ actorId: actor.id, action: "CREATE", entityType: "Venue", entityId: venue.id });
  revalidatePath("/admin/venues");
  return { ok: true };
}

export async function toggleVenueActiveAction(venueId: string): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");
  const v = await prisma.venue.findUnique({ where: { id: venueId } });
  if (!v) return { ok: false, error: "Not found." };
  await prisma.venue.update({ where: { id: venueId }, data: { isActive: !v.isActive } });
  await logAudit({ actorId: actor.id, action: "UPDATE", entityType: "Venue", entityId: venueId });
  revalidatePath("/admin/venues");
  return { ok: true };
}
