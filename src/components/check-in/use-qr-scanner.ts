"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

type UseQrScannerOptions = {
  onScan: (memberId: string) => void | Promise<void>;
  onMessage: (message: string) => void;
};

export function useQrScanner({ onScan, onMessage }: UseQrScannerOptions) {
  const scanner = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    function handleTestScan(event: Event) {
      if (process.env.NODE_ENV === "production") return;
      const memberId = (event as CustomEvent<unknown>).detail;
      if (typeof memberId === "string" && memberId.trim()) {
        void onScanRef.current(memberId.trim());
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
    if (isScanning) return;
    if (!window.isSecureContext) {
      onMessage("Camera access requires HTTPS. Open this app over HTTPS on your phone.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      onMessage("This browser does not support camera access.");
      return;
    }

    setIsScanning(true);
    const nextScanner = new Html5Qrcode("qr-reader");
    scanner.current = nextScanner;

    try {
      await nextScanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 200, height: 200 } },
        async (decodedText) => {
          await stopScanner();
          setIsScanning(false);
          await onScan(decodedText);
        },
        () => undefined,
      );
    } catch (error) {
      scanner.current = null;
      setIsScanning(false);
      const errorName = error instanceof DOMException ? error.name : undefined;
      onMessage(
        errorName === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access in browser settings."
          : errorName === "NotFoundError"
            ? "No camera was found on this device."
            : "Unable to access the camera. Check HTTPS and browser permissions.",
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
