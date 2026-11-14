/**
 * Shared browser camera helpers for opening, stopping, and diagnosing `getUserMedia` streams.
 */

export function checkCameraAvailability(): string | null {
  if (!window.isSecureContext) {
    return "Camera access requires HTTPS. Open this app over HTTPS on your phone.";
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return "This browser does not support camera access.";
  }
  return null;
}

export async function openCameraStream(
  constraints: MediaStreamConstraints,
): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (error) {
    const errorName = error instanceof DOMException ? error.name : undefined;
    if (errorName !== "OverconstrainedError" && errorName !== "NotFoundError") {
      throw error;
    }
    // Fall back to whatever camera the device offers.
    return navigator.mediaDevices.getUserMedia({ audio: false, video: true });
  }
}

export function stopMediaStream(
  stream: MediaStream | null | undefined,
  video?: HTMLVideoElement | null,
): void {
  stream?.getTracks().forEach((track) => track.stop());
  if (video) {
    video.pause();
    video.srcObject = null;
  }
}

export function cameraErrorMessage(error: unknown): string {
  const errorName = error instanceof DOMException ? error.name : undefined;
  switch (errorName) {
    case "NotAllowedError":
      return "Camera permission was denied. Allow camera access in browser settings.";
    case "NotFoundError":
      return "No camera was found on this device.";
    case "NotReadableError":
      return "The camera is in use by another app. Close it and try again.";
    case "OverconstrainedError":
      return "Could not start the camera with these settings. Try again or use manual entry.";
    default:
      return "Unable to access the camera. Check HTTPS and browser permissions.";
  }
}
