"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  requiredTrackedFields,
  trackedFieldOptions,
} from "@/components/rollcall/shared/member-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function EventDialogs({
  activeEvent,
  eventName,
  eventDate = "",
  trackedFields,
  isEventOpen,
  isDeleteEventOpen,
  isSaving = false,
  isDeleting = false,
  onEventOpenChange,
  onDeleteOpenChange,
  onEventNameChange,
  onEventDateChange,
  onTrackedFieldsChange,
  onSave,
  onDeleteRequest,
  onDelete,
}: {
  activeEvent: string;
  eventName: string;
  eventDate?: string;
  trackedFields: string[];
  isEventOpen: boolean;
  isDeleteEventOpen: boolean;
  isSaving?: boolean;
  isDeleting?: boolean;
  onEventOpenChange: (open: boolean) => void;
  onDeleteOpenChange: (open: boolean) => void;
  onEventNameChange: (name: string) => void;
  onEventDateChange?: (date: string) => void;
  onTrackedFieldsChange: (fields: string[]) => void;
  onSave: () => void;
  onDeleteRequest: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <Dialog open={isEventOpen} onOpenChange={onEventOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {activeEvent ? "Update your event" : "Set up your event"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <label className="grid gap-2 text-[15px] font-bold">
              Event name
              <Input
                name="name"
                value={eventName}
                onChange={(event) => onEventNameChange(event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-[15px] font-bold">
              Date
              <Input
                type="date"
                value={eventDate}
                onChange={(event) => onEventDateChange?.(event.target.value)}
              />
            </label>
            <fieldset className="grid gap-2">
              <legend className="mb-1 text-[15px] font-bold">
                Track for each member
              </legend>
              {trackedFieldOptions.map((field) => {
                const isRequired = (
                  requiredTrackedFields as readonly string[]
                ).includes(field);
                return (
                  <label
                    key={field}
                    className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-base font-medium ring-1 ring-border has-checked:bg-tint has-checked:ring-tint-strong"
                  >
                    <input
                      type="checkbox"
                      checked={isRequired || trackedFields.includes(field)}
                      disabled={isRequired}
                      onChange={() => {
                        if (isRequired) return;
                        onTrackedFieldsChange(
                          trackedFields.includes(field)
                            ? trackedFields.filter((value) => value !== field)
                            : [...trackedFields, field],
                        );
                      }}
                      className="size-5 accent-primary"
                    />
                    {field}
                    {isRequired && (
                      <span className="ml-auto text-sm font-semibold text-muted-foreground">
                        Required
                      </span>
                    )}
                  </label>
                );
              })}
            </fieldset>
          </div>
          <DialogFooter>
            {activeEvent && (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:bg-destructive-tint hover:text-destructive sm:mr-auto"
                onClick={() => {
                  onDeleteRequest();
                }}
                disabled={isSaving}
              >
                Delete event
              </Button>
            )}
            <Button
              type="submit"
              onClick={onSave}
              loading={isSaving}
              size="lg"
              className="w-full sm:w-auto sm:min-w-44"
            >
              {isSaving
                ? activeEvent
                  ? "Updating event..."
                  : "Creating event..."
                : activeEvent
                  ? "Update event"
                  : "Create event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteEventOpen} onOpenChange={onDeleteOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {activeEvent}?</DialogTitle>
            <DialogDescription>
              This will permanently remove the event and all check-in data for
              this session. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onDeleteOpenChange(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={onDelete}
              loading={isDeleting}
            >
              {isDeleting ? "Deleting event..." : "Delete event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
