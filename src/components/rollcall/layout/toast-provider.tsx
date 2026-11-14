"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Check, X } from "lucide-react";

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
      {toast && (
        <div
          data-testid="scan-toast"
          role="status"
          className={`fixed left-1/2 top-5 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-xl ${
            toast.variant === "success"
              ? "bg-[#208653]"
              : toast.variant === "error"
                ? "bg-[#c93636]"
                : "bg-[#17171a]"
          }`}
        >
          {toast.member ? (
            <>
              <Avatar
                initials={toast.member.initials}
                color={toast.member.color}
                pictureUrl={toast.member.pictureUrl}
                alt={toast.member.name}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <strong className="truncate font-semibold">
                    {toast.member.name}
                  </strong>
                  <span className="text-xs text-white/85">
                    · {toast.message}
                  </span>
                </div>
                <span className="block text-xs text-white/85">
                  Member ID · {toast.member.id}
                </span>
              </div>
              <Check className="ml-1 size-4 shrink-0" aria-hidden="true" />
            </>
          ) : (
            <>
              {toast.variant === "success" ? (
                <Check className="size-4" aria-hidden="true" />
              ) : toast.variant === "error" ? (
                <X className="size-4" aria-hidden="true" />
              ) : null}
              <span>{toast.message}</span>
            </>
          )}
        </div>
      )}
    </ToastContext.Provider>
  );
}
