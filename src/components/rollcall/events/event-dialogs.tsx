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
            <span className="text-sm font-bold uppercase tracking-[.11em] text-[#85858c]">
              {activeEvent ? "Active event" : "New event"}
            </span>
            <DialogTitle className="text-2xl font-bold tracking-[-.045em]">
              {activeEvent ? "Update your event" : "Set up your event"}
            </DialogTitle>
            <DialogDescription>
              Choose what you need to record at the door.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <label className="grid gap-2 text-sm font-semibold">
              Event name
              <Input
                name="name"
                value={eventName}
                onChange={(event) => onEventNameChange(event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Date
              <Input
                type="date"
                value={eventDate}
                onChange={(event) => onEventDateChange?.(event.target.value)}
              />
            </label>
            <fieldset className="grid gap-2">
              <legend className="mb-1 text-sm font-semibold">
                Track for each member
              </legend>
              {trackedFieldOptions.map((field) => {
                const isRequired = (
                  requiredTrackedFields as readonly string[]
                ).includes(field);
                return (
                  <label key={field} className="flex items-center gap-2 text-sm">
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
                      className="size-4 accent-[#5b5ce2]"
                    />
                    {field}
                    {isRequired && (
                      <span className="ml-auto text-sm text-[#85858c]">
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
                className="text-[#e76b60] hover:bg-[#fbe9e8] hover:text-[#c94d42]"
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
              className="w-full bg-[#5b5ce2] text-white hover:bg-[#4748c5]"
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
              className="bg-[#e76b60] text-white hover:bg-[#c94d42]"
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
