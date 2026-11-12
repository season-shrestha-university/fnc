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
      RollCall
    </span>
  );
}

function NavLinkHint() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden="true"
      className={`ml-auto size-1.5 rounded-full bg-[#5b5ce2] transition-opacity duration-150 ${
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
            className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-[#5b5ce2] ${
              active ? "bg-[#f1f1f6] text-[#17171a]" : "text-[#77777e]"
            }`}
          >
            <Icon
              className={`size-[18px] ${
                active ? "text-[#5b5ce2]" : "text-[#8e8e95]"
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
    <div className="min-h-screen bg-[#f7f7f9] text-[#17171a]">
      <div className="flex min-h-screen">
        <aside className="hidden w-60 shrink-0 flex-col border-r border-[#e7e7ea] bg-white px-[18px] py-7 lg:flex">
          <div className="mb-12 px-3 font-sans text-base font-extrabold">
            <Logo />
          </div>
          <p className="px-3 pb-3 text-sm font-bold uppercase tracking-[.11em] text-[#85858c]">
            Workspace
          </p>
          <NavLinks label="Primary navigation" />
          <div className="mt-auto">
            <Button
              variant="ghost"
              className="h-auto w-full justify-start gap-3 px-3 py-2.5 text-sm font-semibold text-[#77777e]"
              onClick={() => showToast("Help center coming soon")}
            >
              <CircleHelp className="size-[18px] text-[#8e8e95]" />
              Help
            </Button>
            <div className="mt-4 flex items-center gap-2.5 border-t border-[#e7e7ea] px-1.5 pt-[18px]">
              <Avatar initials="JM" small />
              <div>
                <strong className="block text-sm">Jamie Morgan</strong>
                <span className="mt-0.5 block text-xs text-[#85858c]">
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
              className="absolute inset-0 bg-[#17171a]/30"
              onClick={() => setIsMobileNavOpen(false)}
              type="button"
            />
            <aside className="relative flex h-full w-64 flex-col border-r border-[#e7e7ea] bg-white px-[18px] py-7 shadow-xl">
              <div className="mb-12 flex items-center justify-between px-3 font-sans text-base font-extrabold">
                <Logo />
                <Button
                  aria-label="Close menu"
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsMobileNavOpen(false)}
                >
                  <X />
                </Button>
              </div>
              <p className="px-3 pb-3 text-sm font-bold uppercase tracking-[.11em] text-[#85858c]">
                Workspace
              </p>
              <NavLinks
                label="Mobile navigation"
                onNavigate={() => setIsMobileNavOpen(false)}
              />
            </aside>
          </div>
        )}

        <div className="mx-auto w-full max-w-[1180px] px-5 pb-20 sm:px-8 lg:px-12">
          <header className="flex h-20 items-center justify-between border-b border-[#e7e7ea]">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-expanded={isMobileNavOpen}
                aria-label="Open menu"
                onClick={() => setIsMobileNavOpen(true)}
              >
                <Menu />
              </Button>
              <span className="text-sm text-[#85858c]">Workspace</span>
            </div>
            <Button
              aria-label="Sign out"
              className="gap-2 text-[#77777e]"
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
