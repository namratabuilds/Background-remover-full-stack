import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { UploadCloud, Download, Loader2, ImageOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getUsage, listUploads, removeBackground } from "@/lib/snapcut.functions";
import { validateDimensions, validateFileMeta, FREE_DAILY_LIMIT } from "@/lib/plans";
import { takePendingFile } from "@/lib/pending-file";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Workspace — SnapCut AI" },
      { name: "description", content: "Upload images, remove backgrounds and download your results." },
      { property: "og:title", content: "Workspace — SnapCut AI" },
      { property: "og:description", content: "Your SnapCut AI background removal workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function readDimensions(file: File): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ w: img.naturalWidth, h: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => reject(new Error("This file doesn't look like a valid image."));
    img.src = url;
  });
}

async function downloadFile(url: string, name: string, id: string) {
  const blob = await fetch(url).then((r) => {
    if (!r.ok) throw new Error("Download failed");
    return r.blob();
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name.replace(/\.[^.]+$/, "") + "-snapcut.png";
  a.click();
  URL.revokeObjectURL(a.href);
  const { data } = await supabase.from("uploads").select("downloads").eq("id", id).single();
  await supabase.from("uploads").update({ downloads: (data?.downloads ?? 0) + 1 }).eq("id", id);
}

function Dashboard() {
  const qc = useQueryClient();
  const usageFn = useServerFn(getUsage);
  const listFn = useServerFn(listUploads);
  const removeFn = useServerFn(removeBackground);
  const usage = useQuery({ queryKey: ["usage"], queryFn: () => usageFn() });
  const history = useQuery({ queryKey: ["uploads"], queryFn: () => listFn() });

  const [stage, setStage] = useState<"idle" | "uploading" | "processing">("idle");
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<{ before: string; after: string; id: string; name: string } | null>(null);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      const metaErr = validateFileMeta(file.type, file.size);
      if (metaErr) { toast.error(metaErr); return; }
      try {
        const { w, h } = await readDimensions(file);
        const dimErr = validateDimensions(w, h);
        if (dimErr) { toast.error(dimErr); return; }
      } catch (e) {
        toast.error((e as Error).message); return;
      }
      if (usage.data && usage.data.remaining === 0) {
        toast.error(`You have used all ${FREE_DAILY_LIMIT} free images today. Come back tomorrow.`); return;
      }
      const before = URL.createObjectURL(file);
      setPreview(null);
      setStage("uploading");
      setProgress(25);
      try {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) throw new Error("Please log in again.");
        const ext = (file.type.split("/")[1] ?? "png").replace("jpeg", "jpg");
        const path = `${u.user.id}/orig-${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("images").upload(path, file, { contentType: file.type });
        if (error) throw new Error("Upload failed. Please try again.");
        setStage("processing");
        setProgress(60);
        const res = await removeFn({ data: { path, fileName: file.name, sizeBytes: file.size } });
        setProgress(100);
        if (res.resultUrl) setPreview({ before, after: res.resultUrl, id: res.id, name: file.name });
        toast.success("Background removed");
        qc.invalidateQueries({ queryKey: ["usage"] });
        qc.invalidateQueries({ queryKey: ["uploads"] });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Something went wrong");
        qc.invalidateQueries({ queryKey: ["usage"] });
      } finally {
        setStage("idle");
        setTimeout(() => setProgress(0), 400);
      }
    },
    [usage.data, removeFn, qc],
  );

  // Process a file dropped on the landing page hero.
  const pendingHandled = useRef(false);
  useEffect(() => {
    if (pendingHandled.current) return;
    pendingHandled.current = true;
    const f = takePendingFile();
    if (f) handleFile(f);
  }, [handleFile]);

  const busy = stage !== "idle";
  const u = usage.data;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Plan" value={u ? (u.plan === "pro" ? "Pro" : "Free") : null} />
        <Stat label="Used today" value={u ? `${u.usedToday}${u.dailyLimit ? ` / ${u.dailyLimit}` : ""}` : null} />
        <Stat label="Remaining today" value={u ? (u.remaining === null ? "Unlimited" : String(u.remaining)) : null} />
      </div>

      <section className="mt-8">
        <label
          htmlFor="file"
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files?.[0];
            if (f && !busy) handleFile(f);
          }}
          className={`glass flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-10 text-center transition-shadow ${
            drag ? "border-primary shadow-glow-strong" : "border-border hover:shadow-glow"
          } ${busy ? "pointer-events-none opacity-80" : ""}`}
        >
          {busy ? (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
              <p className="mt-4 font-medium">{stage === "uploading" ? "Uploading…" : "Removing background…"}</p>
              <Progress value={progress} className="mt-4 h-2 w-64" aria-label="Progress" />
            </>
          ) : (
            <>
              <UploadCloud className="h-12 w-12 text-secondary" aria-hidden />
              <p className="mt-4 text-lg font-semibold">Drop an image here or click to browse</p>
              <p className="mt-1 text-sm text-muted-foreground">JPG, PNG, WEBP · max 10 MB · max 5000×5000</p>
            </>
          )}
          <input
            id="file"
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
        </label>
      </section>

      {preview && (
        <section className="mt-8 grid gap-4 md:grid-cols-2" aria-label="Result preview">
          <figure className="glass rounded-2xl p-4">
            <figcaption className="mb-3 text-sm text-muted-foreground">Original</figcaption>
            <img src={preview.before} alt="Original upload" className="mx-auto max-h-96 rounded-lg object-contain" />
          </figure>
          <figure className="glass rounded-2xl p-4">
            <figcaption className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
              Background removed
              <Button variant="hero" size="sm" onClick={() => downloadFile(preview.after, preview.name, preview.id).catch(() => toast.error("Download failed"))}>
                <Download /> Download PNG
              </Button>
            </figcaption>
            <div className="bg-checker rounded-lg">
              <img src={preview.after} alt="Result with transparent background" className="mx-auto max-h-96 object-contain" />
            </div>
          </figure>
        </section>
      )}

      <section className="mt-12">
        <h2 className="text-xl font-semibold">History</h2>
        <p className="text-sm text-muted-foreground">Last 7 days. Files are deleted 24 hours after upload.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {history.isLoading &&
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
          {history.data?.length === 0 && (
            <p className="text-sm text-muted-foreground sm:col-span-4">No images yet — upload your first one above.</p>
          )}
          {history.data?.map((h) => (
            <article key={h.id} className="glass overflow-hidden rounded-2xl">
              <div className="bg-checker flex h-40 items-center justify-center">
                {h.available && h.resultUrl ? (
                  <img src={h.resultUrl} alt={h.fileName} className="max-h-40 object-contain" loading="lazy" />
                ) : (
                  <ImageOff className="h-8 w-8 text-muted-foreground" aria-label="File expired" />
                )}
              </div>
              <div className="space-y-2 p-4">
                <p className="truncate text-sm font-medium" title={h.fileName}>{h.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(h.createdAt).toLocaleString()} · {h.downloads} download{h.downloads === 1 ? "" : "s"}
                </p>
                {h.available && h.resultUrl ? (
                  <Button
                    variant="glass"
                    size="sm"
                    className="w-full"
                    onClick={() =>
                      downloadFile(h.resultUrl!, h.fileName, h.id)
                        .then(() => qc.invalidateQueries({ queryKey: ["uploads"] }))
                        .catch(() => toast.error("Download failed"))
                    }
                  >
                    <Download /> Download
                  </Button>
                ) : (
                  <p className="text-xs text-destructive">Expired</p>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="glass rounded-2xl p-5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      {value === null ? <Skeleton className="mt-2 h-7 w-20" /> : <p className="mt-1 font-display text-2xl font-semibold">{value}</p>}
    </div>
  );
}
