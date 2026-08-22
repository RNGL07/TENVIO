/**
 * One-off script to provision an AdminUser row — there is no admin signup
 * page on purpose (see the AdminUser model comment in schema.prisma).
 * Reads credentials from environment variables rather than accepting them
 * as plain command-line args, so a real password never ends up in shell
 * history or gets hardcoded into this file.
 *
 * Usage (locally or via `railway run`, against whichever DATABASE_URL is
 * active in that environment):
 *   ADMIN_EMAIL="you@example.com" ADMIN_PASSWORD="a real password" npx tsx prisma/create-admin.ts
 *
 * Safe to re-run: upserts by email, so re-running with a new
 * ADMIN_PASSWORD for the same email rotates that admin's password.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables before running this script.");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("ADMIN_PASSWORD must be at least 8 characters.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
  });

  console.log(`Admin user ready: ${admin.email} (id: ${admin.id})`);
  console.log("Log in at /admin/login");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
