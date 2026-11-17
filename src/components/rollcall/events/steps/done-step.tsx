"use client";

import type { RefObject } from "react";
import { Check } from "lucide-react";

import { formatEventDate } from "@/components/rollcall/events/event-form-types";
import { Button } from "@/components/ui/button";

type DoneStepProps = {
  eventName: string;
  eventDate: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onStartCheckIn: () => void;
  onBackToEvents: () => void;
};

export function DoneStep({
  eventName,
  eventDate,
  headingRef,
  onStartCheckIn,
  onBackToEvents,
}: DoneStepProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-7 py-8 text-center">
      <div
        aria-hidden="true"
        className="grid size-16 place-items-center rounded-full bg-tint text-primary"
      >
        <Check className="size-8 stroke-[2.5]" />
      </div>

      <h2
        ref={headingRef}
        tabIndex={-1}
        className="mt-5 font-heading text-[26px] font-extrabold leading-tight tracking-[-.02em] text-foreground outline-none"
      >
        {eventName}
      </h2>
      <p className="mt-1 text-base font-semibold text-muted-foreground">
        {formatEventDate(eventDate)}
      </p>
      <p className="mt-3.5 text-[17px] font-bold text-primary-strong">
        Event created
      </p>

      <div className="mt-7 flex w-full flex-col gap-2.5">
        <Button
          type="button"
          size="lg"
          className="h-14 min-h-11 w-full text-[17px] font-bold"
          onClick={onStartCheckIn}
        >
          Start check-in
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-14 min-h-11 w-full text-[17px] font-bold"
          onClick={onBackToEvents}
        >
          Back to events
        </Button>
      </div>
    </div>
  );
}
