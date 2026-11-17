"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, Check, IdCard, X } from "lucide-react";

import { Avatar } from "@/components/rollcall/check-in/attendance-view";
import { prefersReducedMotion } from "@/components/rollcall/shared/use-motion";
import { Button } from "@/components/ui/button";

export type ToastVariant = "success" | "error" | "info";
export type DoorSheetVariant = "success" | "duplicate" | "error";

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

export type DoorSheetInput = {
  variant: DoorSheetVariant;
  title: string;
  subtitle?: string;
  member?: ToastMember;
  onUndo?: () => void | Promise<void>;
};

type DoorSheetState = DoorSheetInput & {
  scanKey: number;
  phase: "entering" | "open" | "holding" | "exiting";
};

type TopToastState = {
  id: number;
  message: string;
  variant: ToastVariant;
  phase: "entering" | "open" | "exiting";
};

const DOOR_ENTER_MS = 320;
const DOOR_EXIT_MS = 224;
const DOOR_HOLD_SUCCESS_MS = 2000;
const DOOR_HOLD_ALERT_MS = 3000;

const TOP_ENTER_MS = 200;
const TOP_HOLD_MS = 2500;
const TOP_EXIT_MS = 140;

const REDUCED_ENTER_MS = 120;
const REDUCED_EXIT_MS = 84;

const ToastContext = createContext<
  (message: string, variant?: ToastVariant, options?: ToastOptions) => void
>(() => undefined);

const DoorSheetContext = createContext<{
  showDoorSheet: (input: DoorSheetInput) => void;
  dismissDoorSheet: () => void;
}>({
  showDoorSheet: () => undefined,
  dismissDoorSheet: () => undefined,
});

export function useToast() {
  return useContext(ToastContext);
}

