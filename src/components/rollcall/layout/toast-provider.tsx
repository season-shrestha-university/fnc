"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Check, IdCard, X } from "lucide-react";

import { Avatar } from "@/components/rollcall/check-in/attendance-view";

export type ToastVariant = "success" | "error" | "info";
export type ToastMember = {
  id: string;
  name: string;
  initials: string;
  color?: string;
  pictureUrl?: string;
};
export type ToastOptions = {
  member?: ToastMember;
};
type Toast = {
  message: string;
  variant: ToastVariant;
  member?: ToastMember;
};

const ToastContext = createContext<
  (message: string, variant?: ToastVariant, options?: ToastOptions) => void
>(() => undefined);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const showToast = useCallback(
    (
      message: string,
      variant: ToastVariant = "info",
      options?: ToastOptions,
    ) => setToast({ message, variant, member: options?.member }),
    [],
  );

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast &&
        (toast.member ? (
          <div
            data-testid="scan-toast"
            role="status"
            className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-lg animate-sheet-up rounded-t-3xl bg-primary px-5 pb-6 pt-2.5 text-primary-foreground shadow-[0_-12px_40px_rgba(27,37,40,.25)]"
          >
            <div
              aria-hidden="true"
              className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/40"
            />
            <div className="flex items-center gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white text-primary">
                <Check className="size-6" aria-hidden="true" />
              </span>
              <strong className="font-heading text-xl font-extrabold">
                {toast.message}
              </strong>
            </div>
            <div className="mt-5 flex items-center gap-4 rounded-2xl bg-primary-strong p-4">
              <Avatar
                initials={toast.member.initials}
                color="bg-tint text-primary-strong"
                pictureUrl={toast.member.pictureUrl}
                alt={toast.member.name}
                size="lg"
              />
              <div className="min-w-0">
                <strong className="block truncate font-heading text-[26px] font-extrabold leading-tight tracking-[-.02em]">
                  {toast.member.name}
                </strong>
                <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-sm font-bold tabular-nums">
                  <IdCard className="size-3.5" aria-hidden="true" />
                  Member ID · {toast.member.id}
                </span>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-3 text-sm font-semibold">
              <span>Ready for next scan</span>
              <span className="h-1 flex-1 overflow-hidden rounded-full bg-primary-strong">
                <span className="block h-full animate-toast-hold rounded-full bg-white" />
              </span>
            </div>
          </div>
        ) : (
          <div
            data-testid="scan-toast"
            role="status"
            className={`fixed left-1/2 top-5 z-50 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-2.5 rounded-xl px-4 py-3 text-[15px] font-semibold text-white shadow-[0_12px_32px_rgba(27,37,40,.22)] ${
              toast.variant === "success"
                ? "bg-primary"
                : toast.variant === "error"
                  ? "bg-destructive"
                  : "bg-foreground"
            }`}
          >
            {toast.variant === "success" ? (
              <Check className="size-[18px] shrink-0" aria-hidden="true" />
            ) : toast.variant === "error" ? (
              <X className="size-[18px] shrink-0" aria-hidden="true" />
            ) : null}
            <span>{toast.message}</span>
          </div>
        ))}
    </ToastContext.Provider>
  );
}
