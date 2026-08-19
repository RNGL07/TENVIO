import { PrismaClient } from "@prisma/client";

// Standard Next.js dev-mode singleton pattern — without this, hot-reload in
// `next dev` creates a fresh PrismaClient (and a fresh connection pool) on
// every file save, which quickly exhausts Postgres connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
