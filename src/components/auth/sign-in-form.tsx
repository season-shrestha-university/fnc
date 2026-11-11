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
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f9] px-5 py-10">
      <section className="w-full max-w-[410px] rounded-[26px] border border-[#e7e7ea] bg-white p-8 shadow-[0_24px_70px_rgba(23,23,26,0.08)]">
        <RollCallLogo className="mb-8" />
        <p className="mb-2 text-xs font-bold uppercase tracking-[.14em] text-[#85858c]">
          RollCall
        </p>
        <h1 className="text-[30px] font-extrabold tracking-[-.04em] text-[#17171a]">
          Sign in to check in
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#68686f]">
          Use your workspace account to manage events and attendance.
        </p>

        <form className="mt-8 grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-semibold text-[#36363b]">
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
          <label className="grid gap-2 text-sm font-semibold text-[#36363b]">
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
            <p className="rounded-xl bg-[#fff1f0] px-3 py-2.5 text-sm text-[#a33d39]" role="alert">
              {error}
            </p>
          )}
          <Button className="mt-2 h-11 justify-center gap-2" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Signing in..." : "Sign in"}
            {!isSubmitting && <ArrowRight className="size-4" />}
          </Button>
        </form>

        <p className="mt-6 flex items-center gap-2 text-xs leading-5 text-[#85858c]">
          <LockKeyhole className="size-3.5 shrink-0" />
          Access is limited to authenticated workspace members.
        </p>
      </section>
    </main>
  );
}
