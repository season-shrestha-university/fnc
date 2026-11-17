"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { ArrowLeft, ArrowRight, Lock, User, X } from "lucide-react";
import { updateMember, type DirectoryMember } from "@/app/actions";
import type { ToastVariant } from "@/components/rollcall/layout/toast-provider";
import { DirtyDot } from "@/components/rollcall/shared/dirty-dot";
import {
  EDIT_SECTIONS,
  getEditDirtyMap,
  isEditDirty,
  routeServerErrorToStep,
  STEP_META,
  validateContactFields,
  validateDetailsFields,
  type EditSection,
  type EditSnapshot,
  type PhotoSubState,
  type WizardErrors,
  type WizardFormValues,
} from "@/components/rollcall/members/create-member-wizard-types";
import { uploadMemberPhoto } from "@/components/rollcall/members/member-photo-upload";
import { useMemberCamera } from "@/components/rollcall/members/use-member-camera";
import { ContactStep } from "@/components/rollcall/members/wizard-steps/contact-step";
import { DetailsStep } from "@/components/rollcall/members/wizard-steps/details-step";
import { PhotoStep } from "@/components/rollcall/members/wizard-steps/photo-step";
import { Button } from "@/components/ui/button";

type EditMemberDialogProps = {
  member: DirectoryMember | null;
  onClose: () => void;
  onUpdated: (member: DirectoryMember) => void;
  onMessage: (message: string, variant?: ToastVariant) => void;
};

