"use client";

import type { FormEvent, RefObject } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  IdCard,
  ImageOff,
  Loader2,
  Mail,
  MapPin,
  Phone,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  WizardErrors,
  WizardFormValues,
} from "@/components/rollcall/members/create-member-wizard-types";

type ContactStepProps = {
  values: WizardFormValues;
  errors: WizardErrors;
  photoPreviewUrl: string;
  isSubmitting: boolean;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onChange: (field: keyof WizardFormValues, value: string) => void;
  onGoPhoto: () => void;
  onBack: () => void;
  onSubmit: () => void;
};

export function ContactStep({
  values,
  errors,
  photoPreviewUrl,
  isSubmitting,
  headingRef,
  onChange,
  onGoPhoto,
  onBack,
  onSubmit,
}: ContactStepProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="font-heading text-2xl font-extrabold tracking-[-.02em] outline-none"
          >
            Contact details
          </h2>
          <span className="rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
            Optional
          </span>
        </div>

        {errors.form && (
          <div
            role="alert"
            className="mt-4 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm font-semibold text-destructive"
          >
            <AlertCircle className="size-4 shrink-0" />
            <span>{errors.form}</span>
          </div>
        )}

        <div className="mt-4 grid gap-4">
          <div className="grid gap-1.5">
            <label
              htmlFor="wizard-member-email"
              className="text-sm font-bold text-foreground"
            >
              Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="wizard-member-email"
                type="email"
                placeholder="name@example.com"
                value={values.email}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={
                  errors.email ? "wizard-email-error" : undefined
                }
                onChange={(event) => onChange("email", event.target.value)}
                className={`h-14 pl-11 text-base ${
                  errors.email
                    ? "border-2 border-destructive focus-visible:ring-destructive/20"
                    : ""
                }`}
              />
            </div>
            {errors.email && (
              <p
                id="wizard-email-error"
                role="alert"
                className="flex items-center gap-1.5 text-sm font-bold text-destructive"
              >
                <AlertCircle className="size-4 shrink-0" />
                {errors.email}
              </p>
            )}
          </div>

          <div className="grid gap-1.5">
            <label
              htmlFor="wizard-member-phone"
              className="text-sm font-bold text-foreground"
            >
              Phone
            </label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="wizard-member-phone"
                type="tel"
                placeholder="07700 900000"
                value={values.phone}
                onChange={(event) => onChange("phone", event.target.value)}
                className="h-14 pl-11 text-base"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <label
              htmlFor="wizard-member-address"
              className="text-sm font-bold text-foreground"
            >
              Address
            </label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3.5 top-4 size-5 text-muted-foreground" />
              <textarea
                id="wizard-member-address"
                rows={2}
                placeholder="House, street, town, postcode"
                value={values.address}
                onChange={(event) => onChange("address", event.target.value)}
                className="min-h-[84px] w-full resize-none rounded-xl border border-input bg-card py-3.5 pl-11 pr-3.5 text-base font-medium text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              />
            </div>
          </div>
        </div>

        <div className="mt-5">
          <h3 className="text-sm font-bold text-muted-foreground">
            You’re adding
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onGoPhoto}
              disabled={isSubmitting}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card pl-2 pr-3.5 text-sm font-bold transition hover:bg-accent ${
                photoPreviewUrl ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <span className="grid size-7 place-items-center overflow-hidden rounded-full bg-secondary text-primary">
                {photoPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoPreviewUrl}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <ImageOff className="size-3.5 text-muted-foreground" />
                )}
              </span>
              {photoPreviewUrl ? "Photo" : "No photo"}
            </button>

            <button
              type="button"
              onClick={onBack}
              disabled={isSubmitting}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card pl-2 pr-3.5 text-sm font-bold text-foreground transition hover:bg-accent"
            >
              <span className="grid size-7 place-items-center rounded-full bg-secondary text-primary">
                <User className="size-3.5" />
              </span>
              {values.name.trim() || "New member"}
            </button>

            {values.memberId.trim() && (
              <button
                type="button"
                onClick={onBack}
                disabled={isSubmitting}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card pl-2 pr-3.5 text-sm font-bold text-foreground transition hover:bg-accent"
              >
                <span className="grid size-7 place-items-center rounded-full bg-secondary text-primary">
                  <IdCard className="size-3.5" />
                </span>
                {values.memberId.trim()}
              </button>
            )}

            {values.dob && (
              <button
                type="button"
                onClick={onBack}
                disabled={isSubmitting}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card pl-2 pr-3.5 text-sm font-bold text-foreground transition hover:bg-accent"
              >
                <span className="grid size-7 place-items-center rounded-full bg-secondary text-primary">
                  <Calendar className="size-3.5" />
                </span>
                {values.dob}
              </button>
            )}
          </div>
        </div>
      </div>

      <footer className="sticky bottom-0 z-10 border-t border-border bg-card px-5 pt-3.5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:static sm:px-6 sm:py-4">
        <div className="grid grid-cols-[auto_1fr] gap-2.5 sm:flex sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            className="h-14 min-h-11 px-5 text-base font-bold"
            onClick={onBack}
          >
            <ArrowLeft className="size-5" />
            Back
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-14 min-h-11 text-base font-bold sm:min-w-[200px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                Creating…
              </>
            ) : (
              "Create & generate QR"
            )}
          </Button>
        </div>
      </footer>
    </form>
  );
}
