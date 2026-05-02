"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { signIn, signOut, auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  generateResetToken,
  hashPassword,
  hashResetToken,
  validatePasswordPolicy,
  verifyPassword,
} from "@/lib/password";
import { getMailer } from "@/lib/mailer";
import { checkRateLimit } from "@/lib/rate-limit";

export type ActionResult = { ok: true } | { ok: false; error: string };

const credsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function signInAction(formData: FormData): Promise<ActionResult> {
  const parsed = credsSchema.safeParse({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) return { ok: false, error: "Invalid email or password." };

  try {
    await signIn("credentials", {
      ...parsed.data,
      redirect: false,
    });
  } catch {
    return { ok: false, error: "Invalid email or password." };
  }
  redirect("/dashboard");
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/signin" });
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(1),
    confirm: z.string().min(1),
  })
  .refine((d) => d.newPassword === d.confirm, {
    message: "Passwords do not match.",
    path: ["confirm"],
  });

export async function changePasswordAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not signed in." };

  const parsed = changePasswordSchema.safeParse({
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const policyError = validatePasswordPolicy(parsed.data.newPassword);
  if (policyError) return { ok: false, error: policyError };

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.passwordHash) return { ok: false, error: "Account is not eligible." };

  const ok = await verifyPassword(user.passwordHash, parsed.data.currentPassword);
  if (!ok) return { ok: false, error: "Current password is incorrect." };

  const newHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash, mustChangePassword: false },
  });

  return { ok: true };
}

const forgotSchema = z.object({ email: z.string().email() });

export async function forgotPasswordAction(formData: FormData): Promise<ActionResult> {
  // Rate-limit password reset requests: 5 per IP per hour.
  // Always return ok to avoid leaking which emails exist — including on rate-limit.
  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0].trim() ??
    hdrs.get("x-real-ip") ??
    "unknown";
  const rl = checkRateLimit(`forgot:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) return { ok: true };

  const parsed = forgotSchema.safeParse({
    email: String(formData.get("email") ?? "").toLowerCase(),
  });
  // Always return ok to avoid leaking which emails exist
  if (!parsed.success) return { ok: true };

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !user.isActive) return { ok: true };

  const { token, tokenHash } = generateResetToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

  // Invalidate prior unused tokens for this user
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const resetUrl = `${appUrl}/reset-password/${token}`;

  await getMailer().send({
    to: user.email,
    subject: "Reset your BIC Function Sheet password",
    text: `Hi ${user.displayName},\n\nClick the link to reset your password (valid for 1 hour):\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
    html: `<p>Hi ${user.displayName},</p><p><a href="${resetUrl}">Click here to reset your password</a> (valid for 1 hour).</p><p>If you did not request this, ignore this email.</p>`,
  });

  return { ok: true };
}

const resetSchema = z
  .object({
    token: z.string().min(1),
    newPassword: z.string().min(1),
    confirm: z.string().min(1),
  })
  .refine((d) => d.newPassword === d.confirm, { message: "Passwords do not match.", path: ["confirm"] });

export async function resetPasswordAction(formData: FormData): Promise<ActionResult> {
  const parsed = resetSchema.safeParse({
    token: String(formData.get("token") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const policyError = validatePasswordPolicy(parsed.data.newPassword);
  if (policyError) return { ok: false, error: policyError };

  const tokenHash = hashResetToken(parsed.data.token);
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { ok: false, error: "This reset link is invalid or expired." };
  }

  const newHash = await hashPassword(parsed.data.newPassword);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash: newHash, mustChangePassword: false, failedLoginAttempts: 0, lockedUntil: null },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return { ok: true };
}
