import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";

/** Records a sensitive admin action. `action` is a plain string constant on
 * purpose (see the AdminAuditLog model comment in schema.prisma) — adding a
 * new action type should never need a migration. Call this from every admin
 * action that changes account state (restrict/reactivate/comp/uncomp/etc.),
 * after the change succeeds, so the log reflects what actually happened. */
export async function logAdminAction(params: {
  adminId: string;
  businessId?: string;
  action: string;
  reason?: string;
  metadata?: Record<string, string | number | boolean | null>;
}) {
  await prisma.adminAuditLog.create({
    data: {
      adminId: params.adminId,
      businessId: params.businessId,
      action: params.action,
      reason: params.reason,
      metadata: params.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}
