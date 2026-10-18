import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const search = z.object({ mode: z.enum(["login", "signup", "forgot"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Log in or sign up — SnapCut AI" },
      { name: "description", content: "Sign in to SnapCut AI to remove image backgrounds." },
      { property: "og:title", content: "Log in — SnapCut AI" },
      { property: "og:description", content: "Access your SnapCut AI workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const creds = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

function AuthPage() {
  const { mode: initial } = Route.useSearch();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">(initial ?? "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
    const { data } = supabase.auth.onAuthStateChange((e, s) => {
      if (e === "SIGNED_IN" && s) navigate({ to: "/dashboard" });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "forgot") {
        const parsed = creds.shape.email.safeParse(email);
        if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
        const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSent("If an account exists, a reset link is on its way to your inbox.");
        return;
      }
      const parsed = creds.safeParse({ email, password });
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          ...parsed.data,
          options: { emailRedirectTo: window.location.origin + "/dashboard" },
        });
        if (error) throw error;
        setSent("Check your email to verify your account, then log in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (result.error) toast.error("Google sign-in failed. Please try again.");
  }

  const title = mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Welcome back";

  return (
    <section className="bg-glow flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-16">
      <div className="glass w-full max-w-sm rounded-2xl p-8 shadow-glow">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {sent ? (
          <p className="mt-6 text-sm text-muted-foreground" role="status">{sent}</p>
        ) : (
          <>
            {mode !== "forgot" && (
              <>
                <Button variant="glass" className="mt-6 w-full" onClick={google} type="button">
                  Continue with Google
                </Button>
                <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
                </div>
              </>
            )}
            <form onSubmit={submit} className={`space-y-4 ${mode === "forgot" ? "mt-6" : ""}`}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              {mode !== "forgot" && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              )}
              <Button type="submit" variant="hero" className="w-full" disabled={busy}>
                {busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Log in"}
              </Button>
            </form>
          </>
        )}
        <div className="mt-6 flex flex-col gap-2 text-center text-sm text-muted-foreground">
          {mode === "login" && (
            <>
              <button className="hover:text-foreground" onClick={() => setMode("forgot")}>Forgot password?</button>
              <button className="hover:text-foreground" onClick={() => { setMode("signup"); setSent(null); }}>
                New here? <span className="text-primary">Create an account</span>
              </button>
            </>
          )}
          {mode !== "login" && (
            <button className="hover:text-foreground" onClick={() => { setMode("login"); setSent(null); }}>
              Back to <span className="text-primary">log in</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
