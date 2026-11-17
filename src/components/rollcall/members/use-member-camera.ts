"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ToastVariant } from "@/components/rollcall/layout/toast-provider";
import {
  calculateScaledDimensions,
  canvasToCompressedPhotoFile,
} from "@/components/rollcall/members/member-photo-utils";
import {
  cameraErrorMessage,
  checkCameraAvailability,
  openCameraStream,
  stopMediaStream,
} from "@/components/rollcall/shared/camera-utils";

export type CameraFacingMode = "user" | "environment";

function buildCameraConstraints(
  facingMode: CameraFacingMode,
): MediaStreamConstraints {
  return {
    audio: false,
    video: {
      facingMode: { ideal: facingMode },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  };
}

type UseMemberCameraOptions = {
  initialFacingMode?: CameraFacingMode;
  notifyOnError?: boolean;
  onCapture: (file: File) => void;
  onMessage: (message: string, variant?: ToastVariant) => void;
};

export function useMemberCamera({
  initialFacingMode = "environment",
  notifyOnError = true,
  onCapture,
  onMessage,
}: UseMemberCameraOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef(0);
  const facingModeRef = useRef<CameraFacingMode>(initialFacingMode);

  const [facingMode, setFacingMode] =
    useState<CameraFacingMode>(initialFacingMode);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [hasStream, setHasStream] = useState(false);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    sessionRef.current += 1;
    stopMediaStream(streamRef.current, videoRef.current);
    streamRef.current = null;
    setHasStream(false);
    setIsCameraOpen(false);
    setIsStartingCamera(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const refreshCameraCount = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setHasMultipleCameras(false);
      return;
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(
        (device) => device.kind === "videoinput",
      );
      setHasMultipleCameras(videoInputs.length > 1);
    } catch {
      setHasMultipleCameras(false);
    }
  }, []);

  useEffect(() => {
    if (!isCameraOpen || !hasStream) return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;

    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    void Promise.resolve(video.play()).catch(() => undefined);
  }, [isCameraOpen, hasStream]);

  const startCamera = useCallback(
    async (requestedMode?: CameraFacingMode) => {
      const targetMode = requestedMode ?? facingModeRef.current;
      const availabilityError = checkCameraAvailability();
      if (availabilityError) {
        stopCamera();
        setCameraError(availabilityError);
        if (notifyOnError) {
          onMessage(availabilityError, "error");
        }
        return;
      }

      stopCamera();
      const session = sessionRef.current;
      setCameraError(null);
      setIsCameraOpen(true);
      setIsStartingCamera(true);

      try {
        const stream = await openCameraStream(
          buildCameraConstraints(targetMode),
        );
        if (session !== sessionRef.current) {
          stopMediaStream(stream);
          return;
        }
        streamRef.current = stream;
        facingModeRef.current = targetMode;
        setFacingMode(targetMode);
        setHasStream(true);
        setIsStartingCamera(false);
        void refreshCameraCount();
      } catch (error) {
        if (session !== sessionRef.current) return;
        const message = cameraErrorMessage(error);
        stopCamera();
        setCameraError(message);
        if (notifyOnError) {
          onMessage(message, "error");
        }
      }
    },
    [notifyOnError, onMessage, refreshCameraCount, stopCamera],
  );

  const switchCamera = useCallback(async () => {
    const nextMode: CameraFacingMode =
      facingModeRef.current === "user" ? "environment" : "user";
    await startCamera(nextMode);
  }, [startCamera]);

  async function capturePhoto() {
    const video = videoRef.current;
    if (
      !video ||
      video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      onMessage("Camera is still warming up. Try again in a moment.", "error");
      return;
    }

    const target = calculateScaledDimensions(
      video.videoWidth,
      video.videoHeight,
    );
    const canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;
    const context = canvas.getContext("2d");
    if (!context) {
      onMessage("Unable to capture photo in this browser.", "error");
      return;
    }

    try {
      if (facingMode === "user") {
        // Mirror front-camera captures horizontally to match the live preview.
        context.save();
        context.translate(target.width, 0);
        context.scale(-1, 1);
        context.drawImage(video, 0, 0, target.width, target.height);
        context.restore();
      } else {
        context.drawImage(video, 0, 0, target.width, target.height);
      }

      const file = await canvasToCompressedPhotoFile(
        canvas,
        `member-photo-${Date.now()}`,
      );
      stopCamera();
      onCapture(file);
    } catch (error) {
      onMessage(
        error instanceof Error
          ? error.message
          : "Unable to capture photo. Please try again.",
        "error",
      );
    } finally {
      canvas.width = 0;
      canvas.height = 0;
    }
  }

  return {
    videoRef,
    facingMode,
    isCameraOpen,
    isStartingCamera,
    isStreamReady: hasStream,
    hasStream,
    hasMultipleCameras,
    cameraError,
    startCamera,
    stopCamera,
    switchCamera,
    capturePhoto,
  };
}
