import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — SnapCut AI" },
      { name: "description", content: "Free plan with 5 images per day, Pro Monthly unlimited, and credit packs." },
      { property: "og:title", content: "Pricing — SnapCut AI" },
      { property: "og:description", content: "Start free with 5 background removals per day. Upgrade for unlimited." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Pricing,
});

const plans = [
  { name: "Free", price: "₹0", note: "forever", features: ["5 images per day", "Transparent PNG downloads", "7-day history"], cta: "Start free", live: true },
  { name: "Pro Monthly", price: "₹499", note: "/month", features: ["Unlimited images", "Priority processing", "Everything in Free"], cta: "Coming soon", live: false, highlight: true },
  { name: "Credit Packs", price: "₹199", note: "/ 100 images", features: ["Pay as you go", "Credits never expire", "No subscription"], cta: "Coming soon", live: false },
];

function Pricing() {
  return (
    <section className="bg-glow">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <h1 className="text-center text-4xl font-bold">Simple pricing</h1>
        <p className="mt-3 text-center text-muted-foreground">Start free. Paid plans are indicative and launch soon with Razorpay.</p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {plans.map((p) => (
            <div key={p.name} className={`glass flex flex-col rounded-2xl p-8 ${p.highlight ? "shadow-glow" : ""}`}>
              <h2 className="text-lg font-semibold">{p.name}</h2>
              <p className="mt-4 font-display text-3xl font-bold">
                {p.price} <span className="text-sm font-normal text-muted-foreground">{p.note}</span>
              </p>
              <ul className="mt-6 flex-1 space-y-3 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="h-4 w-4 text-secondary" aria-hidden /> {f}
                  </li>
                ))}
              </ul>
              {p.live ? (
                <Button asChild variant="hero" className="mt-8">
                  <Link to="/dashboard">{p.cta}</Link>
                </Button>
              ) : (
                <Button variant="glass" className="mt-8" disabled>
                  {p.cta}
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
