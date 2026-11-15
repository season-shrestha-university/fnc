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

const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: {
    facingMode: { ideal: "environment" },
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
};

type UseMemberCameraOptions = {
  onCapture: (file: File) => void;
  onMessage: (message: string, variant?: ToastVariant) => void;
};

export function useMemberCamera({
  onCapture,
  onMessage,
}: UseMemberCameraOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef(0);

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [hasStream, setHasStream] = useState(false);

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

  async function startCamera() {
    const availabilityError = checkCameraAvailability();
    if (availabilityError) {
      onMessage(availabilityError, "error");
      return;
    }

    stopCamera();
    const session = sessionRef.current;
    setIsCameraOpen(true);
    setIsStartingCamera(true);

    try {
      const stream = await openCameraStream(CAMERA_CONSTRAINTS);
      if (session !== sessionRef.current) {
        stopMediaStream(stream);
        return;
      }
      streamRef.current = stream;
      setHasStream(true);
      setIsStartingCamera(false);
    } catch (error) {
      if (session !== sessionRef.current) return;
      stopCamera();
      onMessage(cameraErrorMessage(error), "error");
    }
  }

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
      context.drawImage(video, 0, 0, target.width, target.height);
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
    isCameraOpen,
    isStartingCamera,
    startCamera,
    stopCamera,
    capturePhoto,
  };
}
