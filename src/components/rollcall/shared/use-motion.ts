"use client";

import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
  type TransitionEvent,
} from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function subscribeReducedMotion(callback: () => void) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => undefined;
  }
  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  return prefersReducedMotion();
}

function getServerReducedMotionSnapshot() {
  return false;
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getServerReducedMotionSnapshot,
  );
}

/**
 * Keeps an unmounting element in the DOM long enough for its CSS exit transition
 * to finish, falling back to a bounded timer when `transitionend` does not fire
 * (e.g. in jsdom or when the element is offscreen).
 */
export function useDelayedUnmount(
  present: boolean,
  exitMs: number,
  reducedExitMs = 0,
) {
  const [prevPresent, setPrevPresent] = useState(present);
  const [isMounted, setIsMounted] = useState(present);
  const [isExiting, setIsExiting] = useState(false);

  if (present !== prevPresent) {
    setPrevPresent(present);
    if (present) {
      setIsMounted(true);
      setIsExiting(false);
    } else if (isMounted) {
      const delay = prefersReducedMotion() ? reducedExitMs : exitMs;
      if (delay <= 0) {
        setIsMounted(false);
        setIsExiting(false);
      } else {
        setIsExiting(true);
      }
    }
  }

  useEffect(() => {
    if (!isExiting) return;
    const delay = prefersReducedMotion() ? reducedExitMs : exitMs;
    const timer = window.setTimeout(() => {
      setIsMounted(false);
      setIsExiting(false);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [exitMs, isExiting, reducedExitMs]);

  const onTransitionEnd = useCallback(
    (event: TransitionEvent<HTMLElement>) => {
      if (!isExiting) return;
      if (event.target !== event.currentTarget) return;
      setIsMounted(false);
      setIsExiting(false);
    },
    [isExiting],
  );

  return {
    isMounted,
    isExiting,
    onTransitionEnd,
  };
}
