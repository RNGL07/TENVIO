import "server-only";
import type { Plan } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * The one place "which Plan is currently offered to a new self-service
 * signup" gets computed. Used by signUpAction today (Phase B); Phase C's
 * Checkout session creation and Phase G's Admin plan/pricing screens should
 * both call this too rather than each writing their own
 * `prisma.plan.findFirst({ where: { active: true } })` — see the Plan
 * model comment in schema.prisma for why `active` never moves an existing
 * Subscription's planId (grandfathering).
 *
 * At most one Plan is expected to be active at a time; `active: true` is an
 * app-level invariant enforced by whoever flips it (Phase G), not a DB
 * constraint. If that invariant is ever violated, this deterministically
 * picks the most recently created one rather than an arbitrary row.
 */
export async function getActivePlan(): Promise<Plan | null> {
  return prisma.plan.findFirst({
    where: { active: true },
    orderBy: { createdAt: "desc" },
  });
}
