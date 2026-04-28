import { PrismaClient, type RoleName } from "@prisma/client";
import { hashPassword, generateTempPassword } from "../lib/password";

const prisma = new PrismaClient();

const DEPARTMENTS = [
  "Facility Management Cleaning & Logistics",
  "Facility Management Electrical & Special Electronics",
  "Facility Management AC/Mechanical & Landscaping",
  "Facility Management Civil Works",
  "Food and Beverage",
  "Activities",
  "Sporting",
  "Drag",
  "Engineering Workshop",
  "Technical Operations",
  "Off-Road",
  "ICT",
  "Retail & Corporate Sales",
  "Marketing",
  "Media & Public Relations",
  "Safety & Security",
  "Miscellaneous",
  "Supplier",
];

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\//g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  console.log("Seeding departments...");
  for (let i = 0; i < DEPARTMENTS.length; i++) {
    const name = DEPARTMENTS[i];
    await prisma.department.upsert({
      where: { name },
      update: { sortOrder: i, isActive: true },
      create: { name, slug: slugify(name), sortOrder: i },
    });
  }
  console.log(`Seeded ${DEPARTMENTS.length} departments.`);

  // Bootstrap admin
  const email = (process.env.BOOTSTRAP_ADMIN_EMAIL ?? "admin@bic.local").toLowerCase();
  const displayName = process.env.BOOTSTRAP_ADMIN_NAME ?? "BIC Admin";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Bootstrap admin already exists: ${email}`);
  } else {
    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);
    const user = await prisma.user.create({
      data: {
        email,
        displayName,
        passwordHash,
        mustChangePassword: true,
        roles: { create: [{ role: "ADMIN" as RoleName }] },
      },
    });
    console.log("================================================");
    console.log("Bootstrap admin created. Save these credentials:");
    console.log(`  email:    ${user.email}`);
    console.log(`  password: ${tempPassword}`);
    console.log("You will be asked to change the password on first sign-in.");
    console.log("================================================");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