export function EditMemberDialog(props: EditMemberDialogProps) {
  const [lastMember, setLastMember] = useState<DirectoryMember | null>(
    props.member,
  );
  if (props.member && props.member !== lastMember) {
    setLastMember(props.member);
  }
  const activeMember = props.member ?? lastMember;

  return (
    <DialogPrimitive.Root open={Boolean(props.member)}>
      <DialogPrimitive.Portal>
        {activeMember ? (
          <EditMemberContent
            key={activeMember.id}
            member={activeMember}
            onClose={props.onClose}
            onUpdated={props.onUpdated}
            onMessage={props.onMessage}
          />
        ) : null}
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function createInitialSnapshot(member: DirectoryMember): EditSnapshot {
  return {
    values: {
      name: member.name,
      memberId: member.memberId,
      dob: member.dob,
      email: member.email,
      phone: member.phone,
      address: member.address,
    },
    pictureUrl: member.pictureUrl,
  };
}

function EditMemberContent({
  member,
  onClose,
  onUpdated,
  onMessage,
}: {
  member: DirectoryMember;
  onClose: () => void;
  onUpdated: (member: DirectoryMember) => void;
  onMessage: (message: string, variant?: ToastVariant) => void;
}) {
  const [snapshot] = useState<EditSnapshot>(() =>
    createInitialSnapshot(member),
  );
  const [step, setStep] = useState<EditSection>("photo");
  const [photoSubState, setPhotoSubState] =
    useState<PhotoSubState>("portrait");
  const [values, setValues] = useState<WizardFormValues>(snapshot.values);
  const [pictureUrl, setPictureUrl] = useState(snapshot.pictureUrl);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isCameraPhoto, setIsCameraPhoto] = useState(false);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState(snapshot.pictureUrl);
  const [errors, setErrors] = useState<WizardErrors>({});
  const [focusField, setFocusField] = useState<"name" | "memberId" | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const tabRefs = useRef<Record<EditSection, HTMLButtonElement | null>>({
    photo: null,
    details: null,
    contact: null,
  });
  const photoPreviewUrlRef = useRef(snapshot.pictureUrl);

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
      } else {
        photoPreviewUrlRef.current = pictureUrl;
        setPhotoPreviewUrl(pictureUrl);
      }
      setPhotoSubState("portrait");
    },
    [pictureUrl, revokePreviewUrl],
  );

  const {
    videoRef,
    facingMode,
    isStartingCamera,
    isStreamReady,
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

  const dirtyMap = getEditDirtyMap(snapshot, values, pictureUrl, photoFile);
  const dirty = isEditDirty(dirtyMap);
  const canSave = dirty && Boolean(values.name.trim());

  const performClose = useCallback(() => {
    stopCamera();
    revokePreviewUrl(photoPreviewUrlRef.current);
    photoPreviewUrlRef.current = "";
    setShowDiscardConfirm(false);
    onClose();
  }, [onClose, revokePreviewUrl, stopCamera]);

  const requestClose = useCallback(() => {
    if (isSubmitting) return;
    if (dirty) {
      setShowDiscardConfirm(true);
      return;
    }
    performClose();
  }, [dirty, isSubmitting, performClose]);

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

  function switchToSection(nextStep: EditSection) {
    if (nextStep === step) return;
    if (step === "photo" && photoSubState === "camera") {
      stopCamera();
    }
    setPhotoSubState("portrait");
    setFocusField(null);
    setStep(nextStep);
  }

  function handleTabKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex =
      (index + delta + EDIT_SECTIONS.length) % EDIT_SECTIONS.length;
    const nextSection = EDIT_SECTIONS[nextIndex];
    switchToSection(nextSection);
    tabRefs.current[nextSection]?.focus();
  }

  function handleFieldChange(field: keyof WizardFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setFocusField(null);
    setErrors((current) => {
      const next = { ...current };
      if (field === "name") {
        if (value.trim()) {
          delete next.name;
        } else {
          next.name = "Enter the member’s name";
        }
      }
      if (field === "email") {
        delete next.email;
      }
      delete next.form;
      return next;
    });
  }

  function handleRemovePhoto() {
    revokePreviewUrl(photoPreviewUrlRef.current);
    photoPreviewUrlRef.current = "";
    setPhotoFile(null);
    setIsCameraPhoto(false);
    setPictureUrl("");
    setPhotoPreviewUrl("");
    setPhotoSubState("portrait");
  }

  async function handleSave() {
    if (isSubmitting) return;

    const detailsErrors = validateDetailsFields(values, "edit");
    if (Object.keys(detailsErrors).length > 0) {
      setErrors((current) => ({ ...current, ...detailsErrors }));
      switchToSection("details");
      setFocusField("name");
      return;
    }

    const contactErrors = validateContactFields(values);
    if (Object.keys(contactErrors).length > 0) {
      setErrors((current) => ({ ...current, ...contactErrors }));
      switchToSection("contact");
      return;
    }

    if (!dirty) return;

    setIsSubmitting(true);
    setErrors({});
    try {
      const nextPictureUrl = photoFile
        ? await uploadMemberPhoto(photoFile, { preCompressed: isCameraPhoto })
        : pictureUrl;

      const updated = await updateMember({
        id: member.id,
        name: values.name,
        email: values.email,
        phone: values.phone,
        address: values.address,
        dob: values.dob,
        pictureUrl: nextPictureUrl,
      });

      onUpdated(updated);
      performClose();
      onMessage(`Updated ${updated.name}`, "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save member";
      const routed = routeServerErrorToStep(message, "edit");
      setErrors(routed.errors);
      if (
        (routed.errors.name || routed.errors.email) &&
        routed.step !== "done" &&
        routed.step !== step
      ) {
        switchToSection(routed.step);
        if (routed.errors.name) setFocusField("name");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void handleSave();
  }

  const currentIndex = EDIT_SECTIONS.indexOf(step);
  const prevSection = currentIndex > 0 ? EDIT_SECTIONS[currentIndex - 1] : null;
  const nextSection =
    currentIndex < EDIT_SECTIONS.length - 1
      ? EDIT_SECTIONS[currentIndex + 1]
      : null;

  const liveName = values.name.trim();

  const activeTabIndex = EDIT_SECTIONS.indexOf(step);

  return (
    <>
      <DialogPrimitive.Backdrop
        onClick={requestClose}
        className="ui-backdrop fixed inset-0 z-50 bg-foreground/50"
      />
      <DialogPrimitive.Popup
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-member-dialog-title"
        className="ui-dialog ui-dialog-responsive-sheet fixed inset-0 z-50 flex h-[100dvh] w-full flex-col overflow-hidden bg-background text-foreground outline-none sm:inset-auto sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[90dvh] sm:max-w-[600px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[20px] sm:bg-card sm:ring-1 sm:ring-border"
      >
        <div aria-live="polite" className="sr-only">
          {STEP_META[step].label}
        </div>

        <header className="grid grid-cols-[44px_1fr_44px] items-center gap-2 px-4 pt-3 pb-2 sm:flex sm:items-center sm:gap-3 sm:px-6 sm:pt-5 sm:pb-0">
          <button
            type="button"
            onClick={requestClose}
            disabled={isSubmitting}
            aria-label="Close"
            className="grid min-h-11 min-w-11 place-items-center rounded-full border border-border bg-card text-foreground transition hover:bg-accent disabled:opacity-50 sm:border-0 sm:bg-secondary"
          >
            <X className="size-5" />
          </button>
          <h1
            id="edit-member-dialog-title"
            className="text-center font-heading text-[17px] font-extrabold sm:flex-1 sm:text-left sm:text-[19px]"
          >
            Edit member
          </h1>
          <span className="sm:hidden" aria-hidden="true" />
        </header>

        <div className="flex items-center gap-3 px-5 pb-2.5 pt-1 sm:px-6 sm:pt-3">
          <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary text-primary">
            {photoPreviewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoPreviewUrl}
                alt=""
                className="size-full object-cover object-[50%_25%]"
              />
            ) : (
              <User className="size-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={`truncate text-[17px] font-extrabold leading-tight ${
                liveName
                  ? "text-foreground"
                  : "font-semibold text-muted-foreground"
              }`}
            >
              {liveName || "Unnamed member"}
            </p>
            <span className="mt-1 inline-flex h-6 items-center gap-1.5 rounded-full border border-border bg-card px-2 text-xs font-bold text-muted-foreground">
              <Lock className="size-3 shrink-0" />
              <span>{member.memberId}</span>
              <span className="font-semibold opacity-75">can’t be changed</span>
            </span>
          </div>
        </div>

        <div className="px-5 pt-0.5 sm:px-6">
          <div
            aria-hidden="true"
            className="relative h-1 w-full overflow-hidden rounded-full bg-[#D5DCDF]"
          >
            <span
              className="tab-underline block h-full w-1/3 rounded-full bg-primary"
              style={{ "--tab-index": activeTabIndex } as CSSProperties}
            />
          </div>
          <div
            role="tablist"
            aria-label="Member sections"
            className="grid grid-cols-3"
          >
            {EDIT_SECTIONS.map((section, index) => {
              const isActive = step === section;
              const isSectionDirty = dirtyMap[section];
              return (
                <button
                  key={section}
                  ref={(element) => {
                    tabRefs.current[section] = element;
                  }}
                  type="button"
                  role="tab"
                  id={`edit-tab-${section}`}
                  aria-selected={isActive}
                  onClick={() => switchToSection(section)}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                  className="flex min-h-11 items-center justify-center px-1 py-1.5 focus-visible:rounded-lg focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <span
                    className={`inline-flex items-center gap-1.5 text-sm font-bold leading-none transition-colors duration-motion-fast ease-motion-standard ${
                      isActive ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {STEP_META[section].label}
                    <DirtyDot dirty={isSectionDirty} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <form
          onSubmit={handleFormSubmit}
          noValidate
          className="flex min-h-0 flex-1 flex-col"
        >
          <div key={step} className="tab-panel flex min-h-0 flex-1 flex-col">
            {step === "photo" && (
              <PhotoStep
                mode="edit"
                subState={photoSubState}
                photoPreviewUrl={photoPreviewUrl}
                memberName={liveName || snapshot.values.name}
                formError={errors.form}
                facingMode={facingMode}
                isStartingCamera={isStartingCamera}
                isStreamReady={isStreamReady}
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
                onRetake={() => setPhotoSubState("camera")}
                onCancelCamera={() => {
                  stopCamera();
                  setPhotoSubState("portrait");
                }}
                onRemovePhoto={handleRemovePhoto}
                onSkip={() => switchToSection("details")}
                onNext={() => switchToSection("details")}
              />
            )}

            {step === "details" && (
              <DetailsStep
                mode="edit"
                values={values}
                errors={errors}
                photoPreviewUrl={photoPreviewUrl}
                headingRef={headingRef}
                focusField={focusField}
                onChange={handleFieldChange}
              />
            )}

            {step === "contact" && (
              <ContactStep
                mode="edit"
                values={values}
                errors={errors}
                photoPreviewUrl={photoPreviewUrl}
                isSubmitting={isSubmitting}
                headingRef={headingRef}
                onChange={handleFieldChange}
              />
            )}
          </div>

          <footer className="sticky bottom-0 z-10 border-t border-border bg-card px-5 pt-2.5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:static sm:px-6 sm:py-4">
            <div className="mb-2 flex items-center justify-between">
              {prevSection ? (
                <button
                  type="button"
                  onClick={() => switchToSection(prevSection)}
                  className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-primary hover:underline"
                >
                  <ArrowLeft className="size-4" />
                  {STEP_META[prevSection].label}
                </button>
              ) : (
                <span />
              )}
              {nextSection ? (
                <button
                  type="button"
                  onClick={() => switchToSection(nextSection)}
                  className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-primary hover:underline"
                >
                  {STEP_META[nextSection].label}
                  <ArrowRight className="size-4" />
                </button>
              ) : (
                <span />
              )}
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:flex sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                className="h-14 min-h-11 px-6 text-base font-bold"
                onClick={requestClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={isSubmitting}
                loadingText="Saving…"
                disabled={!canSave || isSubmitting}
                className="h-14 min-h-11 text-base font-bold disabled:bg-[#C5CDD0] disabled:text-white disabled:opacity-100 sm:min-w-[200px]"
              >
                Save changes
              </Button>
            </div>
          </footer>
        </form>

        <DialogPrimitive.Root
          open={showDiscardConfirm}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setShowDiscardConfirm(false);
          }}
        >
          <DialogPrimitive.Portal>
            <DialogPrimitive.Backdrop className="ui-backdrop fixed inset-0 z-[60] bg-foreground/50" />
            <DialogPrimitive.Popup
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="edit-discard-confirm-title"
              className="ui-dialog fixed top-1/2 left-1/2 z-[60] w-full max-w-[336px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-lg outline-none"
            >
              <h2
                id="edit-discard-confirm-title"
                className="font-heading text-xl font-extrabold"
              >
                Discard changes?
              </h2>
              <p className="mt-2 text-sm font-medium text-muted-foreground">
                You have unsaved edits for {snapshot.values.name}. Closing now
                will lose them.
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
            </DialogPrimitive.Popup>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      </DialogPrimitive.Popup>
    </>
  );
}
