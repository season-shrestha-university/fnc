"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import type { ToastVariant } from "@/components/rollcall/layout/toast-provider";

type UseQrScannerOptions = {
  onScan: (memberId: string) => void | Promise<void>;
  onMessage: (message: string, variant?: ToastVariant) => void;
};

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
        await onScanRef.current(memberId.trim());
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
    const nextScanner = new Html5Qrcode("qr-reader");
    scanner.current = nextScanner;

    try {
      await nextScanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 200, height: 200 } },
        async (decodedText) => {
          if (isProcessingScanRef.current) return;
          isProcessingScanRef.current = true;
          await stopScanner();
          setIsScanning(false);
          try {
            await onScanRef.current(decodedText);
          } finally {
            isProcessingScanRef.current = false;
          }
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
