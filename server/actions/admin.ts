"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/authz";
import { hashPassword, validatePasswordPolicy } from "@/lib/password";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { RoleName } from "@prisma/client";

export type ActionResult = { ok: true } | { ok: false; error: string };

const createUserSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(2),
  password: z.string().min(1, "Password is required."),
  roles: z.array(z.enum(["ADMIN", "COORDINATOR", "DEPT_MANAGER", "DEPT_TEAM_MEMBER"])),
});

export async function createUserAction(formData: FormData): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");
  const parsed = createUserSchema.safeParse({
    email: String(formData.get("email") ?? "").toLowerCase(),
    displayName: String(formData.get("displayName") ?? ""),
    password: String(formData.get("password") ?? ""),
    roles: formData.getAll("roles"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { email, displayName, password, roles } = parsed.data;

  const policyError = validatePasswordPolicy(password);
  if (policyError) return { ok: false, error: policyError };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { ok: false, error: "A user with that email already exists." };

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      displayName,
      passwordHash,
      mustChangePassword: false,
      roles: { create: roles.map((r) => ({ role: r as RoleName })) },
    },
  });

  await logAudit({ actorId: actor.id, action: "CREATE", entityType: "User", entityId: user.id, message: `Created user ${email}` });

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function setUserPasswordAction(userId: string, password: string): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");

  const policyError = validatePasswordPolicy(password);
  if (policyError) return { ok: false, error: policyError };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "User not found." };

  const passwordHash = await hashPassword(password);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: false, failedLoginAttempts: 0, lockedUntil: null },
  });

  await logAudit({ actorId: actor.id, action: "UPDATE", entityType: "User", entityId: userId, message: `Password reset by admin` });
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true };
}

export async function deleteUserAction(userId: string): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");
  if (actor.id === userId) return { ok: false, error: "You cannot delete your own account." };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "User not found." };

  // Block if user has created events (createdById is non-nullable)
  const createdEventCount = await prisma.event.count({ where: { createdById: userId } });
  if (createdEventCount > 0) {
    return { ok: false, error: `Cannot delete: this user created ${createdEventCount} event(s). Deactivate instead.` };
  }

  // Block if user has uploaded attachments (uploadedById is non-nullable)
  const attachmentCount = await prisma.attachment.count({ where: { uploadedById: userId } });
  if (attachmentCount > 0) {
    return { ok: false, error: `Cannot delete: this user uploaded ${attachmentCount} file(s). Deactivate instead.` };
  }

  await prisma.$transaction(async (tx) => {
    // Null actorId on audit logs (nullable field)
    await tx.auditLog.updateMany({ where: { actorId: userId }, data: { actorId: null } });
    // Null coordinatorId on events (nullable field)
    await tx.event.updateMany({ where: { coordinatorId: userId }, data: { coordinatorId: null } });
    // Delete requirement assignments (both as assignee and assigner)
    await tx.requirementAssignment.deleteMany({ where: { OR: [{ userId }, { assignedById: userId }] } });
    // Delete requirement notes authored by user
    await tx.requirementNote.deleteMany({ where: { authorId: userId } });
    // Delete event templates created by user
    await tx.eventTemplate.deleteMany({ where: { createdById: userId } });
    // Delete the user (cascades: UserRole, DepartmentMember, Notification, PasswordResetToken)
    await tx.user.delete({ where: { id: userId } });
  });

  await logAudit({ actorId: actor.id, action: "DELETE", entityType: "User", entityId: userId, message: `Deleted user ${user.email}` });
  revalidatePath("/admin/users");
  redirect("/admin/users");
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

export async function approveSsoUserAction(userId: string): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "User not found." };
  if (!user.ssoProvisionedAt) return { ok: false, error: "User was not provisioned via SSO." };

  await prisma.user.update({
    where: { id: userId },
    data: { isActive: true, ssoProvisionedAt: null, lastLoginAt: new Date() },
  });

  await logAudit({ actorId: actor.id, action: "UPDATE", entityType: "User", entityId: userId, message: `SSO user approved` });
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true };
}

export async function rejectSsoUserAction(userId: string): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "User not found." };
  if (!user.ssoProvisionedAt) return { ok: false, error: "User was not provisioned via SSO." };
  if (actor.id === userId) return { ok: false, error: "Cannot reject your own account." };

  // Delete the provisional user entirely — they never had access
  await prisma.user.delete({ where: { id: userId } });

  await logAudit({ actorId: actor.id, action: "DELETE", entityType: "User", entityId: userId, message: `SSO user rejected and removed: ${user.email}` });
  revalidatePath("/admin/users");
  redirect("/admin/users");
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

export async function updateDepartmentAction(deptId: string, formData: FormData): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");
  const parsed = deptSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    await prisma.department.update({
      where: { id: deptId },
      data: { name: parsed.data.name, slug: parsed.data.slug },
    });
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2002")
      return { ok: false, error: "A department with that name or slug already exists." };
    throw e;
  }

  await logAudit({ actorId: actor.id, action: "UPDATE", entityType: "Department", entityId: deptId, message: `Renamed to: ${parsed.data.name}` });
  revalidatePath("/admin/departments");
  return { ok: true };
}

export async function deleteDepartmentAction(deptId: string): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");

  const usageCount = await prisma.eventDepartment.count({ where: { departmentId: deptId } });
  if (usageCount > 0) {
    return {
      ok: false,
      error: `Cannot delete: this department appears in ${usageCount} event${usageCount === 1 ? "" : "s"}. Disable it instead.`,
    };
  }

  const dept = await prisma.department.findUnique({ where: { id: deptId } });
  if (!dept) return { ok: false, error: "Not found." };

  // DepartmentMember cascades; no EventDepartment rows so safe to hard-delete
  await prisma.department.delete({ where: { id: deptId } });
  await logAudit({ actorId: actor.id, action: "DELETE", entityType: "Department", entityId: deptId, message: `Deleted: ${dept.name}` });
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
