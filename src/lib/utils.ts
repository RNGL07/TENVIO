import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Normalizes a variety of US phone number formats to a consistent +1XXXXXXXXXX
 * shape so the same customer is never accidentally split across two rows
 * because one visit typed "(555) 123-4567" and another typed "5551234567". */
export function normalizePhone(raw: string): string {
  const stripped = (raw || "").replace(/[^\d+]/g, "");
  if (stripped.startsWith("+")) {
    const rest = stripped.slice(1).replace(/\D/g, "");
    return "+" + rest;
  }
  const digits = stripped.replace(/\D/g, "");
  if (digits.length === 10) return "+1" + digits;
  if (digits.length === 11 && digits.startsWith("1")) return "+" + digits;
  return digits ? "+" + digits : raw;
}

/** Formats a normalized +1XXXXXXXXXX number back into (XXX) XXX-XXXX for display. */
export function formatPhone(phone: string): string {
  const match = phone.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  if (!match) return phone;
  return `(${match[1]}) ${match[2]}-${match[3]}`;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export function formatRelativeDay(date: Date): string {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;
  return formatDate(date);
}

export function initials(firstName: string | null, phone: string): string {
  if (firstName) return firstName[0].toUpperCase();
  return phone.slice(-2);
}
