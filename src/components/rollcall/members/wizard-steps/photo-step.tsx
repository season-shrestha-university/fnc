"use client";

import { useEffect, useRef, type ChangeEvent, type RefObject } from "react";
import {
  AlertCircle,
  ArrowRight,
  Camera,
  Check,
  RefreshCw,
  Smile,
  Upload,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PhotoSubState } from "@/components/rollcall/members/create-member-wizard-types";
import type { CameraFacingMode } from "@/components/rollcall/members/use-member-camera";

type PhotoStepProps = {
  mode?: "create" | "edit";
  subState: PhotoSubState;
  photoPreviewUrl: string;
  memberName?: string;
  formError?: string;
  facingMode: CameraFacingMode;
  isStartingCamera: boolean;
  hasMultipleCameras: boolean;
  cameraError: string | null;
  videoRef: RefObject<HTMLVideoElement | null>;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onStartCamera: () => void;
  onStopCamera: () => void;
  onSwitchCamera: () => void;
  onCapture: () => void;
  onFileSelected: (file: File) => void;
  onInvalidFile: (message: string) => void;
  onRetake: () => void;
  onCancelCamera?: () => void;
  onRemovePhoto?: () => void;
  onSkip: () => void;
  onNext: () => void;
};

export function PhotoStep({
  mode = "create",
  subState,
  photoPreviewUrl,
  memberName,
  formError,
  facingMode,
  isStartingCamera,
  hasMultipleCameras,
  cameraError,
  videoRef,
  headingRef,
  onStartCamera,
  onStopCamera,
  onSwitchCamera,
  onCapture,
  onFileSelected,
  onInvalidFile,
  onRetake,
  onCancelCamera,
  onRemovePhoto,
  onSkip,
  onNext,
}: PhotoStepProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (subState !== "camera") return;
    onStartCamera();
    return () => {
      onStopCamera();
    };
  }, [subState, onStartCamera, onStopCamera]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      onInvalidFile("Please select an image file");
      return;
    }
    onStopCamera();
    onFileSelected(file);
  }

  const isEdit = mode === "edit";
  const hasPhoto = Boolean(photoPreviewUrl);

  return (
    <>
      <div className="flex flex-1 flex-col overflow-y-auto px-5 py-4 sm:px-6">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="font-heading text-2xl font-extrabold tracking-[-.02em] outline-none"
        >
          {isEdit
            ? subState === "camera"
              ? "Take a new photo"
              : hasPhoto
                ? "Member photo"
                : "Add a photo"
            : "Add a photo"}
        </h2>
        {subState !== "camera" || !isEdit ? (
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            Volunteers use this to recognise them at the door.
          </p>
        ) : null}

        {isEdit && formError && (
          <div
            role="alert"
            className="mt-4 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm font-semibold text-destructive"
          >
            <AlertCircle className="size-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {subState === "portrait" ? (
          <div className="mt-5 flex flex-col items-center gap-5">
            <div
              className={`grid size-44 place-items-center overflow-hidden rounded-full border-4 border-card shadow-sm ${
                hasPhoto
                  ? "bg-muted"
                  : "border-dashed border-border bg-secondary text-primary"
              }`}
            >
              {hasPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoPreviewUrl}
                  alt={`Current photo of ${memberName || "member"}`}
                  className="size-full object-cover object-[50%_25%]"
                />
              ) : (
                <User className="size-16 text-muted-foreground" />
              )}
            </div>

            <div className="flex w-full flex-col items-center gap-2.5">
              <div className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-14 min-h-11 text-base font-bold"
                  onClick={onRetake}
                >
                  <Camera className="size-5" />
                  {hasPhoto ? "Retake" : "Take photo"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-14 min-h-11 text-base font-bold"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="size-5" />
                  Upload new
                </Button>
              </div>
              {hasPhoto && onRemovePhoto && (
                <button
                  type="button"
                  onClick={onRemovePhoto}
                  className="min-h-11 px-4 text-base font-bold text-destructive transition hover:underline"
                >
                  Remove photo
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="relative mt-4 flex min-h-[240px] flex-1 items-center justify-center overflow-hidden rounded-2xl bg-[#1B2422] sm:h-[300px] sm:flex-none">
              {subState === "captured" && photoPreviewUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoPreviewUrl}
                    alt="Captured member photo"
                    className="h-full w-full object-cover object-[50%_30%]"
                  />
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-extrabold text-primary shadow-sm">
                    <span className="grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-3.5" />
                    </span>
                    Photo added
                  </span>
                </>
              ) : cameraError ? (
                <div className="flex max-w-xs flex-col items-center gap-2 px-6 text-center text-white">
                  <Camera className="size-8 text-white/70" />
                  <p className="text-sm font-semibold">
                    Camera not available. Upload a photo instead.
                  </p>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    aria-label="Member camera preview"
                    className={`h-full w-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
                    muted
                    playsInline
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute left-1/2 top-[48%] aspect-[3/4] h-[64%] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-dashed border-white/80 shadow-[0_0_0_600px_rgba(0,0,0,0.3)]"
                  />
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white backdrop-blur-xs">
                    <span className="size-2 rounded-full bg-emerald-300" />
                    {isStartingCamera ? "Starting camera…" : "Camera on"}
                  </span>
                  {hasMultipleCameras && (
                    <button
                      type="button"
                      onClick={onSwitchCamera}
                      aria-label="Switch camera"
                      className="absolute right-3 top-3 grid min-h-11 min-w-11 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-white"
                    >
                      <RefreshCw className="size-5" />
                    </button>
                  )}
                  <span className="pointer-events-none absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-xs">
                    <Smile className="size-4" />
                    Line their face up with the oval
                  </span>
                </>
              )}
            </div>

            {isEdit && subState === "camera" && (
              <div className="mt-4 flex flex-col items-center gap-2.5">
                <div className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-14 min-h-11 text-base font-bold"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="size-5" />
                    Upload new
                  </Button>
                  <Button
                    type="button"
                    className="h-14 min-h-11 text-base font-bold"
                    onClick={onCapture}
                    disabled={Boolean(cameraError) || isStartingCamera}
                  >
                    <Camera className="size-5" />
                    Take photo
                  </Button>
                </div>
                {onCancelCamera && (
                  <button
                    type="button"
                    onClick={onCancelCamera}
                    className="min-h-11 px-4 text-base font-bold text-primary underline underline-offset-4"
                  >
                    Cancel camera
                  </button>
                )}
              </div>
            )}
          </>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          aria-label={isEdit ? "Upload new photo" : "Upload photo from device"}
          className="sr-only"
          onChange={handleFileChange}
        />
      </div>

      {!isEdit && (
        <footer className="sticky bottom-0 z-10 border-t border-border bg-card px-5 pt-3.5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:static sm:px-6 sm:py-4">
          {subState === "captured" ? (
            <div className="grid grid-cols-[auto_1fr] gap-2.5 sm:flex sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="h-14 min-h-11 px-5 text-base font-bold"
                onClick={onRetake}
              >
                <Camera className="size-5" />
                Retake
              </Button>
              <Button
                type="button"
                className="h-14 min-h-11 text-base font-bold sm:min-w-[180px]"
                onClick={onNext}
              >
                Next
                <ArrowRight className="size-5" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <Button
                type="button"
                className="h-14 min-h-11 w-full text-base font-bold sm:order-3 sm:w-auto sm:min-w-[180px]"
                onClick={onCapture}
                disabled={Boolean(cameraError) || isStartingCamera}
              >
                <Camera className="size-5" />
                Take photo
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="h-14 min-h-11 w-full text-base font-bold sm:order-2 sm:w-auto"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="size-5" />
                Upload from device
              </Button>
              <button
                type="button"
                onClick={onSkip}
                className="min-h-11 px-3 text-center text-base font-bold text-primary underline underline-offset-4 sm:order-1 sm:mr-auto sm:px-0"
              >
                Skip for now
              </button>
            </div>
          )}
        </footer>
      )}
    </>
  );
}
