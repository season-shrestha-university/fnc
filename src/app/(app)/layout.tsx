import AppShell from "@/components/check-in/app-shell";
import { ToastProvider } from "@/components/check-in/toast-provider";

// Static shell: sidebar, header and toasts stay mounted across navigations.
// Each page streams its own data behind the segment's loading.tsx fallback.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <ToastProvider>
      <AppShell>{children}</AppShell>
    </ToastProvider>
  );
}
