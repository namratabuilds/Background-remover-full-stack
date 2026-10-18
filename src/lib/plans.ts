export const FREE_DAILY_LIMIT = 5;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_DIMENSION = 5000;
export const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const FILE_TTL_HOURS = 24;
export const HISTORY_DAYS = 7;

export type Plan = "free" | "pro";

/** Images left today; null means unlimited. */
export function remainingToday(plan: string, usedToday: number): number | null {
  if (plan === "pro") return null;
  return Math.max(0, FREE_DAILY_LIMIT - usedToday);
}

export function validateFileMeta(type: string, size: number): string | null {
  if (!(ALLOWED_TYPES as readonly string[]).includes(type)) return "Only JPG, PNG or WEBP images are supported.";
  if (size > MAX_FILE_BYTES) return "Image must be 10 MB or smaller.";
  if (size <= 0) return "This file is empty.";
  return null;
}

export function validateDimensions(w: number, h: number): string | null {
  if (w > MAX_DIMENSION || h > MAX_DIMENSION) return `Image must be at most ${MAX_DIMENSION}×${MAX_DIMENSION} pixels.`;
  return null;
}

export function startOfUtcDay(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
