"use server";

// Server actions for /admin/users (Phase 4). User CRUD for the
// superadmin console. Mirrors the warehouses/suppliers action
// conventions: gate(), flashToast + revalidate, friendly failure on
// the unique-email collision. Lockout-safety guards prevent the
// federation from ever losing its last reachable ADMIN.

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { isRole } from "./roles";

async function gate() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") throw new Error("forbidden");
  return user;
}
// The (admin) console has no ToastProvider; revalidate is the feedback
// path. Every action funnels through here (success or no-op guard).
function done() {
  revalidatePath("/admin/users");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// True when deactivating/demoting `targetId` would leave zero active
// ADMINs. Pass the post-change predicate.
async function wouldStrandAdmin(targetId: string): Promise<boolean> {
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target || target.role !== "ADMIN" || !target.active) return false;
  const otherActiveAdmins = await prisma.user.count({
    where: { role: "ADMIN", active: true, id: { not: targetId } },
  });
  return otherActiveAdmins === 0;
}

export async function createUser(formData: FormData): Promise<void> {
  await gate();
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  const role = String(formData.get("role") ?? "").trim().toUpperCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !EMAIL_RE.test(email) || !isRole(role)) return done();
  if (password.length < 8) return done();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return done();

  await prisma.user.create({
    data: { name, email, role, passwordHash: await hashPassword(password) },
  });
  done();
}

export async function updateUser(formData: FormData): Promise<void> {
  const me = await gate();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return done();
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const title = String(formData.get("title") ?? "").trim().slice(0, 120) || null;
  const role = String(formData.get("role") ?? "").trim().toUpperCase();
  if (!name || !isRole(role)) return done();

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return done();

  // Demotion lockout guards.
  const demotingFromAdmin = target.role === "ADMIN" && role !== "ADMIN";
  if (demotingFromAdmin) {
    if (id === me.id) return done(); // can't demote yourself
    if (await wouldStrandAdmin(id)) return done(); // last active admin
  }

  await prisma.user.update({ where: { id }, data: { name, title, role } });
  done();
}

export async function resetPassword(formData: FormData): Promise<void> {
  await gate();
  const id = String(formData.get("id") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!id || password.length < 8) return done();
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return done();
  await prisma.user.update({
    where: { id },
    data: { passwordHash: await hashPassword(password) },
  });
  done();
}

export async function setActive(formData: FormData): Promise<void> {
  const me = await gate();
  const id = String(formData.get("id") ?? "").trim();
  const active = String(formData.get("active") ?? "") === "true";
  if (!id) return done();

  if (!active) {
    if (id === me.id) return done(); // can't deactivate yourself
    if (await wouldStrandAdmin(id)) return done(); // last active admin
  }
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return done();
  await prisma.user.update({ where: { id }, data: { active } });
  done();
}
