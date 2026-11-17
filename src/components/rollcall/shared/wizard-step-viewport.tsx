"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { prefersReducedMotion } from "@/components/rollcall/shared/use-motion";

export type WizardDirection = "forward" | "back";
export type WizardPhase = "idle" | "exiting" | "enter-from" | "entering";

const STEP_EXIT_MS = 120;
const STEP_ENTER_MS = 200;
const REDUCED_SWAP_MS = 120;

export function WizardStepViewport({
  stepKey,
  direction,
  onStepVisible,
  className,
  children,
}: {
  stepKey: string;
  direction: WizardDirection;
  onStepVisible?: (stepKey: string) => void;
  className?: string;
  children: (renderedStep: string) => ReactNode;
}) {
  const [renderedStep, setRenderedStep] = useState(stepKey);
  const [phase, setPhase] = useState<WizardPhase>("idle");
  const [activeDirection, setActiveDirection] =
    useState<WizardDirection>(direction);
  const [heightStyle, setHeightStyle] = useState<number | undefined>(undefined);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const startHeightRef = useRef(0);
  const directionRef = useRef(direction);
  const onStepVisibleRef = useRef(onStepVisible);

  useEffect(() => {
    directionRef.current = direction;
    onStepVisibleRef.current = onStepVisible;
  }, [direction, onStepVisible]);

  const isExiting = stepKey !== renderedStep;
  const displayPhase: WizardPhase = isExiting ? "exiting" : phase;
  const displayDirection: WizardDirection = isExiting
    ? direction
    : activeDirection;

  useEffect(() => {
    if (stepKey === renderedStep) return;

    const reduced = prefersReducedMotion();
    const container = containerRef.current;
    const startHeight =
      !reduced && container ? container.getBoundingClientRect().height : 0;
    startHeightRef.current = startHeight;

    const exitTimer = window.setTimeout(() => {
      setActiveDirection(directionRef.current);
      setRenderedStep(stepKey);
      setPhase("enter-from");
    }, STEP_EXIT_MS);

    return () => {
      window.clearTimeout(exitTimer);
    };
  }, [stepKey, renderedStep]);

  useEffect(() => {
    if (phase !== "enter-from") return;

    const reduced = prefersReducedMotion();
    const frame = requestAnimationFrame(() => {
      onStepVisibleRef.current?.(renderedStep);

      if (!reduced && containerRef.current) {
        const prevInlineHeight = containerRef.current.style.height;
        containerRef.current.style.height = "auto";
        const nextHeight = containerRef.current.getBoundingClientRect().height;
        containerRef.current.style.height = prevInlineHeight;
        if (
          nextHeight > 0 &&
          startHeightRef.current > 0 &&
          Math.abs(nextHeight - startHeightRef.current) > 1
        ) {
          setHeightStyle(nextHeight);
        } else {
          setHeightStyle(undefined);
        }
      } else {
        setHeightStyle(undefined);
      }

      setPhase("entering");
    });

    return () => cancelAnimationFrame(frame);
  }, [phase, renderedStep]);

  useEffect(() => {
    if (phase !== "entering") return;

    const enterDuration = prefersReducedMotion()
      ? REDUCED_SWAP_MS
      : STEP_ENTER_MS;
    const settleTimer = window.setTimeout(() => {
      setPhase("idle");
      setHeightStyle(undefined);
    }, enterDuration);

    return () => window.clearTimeout(settleTimer);
  }, [phase]);

  const style: CSSProperties | undefined =
    heightStyle !== undefined
      ? {
          height: `${heightStyle}px`,
          transition:
            phase === "entering"
              ? "height var(--motion-duration-base) var(--motion-ease-standard)"
              : "none",
        }
      : undefined;

  return (
    <div
      ref={containerRef}
      style={style}
      className={className}
      data-slot="wizard-viewport"
    >
      <div
        className="step-panel flex min-h-0 flex-1 flex-col"
        data-direction={displayDirection}
        data-state={displayPhase}
      >
        {children(renderedStep)}
      </div>
    </div>
  );
}
