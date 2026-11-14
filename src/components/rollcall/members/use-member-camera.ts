"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ToastVariant } from "@/components/rollcall/layout/toast-provider";
import {
  cameraErrorMessage,
  checkCameraAvailability,
  openCameraStream,
  stopMediaStream,
} from "@/components/rollcall/shared/camera-utils";

const PORTRAIT_CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: {
    facingMode: { ideal: "user" },
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
      const stream = await openCameraStream(PORTRAIT_CONSTRAINTS);
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

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      onMessage("Unable to capture photo in this browser.", "error");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9),
    );
    if (!blob) {
      onMessage("Unable to capture photo. Please try again.", "error");
      return;
    }

    const file = new File([blob], `member-photo-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });
    stopCamera();
    onCapture(file);
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
