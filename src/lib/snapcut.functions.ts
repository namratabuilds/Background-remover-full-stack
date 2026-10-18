import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { FREE_DAILY_LIMIT, HISTORY_DAYS, remainingToday, startOfUtcDay } from "./plans";

const BUCKET = "images";

async function cleanupExpired() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const nowIso = new Date().toISOString();
  const { data: expired } = await supabaseAdmin
    .from("uploads")
    .select("id, original_path, result_path")
    .lt("expires_at", nowIso)
    .neq("original_path", "")
    .limit(200);
  if (expired && expired.length) {
    const paths = expired.flatMap((r) => [r.original_path, r.result_path].filter((p): p is string => !!p));
    if (paths.length) await supabaseAdmin.storage.from(BUCKET).remove(paths);
    await supabaseAdmin
      .from("uploads")
      .update({ original_path: "", result_path: null })
      .in("id", expired.map((r) => r.id));
  }
  const cutoff = new Date(Date.now() - HISTORY_DAYS * 86400_000).toISOString();
  await supabaseAdmin.from("uploads").delete().lt("created_at", cutoff);
}

async function usage(supabase: any, userId: string) {
  const [{ data: profile }, { count }] = await Promise.all([
    supabase.from("profiles").select("plan, display_name, email").eq("id", userId).maybeSingle(),
    supabase
      .from("uploads")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", startOfUtcDay().toISOString()),
  ]);
  const plan = (profile?.plan as string) ?? "free";
  const used = count ?? 0;
  return {
    plan,
    displayName: (profile?.display_name as string) ?? null,
    usedToday: used,
    dailyLimit: plan === "pro" ? null : FREE_DAILY_LIMIT,
    remaining: remainingToday(plan, used),
  };
}

export const getUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => usage(context.supabase, context.userId));

export const listUploads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await cleanupExpired().catch((e) => console.error("cleanup failed", e));
    const { data, error } = await context.supabase
      .from("uploads")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error("Could not load your history.");
    const rows = data ?? [];
    const paths = rows.flatMap((r) => [r.result_path, r.original_path]).filter((p): p is string => !!p);
    const urlMap = new Map<string, string>();
    if (paths.length) {
      const { data: signed } = await context.supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
      signed?.forEach((s) => s.path && s.signedUrl && urlMap.set(s.path, s.signedUrl));
    }
    return rows.map((r) => ({
      id: r.id,
      fileName: r.file_name,
      sizeBytes: r.size_bytes,
      downloads: r.downloads,
      createdAt: r.created_at,
      expiresAt: r.expires_at,
      available: !!r.result_path && new Date(r.expires_at) > new Date(),
      resultUrl: r.result_path ? urlMap.get(r.result_path) ?? null : null,
      originalUrl: r.original_path ? urlMap.get(r.original_path) ?? null : null,
    }));
  });

export const removeBackground = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        path: z.string().min(3).max(300),
        fileName: z.string().trim().min(1).max(200),
        sizeBytes: z.number().int().positive().max(10 * 1024 * 1024),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!data.path.startsWith(`${userId}/`) || data.path.includes("..")) {
      throw new Error("Invalid file reference.");
    }

    const u = await usage(supabase, userId);
    if (u.remaining !== null && u.remaining <= 0) {
      await supabase.storage.from(BUCKET).remove([data.path]);
      throw new Error(`Daily limit reached: the Free plan includes ${FREE_DAILY_LIMIT} images per day.`);
    }

    const apiKey = process.env["REMOVE_BG_API_KEY"];
    if (!apiKey) throw new Error("Background removal isn't configured yet. Please try again later.");

    const { data: original, error: dlErr } = await supabase.storage.from(BUCKET).download(data.path);
    if (dlErr || !original) throw new Error("Could not read the uploaded image. Please upload it again.");

    let png: ArrayBuffer | null = null;
    let lastErr = "Background removal failed.";
    for (let attempt = 0; attempt < 2 && !png; attempt++) {
      const form = new FormData();
      form.append("image_file", original, data.fileName);
      form.append("size", "auto");
      form.append("format", "png");
      const res = await fetch("https://api.remove.bg/v1.0/removebg", {
        method: "POST",
        headers: { "X-Api-Key": apiKey },
        body: form,
      });
      if (res.ok) {
        png = await res.arrayBuffer();
        break;
      }
      const body = await res.json().catch(() => null as any);
      lastErr = body?.errors?.[0]?.title ?? `Background removal failed (${res.status}).`;
      if (res.status !== 429 && res.status < 500) break;
      await new Promise((r) => setTimeout(r, 800));
    }
    if (!png) throw new Error(lastErr);

    const resultPath = `${userId}/result-${crypto.randomUUID()}.png`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(resultPath, png, { contentType: "image/png", upsert: false });
    if (upErr) throw new Error("Could not save the result. Please try again.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error: insErr } = await supabaseAdmin
      .from("uploads")
      .insert({
        user_id: userId,
        file_name: data.fileName,
        original_path: data.path,
        result_path: resultPath,
        size_bytes: data.sizeBytes,
      })
      .select("id")
      .single();
    if (insErr) throw new Error("Could not save the result. Please try again.");

    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(resultPath, 3600);
    cleanupExpired().catch(() => {});
    return { id: row.id, resultUrl: signed?.signedUrl ?? null };
  });
