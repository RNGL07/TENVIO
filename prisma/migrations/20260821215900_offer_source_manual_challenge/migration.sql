-- AlterEnum
-- Deliberately isolated in its own migration. Postgres restricts using a
-- newly-added enum value in the same transaction that adds it, and Prisma
-- runs each migration in a transaction — keeping this separate guarantees
-- the values are committed before any later migration or application code
-- references them.
ALTER TYPE "OfferSource" ADD VALUE 'MANUAL';
ALTER TYPE "OfferSource" ADD VALUE 'CHALLENGE';
