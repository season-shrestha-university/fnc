"use client";

import { Suspense, useState, type ReactNode } from "react";
import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  CircleHelp,
  LayoutDashboard,
  LogOut,
  Menu,
  Users,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import RollCallLogo from "@/components/brand/rollcall-logo";
import { Avatar } from "@/components/rollcall/check-in/attendance-view";
import { useToast } from "@/components/rollcall/layout/toast-provider";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Events", href: "/events", icon: CalendarDays },
  { label: "Members", href: "/members", icon: Users },
] as const;

function isActive(pathname: string | null, href: string) {
  if (pathname === null) return false;
  if (href === "/dashboard") return pathname === "/" || pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <RollCallLogo compact />
      <span className="min-w-0">
        <span className="block font-heading text-xl font-bold leading-tight tracking-[-.03em] text-foreground">
          RollCall
        </span>
        <span className="block text-[13px] font-semibold leading-tight tracking-normal text-muted-foreground">
          FNC UK Community Centre
        </span>
      </span>
    </span>
  );
}

function NavLinkHint() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden="true"
      className={`ml-auto size-1.5 rounded-full bg-primary transition-opacity duration-150 ${
        pending ? "animate-pulse opacity-100 delay-100" : "opacity-0"
      }`}
    />
  );
}

function NavLinksView({
  pathname,
  label,
  onNavigate,
}: {
  pathname: string | null;
  label: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="grid gap-1" aria-label={label}>
      {navItems.map(({ label: itemLabel, href, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            className={`flex min-h-12 items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-bold transition-colors ${
              active
                ? "bg-tint text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon
              className={`size-5 ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            />
            {itemLabel}
            <NavLinkHint />
          </Link>
        );
      })}
    </nav>
  );
}

// usePathname() is runtime data for dynamic routes, so it lives in its own
// Suspense boundary; the links themselves prerender in the static shell.
function NavLinks({
  label,
  onNavigate,
}: {
  label: string;
  onNavigate?: () => void;
}) {
  return (
    <Suspense
      fallback={
        <NavLinksView pathname={null} label={label} onNavigate={onNavigate} />
      }
    >
      <ActiveNavLinks label={label} onNavigate={onNavigate} />
    </Suspense>
  );
}

function ActiveNavLinks({
  label,
  onNavigate,
}: {
  label: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <NavLinksView pathname={pathname} label={label} onNavigate={onNavigate} />
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const showToast = useToast();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut() {
    setIsSigningOut(true);
    try {
      const { error } = await getSupabaseBrowserClient().auth.signOut();
      if (error) {
        showToast(error.message, "error");
        setIsSigningOut(false);
        return;
      }
      showToast("Signed out successfully", "success");
      router.replace("/login");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Unable to sign out",
        "error",
      );
      setIsSigningOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card px-4 py-7 lg:flex">
          <div className="mb-10 px-2">
            <Logo />
          </div>

          <NavLinks label="Primary navigation" />
          <div className="mt-auto">
            <Button
              variant="ghost"
              className="min-h-12 w-full justify-start gap-3 px-3 py-2.5 text-[15px] font-bold text-muted-foreground"
              onClick={() => showToast("Help center coming soon")}
            >
              <CircleHelp className="size-5 text-muted-foreground" />
              Help
            </Button>
            <div className="mt-4 flex items-center gap-3 border-t border-border px-1.5 pt-[18px]">
              <Avatar initials="JM" small />
              <div>
                <strong className="block text-[15px] font-bold">Season Shrestha</strong>
                <span className="mt-0.5 block text-sm text-muted-foreground">
                  Volunteer
                </span>
              </div>
            </div>
          </div>
        </aside>

        {isMobileNavOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              aria-label="Close menu"
              className="absolute inset-0 bg-foreground/45"
              onClick={() => setIsMobileNavOpen(false)}
              type="button"
            />
            <aside className="relative flex h-full w-72 flex-col rounded-r-2xl bg-card px-4 py-6 shadow-xl">
              <div className="mb-10 flex items-center justify-between gap-2 px-2">
                <Logo />
                <Button
                  aria-label="Close menu"
                  size="icon"
                  variant="ghost"
                  className="rounded-full"
                  onClick={() => setIsMobileNavOpen(false)}
                >
                  <X />
                </Button>
              </div>
              <NavLinks
                label="Mobile navigation"
                onNavigate={() => setIsMobileNavOpen(false)}
              />
            </aside>
          </div>
        )}

        <div className="mx-auto w-full max-w-[1180px] px-4 pb-20 sm:px-8 lg:px-12">
          <header className="flex h-20 items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full bg-card ring-1 ring-border lg:hidden"
                aria-expanded={isMobileNavOpen}
                aria-label="Open menu"
                onClick={() => setIsMobileNavOpen(true)}
              >
                <Menu />
              </Button>
              <span className="flex items-center gap-2.5 font-heading text-lg font-bold tracking-[-.03em] lg:hidden">
                <RollCallLogo compact />
                RollCall
              </span>
              <span className="hidden text-[15px] font-semibold text-muted-foreground lg:inline">
                Workspace
              </span>
            </div>
            <Button
              aria-label="Sign out"
              className="gap-2 rounded-full bg-card px-4 text-muted-foreground ring-1 ring-border hover:text-foreground"
              onClick={() => void signOut()}
              variant="ghost"
              loading={isSigningOut}
            >
              {!isSigningOut && <LogOut className="size-4" />}
              <span className="hidden sm:inline">
                {isSigningOut ? "Signing out..." : "Sign out"}
              </span>
            </Button>
          </header>
          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}
