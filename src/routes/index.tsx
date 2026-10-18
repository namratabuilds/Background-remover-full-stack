import { createFileRoute, Link } from "@tanstack/react-router";
import { Zap, ShieldCheck, Clock, ImageDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import mark from "@/assets/snapcut-mark.png";

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
              <Button asChild variant="glass" size="xl">
                <Link to="/pricing">See pricing</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">JPG, PNG, WEBP · up to 10 MB · up to 5000×5000</p>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            <div className="glass aspect-square rounded-3xl p-6 shadow-glow">
              <div className="bg-checker flex h-full items-center justify-center rounded-2xl">
                <img src={mark} alt="SnapCut AI scissors mark on a transparent background" className="w-3/4 drop-shadow-2xl" />
              </div>
            </div>
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
        <ol className="grid gap-4 md:grid-cols-3">
          {["Upload your image", "AI removes the background", "Download your PNG"].map((s, i) => (
            <li key={s} className="glass rounded-2xl p-6">
              <span className="font-display text-3xl font-bold text-gradient">0{i + 1}</span>
              <p className="mt-2 font-medium">{s}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
