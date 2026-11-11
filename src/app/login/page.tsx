import { Suspense } from "react";
import { redirect } from "next/navigation";

import SignInForm from "@/components/auth/sign-in-form";
import { getSupabaseServerClient } from "@/lib/supabase/server";

async function RedirectIfAuthenticated() {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (data.user) redirect("/");
  return null;
}

export default function LoginPage() {
  return (
    <>
      <Suspense fallback={null}>
        <RedirectIfAuthenticated />
      </Suspense>
      <SignInForm />
    </>
  );
}
