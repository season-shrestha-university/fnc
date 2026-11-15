"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { createMember, type DirectoryMember } from "@/app/actions";
import RollCallLogo from "@/components/brand/rollcall-logo";
import type { ToastVariant } from "@/components/rollcall/layout/toast-provider";
import {
  EMPTY_WIZARD_VALUES,
  hasAnyWizardValue,
  routeServerErrorToStep,
  STEP_META,
  validateContactFields,
  validateDetailsFields,
  type PhotoSubState,
  type WizardErrors,
  type WizardFormValues,
  type WizardStep,
} from "@/components/rollcall/members/create-member-wizard-types";
import { uploadMemberPhoto } from "@/components/rollcall/members/member-photo-upload";
import { useMemberCamera } from "@/components/rollcall/members/use-member-camera";
import { ContactStep } from "@/components/rollcall/members/wizard-steps/contact-step";
import { DetailsStep } from "@/components/rollcall/members/wizard-steps/details-step";
import { DoneStep } from "@/components/rollcall/members/wizard-steps/done-step";
import { PhotoStep } from "@/components/rollcall/members/wizard-steps/photo-step";
import { Button } from "@/components/ui/button";

type CreateMemberWizardDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (member: DirectoryMember) => void;
  onRefresh: () => void;
  onMessage: (message: string, variant?: ToastVariant) => void;
};

export function CreateMemberWizardDialog(
  props: CreateMemberWizardDialogProps,
) {
  if (!props.open) return null;
  return <CreateMemberWizardContent {...props} />;
}

