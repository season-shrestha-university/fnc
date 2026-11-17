"use client";

import { useDelayedUnmount } from "@/components/rollcall/shared/use-motion";

export function DirtyDot({ dirty }: { dirty: boolean }) {
  const { isMounted, isExiting, onTransitionEnd } = useDelayedUnmount(
    dirty,
    84,
    0,
  );

  if (!isMounted) return null;

  return (
    <span
      title="Unsaved changes"
      aria-label={isExiting ? undefined : "Unsaved changes"}
      aria-hidden={isExiting ? "true" : undefined}
      data-exiting={isExiting ? "true" : undefined}
      onTransitionEnd={onTransitionEnd}
      className="dirty-dot size-[7px] rounded-full bg-primary"
    />
  );
}
