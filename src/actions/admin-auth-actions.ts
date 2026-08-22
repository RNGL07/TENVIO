"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { setAdminSessionCookie, clearAdminSessionCookie } from "@/lib/admin-auth";
import { logInSchema } from "@/lib/validation";

export async function adminLogInAction(formData: FormData) {
  const parsed = logInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    redirect(`/admin/login?error=${encodeURIComponent("Enter a valid email and password.")}`);
  }
  const { email, password } = parsed.data;

  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin || !(await verifyPassword(password, admin.passwordHash))) {
    redirect(`/admin/login?error=${encodeURIComponent("Incorrect email or password.")}`);
  }

  setAdminSessionCookie({ adminId: admin.id });
  redirect("/admin");
}

export async function adminLogOutAction() {
  clearAdminSessionCookie();
  redirect("/admin/login");
}