export function useDoorSheet() {
  return useContext(DoorSheetContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [doorSheet, setDoorSheet] = useState<DoorSheetState | null>(null);
  const [topToast, setTopToast] = useState<TopToastState | null>(null);
  const topToastRef = useRef<TopToastState | null>(null);

  const updateTopToast = useCallback(
    (
      updater:
        | TopToastState
        | null
        | ((prev: TopToastState | null) => TopToastState | null),
    ) => {
      setTopToast((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        topToastRef.current = next;
        return next;
      });
    },
    [],
  );

  const scanKeyRef = useRef(0);
  const doorTimersRef = useRef<{
    frame?: number;
    enter?: number;
    hold?: number;
    exit?: number;
  }>({});

  const topIdRef = useRef(0);
  const topTimersRef = useRef<{
    frame?: number;
    hold?: number;
    exit?: number;
  }>({});
  const queuedTopToastRef = useRef<{
    message: string;
    variant: ToastVariant;
  } | null>(null);

  const clearDoorTimers = useCallback(() => {
    const timers = doorTimersRef.current;
    if (timers.frame !== undefined) cancelAnimationFrame(timers.frame);
    if (timers.enter !== undefined) window.clearTimeout(timers.enter);
    if (timers.hold !== undefined) window.clearTimeout(timers.hold);
    if (timers.exit !== undefined) window.clearTimeout(timers.exit);
    doorTimersRef.current = {};
  }, []);

  const clearTopTimers = useCallback(() => {
    const timers = topTimersRef.current;
    if (timers.frame !== undefined) cancelAnimationFrame(timers.frame);
    if (timers.hold !== undefined) window.clearTimeout(timers.hold);
    if (timers.exit !== undefined) window.clearTimeout(timers.exit);
    topTimersRef.current = {};
  }, []);

  useEffect(() => {
    return () => {
      clearDoorTimers();
      clearTopTimers();
    };
  }, [clearDoorTimers, clearTopTimers]);

  const startDoorExit = useCallback(() => {
    clearDoorTimers();
    setDoorSheet((current) => {
      if (!current) return null;
      return { ...current, phase: "exiting" };
    });
    const exitDelay = prefersReducedMotion() ? REDUCED_EXIT_MS : DOOR_EXIT_MS;
    doorTimersRef.current.exit = window.setTimeout(() => {
      setDoorSheet(null);
    }, exitDelay);
  }, [clearDoorTimers]);

  const beginDoorHold = useCallback(
    (variant: DoorSheetVariant) => {
      if (doorTimersRef.current.hold !== undefined) {
        window.clearTimeout(doorTimersRef.current.hold);
      }
      setDoorSheet((current) =>
        current && current.phase !== "exiting"
          ? { ...current, phase: "holding" }
          : current,
      );
      const holdMs =
        variant === "success" ? DOOR_HOLD_SUCCESS_MS : DOOR_HOLD_ALERT_MS;
      doorTimersRef.current.hold = window.setTimeout(() => {
        startDoorExit();
      }, holdMs);
    },
    [startDoorExit],
  );

  const showDoorSheet = useCallback(
    (input: DoorSheetInput) => {
      clearDoorTimers();
      scanKeyRef.current += 1;
      const nextKey = scanKeyRef.current;
      const reduced = prefersReducedMotion();

      setDoorSheet((current) => {
        const alreadyOpen =
          current !== null && current.phase !== "exiting";
        return {
          ...input,
          scanKey: nextKey,
          phase: alreadyOpen ? "open" : "entering",
        };
      });

      doorTimersRef.current.frame = requestAnimationFrame(() => {
        setDoorSheet((current) => {
          if (!current || current.scanKey !== nextKey) return current;
          if (current.phase === "entering") {
            return { ...current, phase: "open" };
          }
          return current;
        });
        const enterDelay = reduced ? REDUCED_ENTER_MS : DOOR_ENTER_MS;
        doorTimersRef.current.enter = window.setTimeout(() => {
          beginDoorHold(input.variant);
        }, enterDelay);
      });
    },
    [beginDoorHold, clearDoorTimers],
  );

  const mountTopToast = useCallback(
    (message: string, variant: ToastVariant) => {
      clearTopTimers();
      topIdRef.current += 1;
      const id = topIdRef.current;
      const reduced = prefersReducedMotion();

      updateTopToast({ id, message, variant, phase: "entering" });

      topTimersRef.current.frame = requestAnimationFrame(() => {
        updateTopToast((current) =>
          current && current.id === id ? { ...current, phase: "open" } : current,
        );
      });

      const enterMs = reduced ? REDUCED_ENTER_MS : TOP_ENTER_MS;
      const exitMs = reduced ? REDUCED_EXIT_MS : TOP_EXIT_MS;

      topTimersRef.current.hold = window.setTimeout(() => {
        updateTopToast((current) =>
          current && current.id === id
            ? { ...current, phase: "exiting" }
            : current,
        );
        topTimersRef.current.exit = window.setTimeout(() => {
          updateTopToast((current) => (current?.id === id ? null : current));
        }, exitMs);
      }, enterMs + TOP_HOLD_MS);
    },
    [clearTopTimers, updateTopToast],
  );

  const showToast = useCallback(
    (
      message: string,
      variant: ToastVariant = "info",
      options?: ToastOptions,
    ) => {
      if (options?.member) {
        showDoorSheet({
          variant: variant === "error" ? "error" : "success",
          title: message,
          member: options.member,
        });
        return;
      }

      if (!topToastRef.current) {
        mountTopToast(message, variant);
        return;
      }

      clearTopTimers();
      queuedTopToastRef.current = { message, variant };
      updateTopToast((current) =>
        current ? { ...current, phase: "exiting" } : current,
      );
      const exitMs = prefersReducedMotion() ? REDUCED_EXIT_MS : TOP_EXIT_MS;
      topTimersRef.current.exit = window.setTimeout(() => {
        const next = queuedTopToastRef.current;
        queuedTopToastRef.current = null;
        if (next) {
          mountTopToast(next.message, next.variant);
        } else {
          updateTopToast(null);
        }
      }, exitMs);
    },
    [clearTopTimers, mountTopToast, showDoorSheet, updateTopToast],
  );

  function handleUndo() {
    const undoFn = doorSheet?.onUndo;
    startDoorExit();
    if (undoFn) {
      void undoFn();
    }
  }

  const doorHoldDuration =
    doorSheet?.variant === "success"
      ? `${DOOR_HOLD_SUCCESS_MS}ms`
      : `${DOOR_HOLD_ALERT_MS}ms`;

  return (
    <ToastContext.Provider value={showToast}>
      <DoorSheetContext.Provider
        value={{ showDoorSheet, dismissDoorSheet: startDoorExit }}
      >
        {children}

        {doorSheet && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <div
              aria-hidden="true"
              data-state={doorSheet.phase}
              onClick={startDoorExit}
              className="door-scrim absolute inset-0 bg-foreground/45"
            />
            <div
              data-testid="scan-toast"
              data-variant={doorSheet.variant}
              data-state={doorSheet.phase}
              role="status"
              style={
                { "--hold-duration": doorHoldDuration } as React.CSSProperties
              }
              className={`door-sheet relative z-10 mx-auto w-full max-w-lg rounded-t-3xl px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-12px_40px_rgba(27,37,40,.25)] ${
                doorSheet.variant === "success"
                  ? "bg-primary text-primary-foreground"
                  : doorSheet.variant === "duplicate"
                    ? "bg-[#F4E6D8] text-[#8A5A2B]"
                    : "bg-destructive text-white"
              }`}
            >
              <div
                aria-hidden="true"
                className={`mx-auto mb-5 h-1 w-10 rounded-full ${
                  doorSheet.variant === "duplicate"
                    ? "bg-[#8A5A2B]/25"
                    : "bg-white/40"
                }`}
              />

              <div className="flex items-center gap-3">
                {doorSheet.variant === "success" ? (
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white text-primary">
                    <svg
                      key={doorSheet.scanKey}
                      viewBox="0 0 26 26"
                      width="26"
                      height="26"
                      aria-hidden="true"
                    >
                      <path
                        className="tick-path"
                        pathLength={1}
                        d="M6.5 13.5 11 18 19.5 8.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                ) : doorSheet.variant === "duplicate" ? (
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#A15C2A] text-white">
                    <AlertTriangle className="size-6" aria-hidden="true" />
                  </span>
                ) : (
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
                    <X className="size-6" aria-hidden="true" />
                  </span>
                )}

                <div className="min-w-0">
                  <strong className="block font-heading text-xl font-extrabold">
                    {doorSheet.title}
                  </strong>
                  {doorSheet.subtitle && (
                    <span className="mt-0.5 block text-sm font-semibold opacity-90">
                      {doorSheet.subtitle}
                    </span>
                  )}
                </div>
              </div>

              {doorSheet.member && (
                <div
                  className={`mt-5 flex items-center gap-4 rounded-2xl p-4 ${
                    doorSheet.variant === "success"
                      ? "bg-primary-strong"
                      : doorSheet.variant === "duplicate"
                        ? "bg-white/75 text-foreground"
                        : "bg-black/15"
                  }`}
                >
                  <Avatar
                    initials={doorSheet.member.initials}
                    color="bg-tint text-primary-strong"
                    pictureUrl={doorSheet.member.pictureUrl}
                    alt={doorSheet.member.name}
                    size="lg"
                  />
                  <div className="min-w-0">
                    <strong className="block truncate font-heading text-[26px] font-extrabold leading-tight tracking-[-.02em]">
                      {doorSheet.member.name}
                    </strong>
                    <span
                      className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm font-bold tabular-nums ${
                        doorSheet.variant === "duplicate"
                          ? "bg-muted text-muted-foreground"
                          : "bg-white/15"
                      }`}
                    >
                      <IdCard className="size-3.5" aria-hidden="true" />
                      Member ID · {doorSheet.member.id}
                    </span>
                  </div>
                </div>
              )}

              <div className="mt-5 flex items-center gap-2.5">
                {doorSheet.variant === "success" ? (
                  <>
                    {doorSheet.onUndo && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleUndo}
                        className="h-12 min-h-11 flex-1 bg-white/15 text-base font-bold text-white hover:bg-white/25 hover:text-white"
                      >
                        Undo
                      </Button>
                    )}
                    <Button
                      type="button"
                      onClick={startDoorExit}
                      className="h-12 min-h-11 flex-1 bg-white text-base font-bold text-primary hover:bg-white/90"
                    >
                      Done
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    onClick={startDoorExit}
                    className={`h-12 min-h-11 w-full text-base font-bold ${
                      doorSheet.variant === "duplicate"
                        ? "bg-[#8A5A2B] text-white hover:bg-[#744A22]"
                        : "bg-white text-destructive hover:bg-white/90"
                    }`}
                  >
                    Done
                  </Button>
                )}
              </div>

              <div
                aria-hidden="true"
                className={`hold-bar mt-4 h-1 overflow-hidden rounded-full ${
                  doorSheet.variant === "success"
                    ? "bg-primary-strong"
                    : doorSheet.variant === "duplicate"
                      ? "bg-[#8A5A2B]/20"
                      : "bg-black/20"
                }`}
              >
                <i key={doorSheet.scanKey} />
              </div>
            </div>
          </div>
        )}

        {topToast && (
          <div
            data-testid="top-toast"
            data-state={topToast.phase}
            role="status"
            className={`top-toast fixed left-1/2 top-5 z-50 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-2.5 rounded-xl px-4 py-3 text-[15px] font-semibold text-white shadow-[0_12px_32px_rgba(27,37,40,.22)] ${
              topToast.variant === "success"
                ? "bg-primary"
                : topToast.variant === "error"
                  ? "bg-destructive"
                  : "bg-foreground"
            }`}
          >
            {topToast.variant === "success" ? (
              <Check className="size-[18px] shrink-0" aria-hidden="true" />
            ) : topToast.variant === "error" ? (
              <X className="size-[18px] shrink-0" aria-hidden="true" />
            ) : null}
            <span>{topToast.message}</span>
          </div>
        )}
      </DoorSheetContext.Provider>
    </ToastContext.Provider>
  );
}
