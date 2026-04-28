import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/password";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@bic.local";
  const newPassword = "123456789";

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { email },
    data: { passwordHash, mustChangePassword: false },
  });

  console.log(`Password for ${email} updated successfully.`);
  console.log(`mustChangePassword set to false.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
