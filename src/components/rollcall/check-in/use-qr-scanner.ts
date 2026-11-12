"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import type { ToastVariant } from "@/components/rollcall/layout/toast-provider";

type UseQrScannerOptions = {
  onScan: (memberId: string) => void | Promise<void>;
  onMessage: (message: string, variant?: ToastVariant) => void;
};

const SCAN_FPS = 5;

const scannerConfig = {
  verbose: false,
  // Native BarcodeDetector is unreliable for QR on many mobile browsers; use the library decoder.
  useBarCodeDetectorIfSupported: false,
  formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
};

const scanConfig = {
  fps: SCAN_FPS,
  // Scan the full camera frame. A centered crop can miss a code on mobile,
  // where the preview aspect ratio differs from the camera sensor.
  disableFlip: true,
};

async function findBackCameraId(): Promise<string | undefined> {
  try {
    const cameras = await Html5Qrcode.getCameras();
    const backCamera = cameras.find((camera) =>
      /back|rear|environment/i.test(camera.label),
    );
    return backCamera?.id;
  } catch {
    // Camera enumeration can fail before permission is granted.
  }
  return undefined;
}

function normalizeMemberId(raw: string) {
  return raw.replace(/\u0000/g, "").trim();
}

export function useQrScanner({ onScan, onMessage }: UseQrScannerOptions) {
  const scanner = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  const isProcessingScanRef = useRef(false);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    async function handleTestScan(event: Event) {
      if (process.env.NODE_ENV === "production") return;
      const memberId = (event as CustomEvent<unknown>).detail;
      if (typeof memberId !== "string" || !memberId.trim()) return;
      if (isProcessingScanRef.current) return;

      if (scanner.current?.isScanning) {
        if (scanner.current.isScanning) await scanner.current.stop();
        scanner.current.clear();
        scanner.current = null;
        setIsScanning(false);
      }

      isProcessingScanRef.current = true;
      try {
        await onScanRef.current(normalizeMemberId(memberId));
      } finally {
        isProcessingScanRef.current = false;
      }
    }

    window.addEventListener("TEST_QR_SCAN", handleTestScan);
    return () => {
      window.removeEventListener("TEST_QR_SCAN", handleTestScan);
      if (scanner.current?.isScanning) {
        void scanner.current.stop().then(() => scanner.current?.clear());
      }
    };
  }, []);

  async function stopScanner() {
    if (!scanner.current) return;
    if (scanner.current.isScanning) await scanner.current.stop();
    scanner.current.clear();
    scanner.current = null;
  }

  async function stopScan() {
    if (!scanner.current) return;
    await stopScanner();
    setIsScanning(false);
  }

  async function startScan() {
    if (isScanning || isProcessingScanRef.current) return;
    if (!window.isSecureContext) {
      onMessage(
        "Camera access requires HTTPS. Open this app over HTTPS on your phone.",
        "error",
      );
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      onMessage("This browser does not support camera access.", "error");
      return;
    }

    setIsScanning(true);
    const nextScanner = new Html5Qrcode("qr-reader", scannerConfig);
    scanner.current = nextScanner;

    try {
      await nextScanner.start(
        { facingMode: "environment" },
        scanConfig,
        async (decodedText) => {
          if (isProcessingScanRef.current) return;
          isProcessingScanRef.current = true;
          await stopScanner();
          setIsScanning(false);
          try {
            await onScanRef.current(normalizeMemberId(decodedText));
          } finally {
            isProcessingScanRef.current = false;
          }
        },
        () => undefined,
      );
    } catch (error) {
      const errorName = error instanceof DOMException ? error.name : undefined;
      const canTryCameraId =
        errorName === "NotFoundError" || errorName === "OverconstrainedError";

      if (canTryCameraId) {
        const backCameraId = await findBackCameraId();
        if (backCameraId) {
          try {
            nextScanner.clear();
            await nextScanner.start(
              backCameraId,
              scanConfig,
              async (decodedText) => {
                if (isProcessingScanRef.current) return;
                isProcessingScanRef.current = true;
                await stopScanner();
                setIsScanning(false);
                try {
                  await onScanRef.current(normalizeMemberId(decodedText));
                } finally {
                  isProcessingScanRef.current = false;
                }
              },
              () => undefined,
            );
            return;
          } catch {
            // Report the original camera error below if the device-specific fallback fails.
          }
        }
      }

      scanner.current = null;
      setIsScanning(false);
      onMessage(
        errorName === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access in browser settings."
          : errorName === "NotFoundError"
            ? "No camera was found on this device."
            : errorName === "OverconstrainedError"
              ? "Could not start the camera with these settings. Try again or use manual entry."
              : "Unable to access the camera. Check HTTPS and browser permissions.",
        "error",
      );
    }
  }

  async function cancelScan() {
    await stopScanner();
    setIsScanning(false);
    onMessage("Scan cancelled");
  }

  return { isScanning, startScan, cancelScan, stopScan };
}
