import AppShell from "@/components/rollcall/layout/app-shell";
import { ToastProvider } from "@/components/rollcall/layout/toast-provider";

// Static shell: sidebar, header and toasts stay mounted across navigations.
// Each page streams its own data behind the segment's loading.tsx fallback.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <ToastProvider>
      <AppShell>{children}</AppShell>
    </ToastProvider>
  );
}
