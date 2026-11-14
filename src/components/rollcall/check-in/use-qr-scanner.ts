"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ToastVariant } from "@/components/rollcall/layout/toast-provider";
import {
  cameraErrorMessage,
  checkCameraAvailability,
  openCameraStream,
  stopMediaStream,
} from "@/components/rollcall/shared/camera-utils";

type UseQrScannerOptions = {
  onScan: (memberId: string) => void | Promise<void>;
  onMessage: (message: string, variant?: ToastVariant) => void;
};

type QrDecoder = {
  decodeAsync(canvas: HTMLCanvasElement): Promise<{ text: string }>;
};

// ~5 decodes per second.
const SCAN_INTERVAL_MS = 200;

// Frames are decoded from the camera's native resolution (capped for speed),
// never from the on-screen preview size. Phones deliver portrait frames that
// don't match the preview box, and sampling at preview size squashed and
// shrank the QR so much that it never decoded.
const MAX_DECODE_EDGE = 1280;

const cameraConstraints: MediaStreamConstraints = {
  audio: false,
  video: {
    // `ideal` (not `exact`) so laptops without a back camera still work.
    facingMode: { ideal: "environment" },
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
};

const silentLogger = {
  log() {},
  warn() {},
  logError() {},
  logErrors() {},
};

let decoderPromise: Promise<QrDecoder> | null = null;

// The decoder (ZXing, bundled with html5-qrcode) is loaded only when a scan starts.
function loadDecoder(): Promise<QrDecoder> {
  decoderPromise ??= Promise.all([
    import("html5-qrcode/esm/code-decoder"),
    import("html5-qrcode/esm/core"),
  ])
    .then(
      ([{ Html5QrcodeShim }, { Html5QrcodeSupportedFormats }]) =>
        new Html5QrcodeShim(
          [Html5QrcodeSupportedFormats.QR_CODE],
          // Native BarcodeDetector is unreliable for QR on many mobile browsers.
          false,
          false,
          silentLogger,
        ),
    )
    .catch((error: unknown) => {
      decoderPromise = null;
      throw error;
    });
  return decoderPromise;
}

function normalizeMemberId(raw: string) {
  return raw.replace(/\u0000/g, "").trim();
}

export function useQrScanner({ onScan, onMessage }: UseQrScannerOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  // Incremented on every start/stop so stale async work can detect it was cancelled.
  const sessionRef = useRef(0);
  const onScanRef = useRef(onScan);
  const isProcessingScanRef = useRef(false);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const stopCamera = useCallback(() => {
    sessionRef.current += 1;
    if (scanTimerRef.current !== null) {
      window.clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    stopMediaStream(streamRef.current, videoRef.current);
    streamRef.current = null;
  }, []);

  const submitScan = useCallback(
    async (rawValue: string) => {
      if (isProcessingScanRef.current) return;
      isProcessingScanRef.current = true;
      stopCamera();
      setIsScanning(false);
      try {
        await onScanRef.current(normalizeMemberId(rawValue));
      } finally {
        isProcessingScanRef.current = false;
      }
    },
    [stopCamera],
  );

  useEffect(() => {
    function handleTestScan(event: Event) {
      if (process.env.NODE_ENV === "production") return;
      const memberId = (event as CustomEvent<unknown>).detail;
      if (typeof memberId !== "string" || !memberId.trim()) return;
      void submitScan(memberId);
    }

    window.addEventListener("TEST_QR_SCAN", handleTestScan);
    return () => {
      window.removeEventListener("TEST_QR_SCAN", handleTestScan);
      stopCamera();
    };
  }, [stopCamera, submitScan]);

  function scheduleScan(
    session: number,
    decoder: QrDecoder,
    canvas: HTMLCanvasElement,
    context: CanvasRenderingContext2D,
  ) {
    scanTimerRef.current = window.setTimeout(async () => {
      if (session !== sessionRef.current) return;

      const video = videoRef.current;
      let decodedText: string | undefined;
      if (
        video &&
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        video.videoWidth > 0
      ) {
        const scale = Math.min(
          1,
          MAX_DECODE_EDGE / Math.max(video.videoWidth, video.videoHeight),
        );
        const width = Math.round(video.videoWidth * scale);
        const height = Math.round(video.videoHeight * scale);
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }
        // Full frame, uniform scale: the QR keeps its square shape.
        context.drawImage(video, 0, 0, width, height);
        try {
          decodedText = (await decoder.decodeAsync(canvas)).text;
        } catch {
          // No QR code in this frame.
        }
      }

      if (session !== sessionRef.current) return;
      if (decodedText) {
        await submitScan(decodedText);
        return;
      }
      scheduleScan(session, decoder, canvas, context);
    }, SCAN_INTERVAL_MS);
  }

  async function startScan() {
    if (isScanning || isProcessingScanRef.current) return;
    const availabilityError = checkCameraAvailability();
    if (availabilityError) {
      onMessage(availabilityError, "error");
      return;
    }

    stopCamera();
    const session = sessionRef.current;
    setIsScanning(true);

    // Load the decoder while the camera permission prompt is open.
    const decoderLoad = loadDecoder();
    decoderLoad.catch(() => undefined);

    try {
      const stream = await openCameraStream(cameraConstraints);
      if (session !== sessionRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) throw new Error("Camera preview is not mounted.");
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      await video.play();

      const decoder = await decoderLoad;
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Canvas is not supported.");

      if (session !== sessionRef.current) return;
      scheduleScan(session, decoder, canvas, context);
    } catch (error) {
      // Cancelled while starting; stopCamera() already cleaned up.
      if (session !== sessionRef.current) return;
      stopCamera();
      setIsScanning(false);
      onMessage(cameraErrorMessage(error), "error");
    }
  }

  function stopScan() {
    stopCamera();
    setIsScanning(false);
  }

  function cancelScan() {
    stopScan();
    onMessage("Scan cancelled");
  }

  return { isScanning, startScan, cancelScan, stopScan, videoRef };
}