function CreateMemberWizardContent({
  onClose,
  onCreated,
  onRefresh,
  onMessage,
}: CreateMemberWizardDialogProps) {
  const [step, setStep] = useState<WizardStep>("photo");
  const [photoSubState, setPhotoSubState] = useState<PhotoSubState>("camera");
  const [values, setValues] = useState<WizardFormValues>(EMPTY_WIZARD_VALUES);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isCameraPhoto, setIsCameraPhoto] = useState(false);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
  const [errors, setErrors] = useState<WizardErrors>({});
  const [focusField, setFocusField] = useState<"name" | "memberId" | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdMember, setCreatedMember] = useState<DirectoryMember | null>(
    null,
  );
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const photoPreviewUrlRef = useRef("");

  const revokePreviewUrl = useCallback((url: string) => {
    if (url.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  }, []);

  const applyPhotoFile = useCallback(
    (file: File | null, fromCamera: boolean) => {
      revokePreviewUrl(photoPreviewUrlRef.current);
      setPhotoFile(file);
      setIsCameraPhoto(Boolean(file && fromCamera));
      if (file) {
        const nextUrl = URL.createObjectURL(file);
        photoPreviewUrlRef.current = nextUrl;
        setPhotoPreviewUrl(nextUrl);
        setPhotoSubState("captured");
      } else {
        photoPreviewUrlRef.current = "";
        setPhotoPreviewUrl("");
        setPhotoSubState("camera");
      }
    },
    [revokePreviewUrl],
  );

  const {
    videoRef,
    facingMode,
    isStartingCamera,
    hasMultipleCameras,
    cameraError,
    startCamera,
    stopCamera,
    switchCamera,
    capturePhoto,
  } = useMemberCamera({
    initialFacingMode: "user",
    notifyOnError: false,
    onCapture: (file) => applyPhotoFile(file, true),
    onMessage,
  });

  const resetWizardState = useCallback(() => {
    stopCamera();
    revokePreviewUrl(photoPreviewUrlRef.current);
    photoPreviewUrlRef.current = "";
    setStep("photo");
    setPhotoSubState("camera");
    setValues(EMPTY_WIZARD_VALUES);
    setPhotoFile(null);
    setIsCameraPhoto(false);
    setPhotoPreviewUrl("");
    setErrors({});
    setFocusField(null);
    setIsSubmitting(false);
    setCreatedMember(null);
    setShowDiscardConfirm(false);
  }, [revokePreviewUrl, stopCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
      revokePreviewUrl(photoPreviewUrlRef.current);
      photoPreviewUrlRef.current = "";
    };
  }, [revokePreviewUrl, stopCamera]);

  useEffect(() => {
    if (focusField) return;
    headingRef.current?.focus();
  }, [step, focusField]);

  const performClose = useCallback(() => {
    const wasDone = step === "done";
    resetWizardState();
    onClose();
    if (wasDone) {
      onRefresh();
    }
  }, [onClose, onRefresh, resetWizardState, step]);

  const requestClose = useCallback(() => {
    if (isSubmitting) return;
    if (step !== "done" && hasAnyWizardValue(values, photoFile)) {
      setShowDiscardConfirm(true);
      return;
    }
    performClose();
  }, [isSubmitting, performClose, photoFile, step, values]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (showDiscardConfirm) {
        setShowDiscardConfirm(false);
        return;
      }
      requestClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [requestClose, showDiscardConfirm]);

  function handleFieldChange(field: keyof WizardFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setFocusField(null);
    setErrors((current) => {
      const next = { ...current };
      if (field === "name" && value.trim()) {
        delete next.name;
      }
      if (field === "memberId") {
        delete next.memberId;
      }
      if (field === "email") {
        delete next.email;
      }
      delete next.form;
      return next;
    });
  }

  function handleRetake() {
    applyPhotoFile(null, false);
  }

  function handleSkipPhoto() {
    stopCamera();
    applyPhotoFile(null, false);
    setFocusField(null);
    setStep("details");
  }

  function handleGoToPhoto() {
    setFocusField(null);
    setPhotoSubState(photoFile ? "captured" : "camera");
    setStep("photo");
  }

  function handleDetailsNext(): boolean {
    const detailsErrors = validateDetailsFields(values);
    if (Object.keys(detailsErrors).length > 0) {
      setErrors((current) => ({ ...current, ...detailsErrors }));
      setFocusField("name");
      return false;
    }
    setFocusField(null);
    setStep("contact");
    return true;
  }

  async function handleSubmit() {
    const detailsErrors = validateDetailsFields(values);
    if (Object.keys(detailsErrors).length > 0) {
      setErrors((current) => ({ ...current, ...detailsErrors }));
      setStep("details");
      setFocusField("name");
      return;
    }

    const contactErrors = validateContactFields(values);
    if (Object.keys(contactErrors).length > 0) {
      setErrors((current) => ({ ...current, ...contactErrors }));
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    try {
      const pictureUrl = photoFile
        ? await uploadMemberPhoto(photoFile, { preCompressed: isCameraPhoto })
        : "";

      const created = await createMember({
        memberId: values.memberId,
        name: values.name,
        email: values.email,
        phone: values.phone,
        address: values.address,
        dob: values.dob,
        pictureUrl,
      });

      onCreated(created);
      setCreatedMember(created);
      setStep("done");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save member";
      const routed = routeServerErrorToStep(message);
      setErrors(routed.errors);
      if (routed.step !== step) {
        setStep(routed.step);
        if (routed.errors.name) setFocusField("name");
        else if (routed.errors.memberId) setFocusField("memberId");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleAddAnother() {
    resetWizardState();
    onRefresh();
  }

  const stepMeta = step === "done" ? null : STEP_META[step];
  const liveAnnouncement = stepMeta
    ? `Step ${stepMeta.number} of 3, ${stepMeta.label}`
    : "Member created";

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-foreground/50 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          requestClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-member-wizard-title"
        className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-background text-foreground sm:h-auto sm:max-h-[90dvh] sm:max-w-[600px] sm:rounded-[20px] sm:bg-card sm:ring-1 sm:ring-border"
      >
        <div aria-live="polite" className="sr-only">
          {liveAnnouncement}
        </div>

        <header className="grid grid-cols-[44px_1fr_44px] items-center gap-2 px-4 pt-3 pb-2 sm:flex sm:items-center sm:gap-3 sm:px-6 sm:pt-5 sm:pb-0">
          <button
            type="button"
            onClick={requestClose}
            disabled={isSubmitting}
            aria-label="Close"
            className="grid min-h-11 min-w-11 place-items-center rounded-full border border-border bg-card text-foreground transition hover:bg-accent disabled:opacity-50 sm:order-3 sm:border-0 sm:bg-secondary"
          >
            <X className="size-5" />
          </button>
          <span className="hidden sm:order-1 sm:inline-flex">
            <RollCallLogo compact className="size-8" />
          </span>
          <h1
            id="create-member-wizard-title"
            className="text-center font-heading text-[17px] font-extrabold sm:order-2 sm:flex-1 sm:text-left sm:text-[19px]"
          >
            {step === "done" ? "Member created" : "Create a member QR"}
          </h1>
          <span className="sm:hidden" aria-hidden="true" />
        </header>

        {stepMeta && (
          <div className="px-5 pt-2 sm:px-6 sm:pt-4">
            <div className="grid grid-cols-3 gap-1.5" aria-hidden="true">
              {[1, 2, 3].map((segment) => (
                <div
                  key={segment}
                  className={`h-1 rounded-full transition-colors ${
                    segment <= stepMeta.number ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
            <p className="mt-2.5 text-sm font-bold text-muted-foreground">
              <span className="text-primary">Step {stepMeta.number} of 3</span>{" "}
              · {stepMeta.label}
            </p>
          </div>
        )}

        {step === "photo" && (
          <PhotoStep
            subState={photoSubState}
            photoPreviewUrl={photoPreviewUrl}
            facingMode={facingMode}
            isStartingCamera={isStartingCamera}
            hasMultipleCameras={hasMultipleCameras}
            cameraError={cameraError}
            videoRef={videoRef}
            headingRef={headingRef}
            onStartCamera={startCamera}
            onStopCamera={stopCamera}
            onSwitchCamera={switchCamera}
            onCapture={capturePhoto}
            onFileSelected={(file) => applyPhotoFile(file, false)}
            onInvalidFile={(message) => onMessage(message, "error")}
            onRetake={handleRetake}
            onSkip={handleSkipPhoto}
            onNext={() => {
              setFocusField(null);
              setStep("details");
            }}
          />
        )}

        {step === "details" && (
          <DetailsStep
            values={values}
            errors={errors}
            photoPreviewUrl={photoPreviewUrl}
            headingRef={headingRef}
            focusField={focusField}
            onChange={handleFieldChange}
            onGoPhoto={handleGoToPhoto}
            onBack={handleGoToPhoto}
            onNext={handleDetailsNext}
          />
        )}

        {step === "contact" && (
          <ContactStep
            values={values}
            errors={errors}
            photoPreviewUrl={photoPreviewUrl}
            isSubmitting={isSubmitting}
            headingRef={headingRef}
            onChange={handleFieldChange}
            onGoPhoto={handleGoToPhoto}
            onBack={() => {
              setFocusField(null);
              setStep("details");
            }}
            onSubmit={handleSubmit}
          />
        )}

        {step === "done" && createdMember && (
          <DoneStep
            member={createdMember}
            photoPreviewUrl={photoPreviewUrl}
            headingRef={headingRef}
            onMessage={onMessage}
            onAddAnother={handleAddAnother}
            onDone={performClose}
          />
        )}

        {showDiscardConfirm && (
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="discard-confirm-title"
            className="absolute inset-0 z-20 flex items-center justify-center bg-foreground/50 p-5"
          >
            <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lg">
              <h2
                id="discard-confirm-title"
                className="font-heading text-xl font-extrabold"
              >
                Discard new member?
              </h2>
              <p className="mt-2 text-sm font-medium text-muted-foreground">
                You have unsaved details for this member. Closing now will
                discard what you entered.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 min-h-11 font-bold"
                  onClick={() => setShowDiscardConfirm(false)}
                >
                  Keep editing
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="h-12 min-h-11 font-bold"
                  onClick={performClose}
                >
                  Discard
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
