"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole } from "lucide-react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RollCallLogo from "@/components/brand/rollcall-logo";

type SignInFormProps = {
  onSuccess?: () => void;
};

export default function SignInForm({ onSuccess }: SignInFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const { error: signInError } =
      await getSupabaseBrowserClient().auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (signInError) {
      setError(
        signInError.message === "Auth session missing!"
          ? "No active session was created. Check your email and password, and confirm the account in Supabase if email confirmation is enabled."
          : signInError.message,
      );
      setIsSubmitting(false);
      return;
    }

    onSuccess?.();
    setIsSubmitting(false);
    router.replace("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-[420px] rounded-2xl bg-card p-6 ring-1 ring-border sm:p-8">
        <RollCallLogo className="mb-6" />
        <p className="mb-1 text-[15px] font-bold text-muted-foreground">
          RollCall
        </p>
        <h1 className="font-heading text-[30px] font-extrabold leading-tight tracking-[-.03em] text-foreground">
          Sign in to check in
        </h1>

        <form className="mt-8 grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-[15px] font-bold text-foreground">
            Email
            <Input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
          </label>
          <label className="grid gap-2 text-[15px] font-bold text-foreground">
            Password
            <Input
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
              type="password"
              value={password}
            />
          </label>
          {error && (
            <p
              className="rounded-lg bg-destructive-tint px-3 py-2.5 text-[15px] font-medium text-destructive"
              role="alert"
            >
              {error}
            </p>
          )}
          <Button
            size="lg"
            className="mt-2 w-full justify-center"
            loading={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
            {!isSubmitting && <ArrowRight className="size-4" />}
          </Button>
        </form>

        <p className="mt-6 flex items-center gap-2 text-sm leading-5 text-muted-foreground">
          <LockKeyhole className="size-4 shrink-0" />
          Access is limited to authenticated members.
        </p>
      </section>
    </main>
  );
}
