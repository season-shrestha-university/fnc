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

export type ToastVariant = "success" | "error" | "info";
type Toast = { message: string; variant: ToastVariant };

const ToastContext = createContext<
  (message: string, variant?: ToastVariant) => void
>(() => undefined);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const showToast = useCallback(
    (message: string, variant: ToastVariant = "info") =>
      setToast({ message, variant }),
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
          className={`fixed left-1/2 top-5 z-50 flex -translate-x-1/2 items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-xl ${
            toast.variant === "success"
              ? "bg-[#208653]"
              : toast.variant === "error"
                ? "bg-[#c93636]"
                : "bg-[#17171a]"
          }`}
        >
          {toast.variant === "success" ? (
            <Check className="size-4" aria-hidden="true" />
          ) : toast.variant === "error" ? (
            <X className="size-4" aria-hidden="true" />
          ) : null}
          <span>{toast.message}</span>
        </div>
      )}
    </ToastContext.Provider>
  );
}
