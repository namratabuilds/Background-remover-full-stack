import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { Zap, ShieldCheck, Clock, ImageDown, UploadCloud, Star, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { validateFileMeta } from "@/lib/plans";
import { stashFile } from "@/lib/pending-file";
import sampleBefore from "@/assets/sample-before.jpg";
import sampleAfter from "@/assets/sample-after.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SnapCut AI — Remove image backgrounds in seconds" },
      { name: "description", content: "Upload a JPG, PNG or WEBP and get a clean transparent PNG in seconds. 5 free images every day." },
      { property: "og:title", content: "SnapCut AI — Remove image backgrounds in seconds" },
      { property: "og:description", content: "AI background removal with 5 free images every day. Files auto-delete after 24 hours." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const features = [
  { icon: Zap, title: "Seconds, not minutes", text: "Studio-grade cutouts of people, products and pets in one click." },
  { icon: ImageDown, title: "Transparent PNG", text: "Download a crisp PNG ready for stores, slides and social posts." },
  { icon: ShieldCheck, title: "Private by default", text: "Only you can see your images. Nothing is ever made public." },
  { icon: Clock, title: "Auto-deleted in 24h", text: "Every upload and result is removed after 24 hours." },
];

function HeroDropZone() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      const err = validateFileMeta(file.type, file.size);
      if (err) {
        toast.error(err);
        return;
      }
      stashFile(file);
      navigate({ to: "/dashboard" });
    },
    [navigate],
  );

  return (
    <label
      htmlFor="hero-file"
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const f = e.dataTransfer.files?.[0];
        if (f) handleFile(f);
      }}
      className={`glass block cursor-pointer rounded-3xl p-6 transition-shadow ${
        drag ? "shadow-glow-strong" : "shadow-glow hover:shadow-glow-strong"
      }`}
    >
      <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border p-8 text-center">
        <UploadCloud className="h-12 w-12 text-secondary" aria-hidden />
        <p className="mt-4 text-lg font-semibold">Drop an image to try it now</p>
        <p className="mt-1 text-sm text-muted-foreground">or click to browse — no signup needed to start</p>
        <span className="mt-5 inline-flex items-center gap-2 rounded-xl bg-cta px-5 py-2.5 text-sm font-semibold text-primary-foreground">
          <Scissors className="h-4 w-4" aria-hidden /> Remove a background
        </span>
      </div>
      <input
        id="hero-file"
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </label>
  );
}

function BeforeAfterCard() {
  const [pos, setPos] = useState(55);
  return (
    <div
      className="relative aspect-[3/4] w-full cursor-ew-resize select-none overflow-hidden rounded-2xl"
      onPointerMove={(e) => {
        if (e.buttons !== 1 && e.pointerType === "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        setPos(Math.min(96, Math.max(4, ((e.clientX - r.left) / r.width) * 100)));
      }}
      onPointerDown={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setPos(Math.min(96, Math.max(4, ((e.clientX - r.left) / r.width) * 100)));
      }}
      role="slider"
      aria-label="Before and after comparison"
      aria-valuenow={Math.round(pos)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") setPos((p) => Math.max(4, p - 5));
        if (e.key === "ArrowRight") setPos((p) => Math.min(96, p + 5));
      }}
    >
      <div className="bg-checker absolute inset-0">
        <img src={sampleAfter} alt="After: subject on a transparent background" className="h-full w-full object-cover" loading="lazy" width={768} height={1024} />
      </div>
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <img src={sampleBefore} alt="Before: original photo with busy background" className="h-full w-full object-cover" loading="lazy" width={768} height={1024} />
      </div>
      <div className="absolute inset-y-0 w-0.5 bg-secondary" style={{ left: `${pos}%` }} aria-hidden>
        <span className="absolute top-1/2 -left-3.5 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-cta text-xs font-bold text-primary-foreground">
          ⇔
        </span>
      </div>
      <span className="absolute left-3 top-3 rounded-full bg-background/70 px-2.5 py-1 text-xs font-medium">Before</span>
      <span className="absolute right-3 top-3 rounded-full bg-background/70 px-2.5 py-1 text-xs font-medium">After</span>
    </div>
  );
}

const steps = [
  { n: "01", title: "Upload your image", text: "Drag in a JPG, PNG or WEBP — up to 10 MB." },
  { n: "02", title: "AI removes the background", text: "Edge detection keeps fine details like hair and fur." },
  { n: "03", title: "Download your PNG", text: "A crisp transparent PNG, ready for anything." },
];

function Index() {
  return (
    <>
      <section className="relative overflow-hidden bg-glow">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 md:grid-cols-2 md:py-28">
          <div>
            <p className="mb-4 inline-flex rounded-full border border-border px-3 py-1 text-xs text-secondary">
              5 free images every day
            </p>
            <h1 className="text-4xl font-bold leading-tight md:text-6xl">
              Cut out any background <span className="text-gradient">in a snap.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              Upload a photo and SnapCut AI returns a clean, transparent PNG — ready to download.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="hero" size="xl">
                <Link to="/dashboard">Remove a background</Link>
              </Button>
              <Button asChild variant="ghost" size="xl" className="border border-border">
                <Link to="/pricing">See pricing</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">JPG, PNG, WEBP · up to 10 MB · up to 5000×5000</p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="flex text-secondary" aria-hidden>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </span>
                Loved by creators, designers and developers
              </span>
              <span className="flex items-center gap-1.5">
                <Scissors className="h-4 w-4 text-secondary" aria-hidden />
                Keeps fine details like hair and fur
              </span>
            </div>
          </div>
          <div className="mx-auto w-full max-w-md">
            <HeroDropZone />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-center text-3xl font-semibold">Built for speed and privacy</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="glass rounded-2xl p-6 transition-shadow hover:shadow-glow">
              <f.icon className="h-6 w-6 text-secondary" aria-hidden />
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <h2 className="text-center text-3xl font-semibold">How it works</h2>
        <p className="mt-3 text-center text-muted-foreground">Drag the slider to see a busy background become a transparent PNG.</p>
        <div className="mt-10 grid items-center gap-6 md:grid-cols-[1fr_320px]">
          <ol className="grid gap-4">
            {steps.map((s) => (
              <li key={s.n} className="glass flex gap-5 rounded-2xl p-6">
                <span className="font-display text-3xl font-bold text-gradient">{s.n}</span>
                <div>
                  <p className="font-medium">{s.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="glass mx-auto w-full max-w-80 rounded-3xl p-4 shadow-glow">
            <BeforeAfterCard />
          </div>
        </div>
      </section>
    </>
  );
}
