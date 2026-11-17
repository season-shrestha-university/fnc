"use client";

import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

export function DiscardChangesSheet({
  mode,
  eventName,
  onKeepEditing,
  onDiscard,
}: {
  mode: "create" | "edit";
  eventName?: string;
  onKeepEditing: () => void;
  onDiscard: () => void;
}) {
  const body =
    mode === "edit"
      ? `You have unsaved edits for ${eventName ?? "this event"}. Closing now will lose them.`
      : "You have started creating this event. Closing now will lose it.";

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onKeepEditing();
        }
      }}
      className="absolute inset-0 z-20 flex items-center justify-center bg-foreground/50 p-5"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="event-discard-title"
        className="w-full max-w-[336px] rounded-2xl border border-border bg-card p-6 shadow-lg"
      >
        <h2
          id="event-discard-title"
          className="font-heading text-xl font-extrabold tracking-[-.02em] text-foreground"
        >
          Discard changes?
        </h2>
        <p className="mt-2 text-[15px] font-medium text-muted-foreground">
          {body}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <Button
            type="button"
            variant="outline"
            className="h-12 min-h-11 font-bold"
            onClick={onKeepEditing}
          >
            Keep editing
          </Button>
          <Button
            type="button"
            className="h-12 min-h-11 bg-destructive font-bold text-white hover:bg-destructive/90"
            onClick={onDiscard}
          >
            Discard
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DeleteEventSheet({
  eventName,
  isDeleting,
  error,
  onCancel,
  onConfirm,
}: {
  eventName: string;
  isDeleting: boolean;
  error?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isDeleting) {
          onCancel();
        }
      }}
      className="absolute inset-0 z-20 flex items-center justify-center bg-foreground/50 p-5"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="event-delete-title"
        className="w-full max-w-[336px] rounded-2xl border border-border bg-card p-6 shadow-lg"
      >
        <h2
          id="event-delete-title"
          className="font-heading text-xl font-extrabold tracking-[-.02em] text-foreground"
        >
          Delete {eventName}?
        </h2>
        <p className="mt-2 text-[15px] font-medium text-muted-foreground">
          This will permanently remove the event and all check-in data for this
          session. This action cannot be undone.
        </p>
        {error && (
          <div
            role="alert"
            className="mt-3 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive"
          >
            <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <Button
            type="button"
            variant="outline"
            disabled={isDeleting}
            className="h-12 min-h-11 font-bold"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            loading={isDeleting}
            loadingText="Deleting event…"
            disabled={isDeleting}
            className="h-12 min-h-11 bg-destructive font-bold text-white hover:bg-destructive/90"
            onClick={onConfirm}
          >
            Delete event
          </Button>
        </div>
      </div>
    </div>
  );
}
