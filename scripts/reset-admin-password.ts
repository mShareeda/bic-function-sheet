import { PrismaClient, type RoleName } from "@prisma/client";
import { hashPassword, validatePasswordPolicy } from "../lib/password";

const prisma = new PrismaClient();

const USERS: { email: string; displayName: string; password: string; role: RoleName }[] = [
  {
    email: "admin@bic.local",
    displayName: "BIC Admin",
    password: "admin@BIC123",
    role: "ADMIN",
  },
  {
    email: "cor@bic.local",
    displayName: "BIC Coordinator",
    password: "admin@BIC12345",
    role: "COORDINATOR",
  },
];

async function main() {
  for (const entry of USERS) {
    const policyError = validatePasswordPolicy(entry.password);
    if (policyError) {
      console.error(`Password policy violation for ${entry.email}: ${policyError}`);
      process.exit(1);
    }

    const passwordHash = await hashPassword(entry.password);

    const existing = await prisma.user.findUnique({ where: { email: entry.email } });

    if (existing) {
      await prisma.user.update({
        where: { email: entry.email },
        data: {
          passwordHash,
          mustChangePassword: false,
          isActive: true,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });

      // Ensure the role exists
      await prisma.userRole.upsert({
        where: { userId_role: { userId: existing.id, role: entry.role } },
        create: { userId: existing.id, role: entry.role },
        update: {},
      });

      console.log(`Updated: ${entry.email} (role: ${entry.role})`);
    } else {
      const user = await prisma.user.create({
        data: {
          email: entry.email,
          displayName: entry.displayName,
          passwordHash,
          mustChangePassword: false,
          isActive: true,
          roles: { create: [{ role: entry.role }] },
        },
      });
      console.log(`Created: ${user.email} (role: ${entry.role})`);
    }
  }

  console.log("Done. Both accounts are ready to log in.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
