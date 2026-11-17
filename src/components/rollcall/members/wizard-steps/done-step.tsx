"use client";

import { useEffect, useState, type RefObject } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { Check, Download, Plus, Printer, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ToastVariant } from "@/components/rollcall/layout/toast-provider";
import type { DirectoryMember } from "@/app/actions";

type DoneStepProps = {
  member: DirectoryMember;
  photoPreviewUrl: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onMessage: (message: string, variant?: ToastVariant) => void;
  onAddAnother: () => void;
  onDone: () => void;
};

export function DoneStep({
  member,
  photoPreviewUrl,
  headingRef,
  onMessage,
  onAddAnother,
  onDone,
}: DoneStepProps) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const avatarSrc = member.pictureUrl || photoPreviewUrl;

  useEffect(() => {
    let cancelled = false;
    void QRCode.toDataURL(member.memberId, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 280,
      color: { dark: "#17171a", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) {
          onMessage("Unable to generate this member QR code", "error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [member.memberId, onMessage]);

  function handleDownloadQr() {
    if (!qrDataUrl) return;
    setIsDownloading(true);
    try {
      const link = document.createElement("a");
      link.href = qrDataUrl;
      link.download = `${member.memberId}-qr.png`;
      link.click();
      onMessage(`QR code downloaded for ${member.name}`, "success");
    } finally {
      setIsDownloading(false);
    }
  }

  function handlePrintQr() {
    if (!qrDataUrl) return;
    setIsPrinting(true);
    try {
      const printWindow = window.open("", "_blank", "width=500,height=600");
      if (!printWindow) {
        onMessage("Allow pop-ups to print a QR code", "error");
        return;
      }
      printWindow.document.write(`
        <title>${member.name} member QR</title>
        <main style="font-family: sans-serif; text-align: center; padding: 32px">
          <h1>${member.name}</h1>
          <img src="${qrDataUrl}" alt="QR code for ${member.memberId}" />
          <p>${member.memberId}</p>
        </main>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } finally {
      setIsPrinting(false);
    }
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
        <div className="pt-1 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-secondary text-primary">
            <Check className="size-6" strokeWidth={2.6} />
          </div>
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="mt-2.5 font-heading text-2xl font-extrabold tracking-[-.02em] outline-none"
          >
            {member.name} is set up
          </h2>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            Their QR code is ready to print or send.
          </p>
        </div>

        <div className="mt-4 flex flex-col items-center rounded-2xl border border-border bg-card p-4">
          <div className="flex w-full items-center gap-3 border-b border-border pb-3.5">
            <div className="grid size-[52px] shrink-0 place-items-center overflow-hidden rounded-full bg-secondary text-primary">
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarSrc}
                  alt={member.name}
                  className="size-full object-cover object-[50%_25%]"
                />
              ) : (
                <User className="size-6" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-extrabold leading-tight">
                {member.name}
              </p>
              <p className="font-mono text-sm font-semibold text-muted-foreground">
                {member.memberId}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-border p-2.5">
            {qrDataUrl ? (
              <Image
                src={qrDataUrl}
                alt={`QR code for ${member.memberId}`}
                width={168}
                height={168}
                className="size-[168px]"
                unoptimized
              />
            ) : (
              <div className="skeleton-pulse size-[168px] rounded-lg bg-muted" />
            )}
          </div>

          <p className="mt-3 font-mono text-sm font-bold tracking-wider">
            {member.memberId}{" "}
            <span className="font-sans font-semibold tracking-normal text-muted-foreground">
              · RollCall
            </span>
          </p>
        </div>
      </div>

      <footer className="sticky bottom-0 z-10 border-t border-border bg-card px-5 pt-3.5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:static sm:px-6 sm:py-4">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
          <Button
            type="button"
            className="h-14 min-h-11 w-full text-base font-bold sm:order-3 sm:w-auto sm:flex-1"
            onClick={handleDownloadQr}
            disabled={!qrDataUrl || isDownloading}
            loading={isDownloading}
          >
            {!isDownloading && <Download className="size-5" />}
            Download QR
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-14 min-h-11 w-full text-base font-bold sm:order-2 sm:w-auto"
            onClick={handlePrintQr}
            disabled={!qrDataUrl || isPrinting}
            loading={isPrinting}
          >
            {!isPrinting && <Printer className="size-5" />}
            Print
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-14 min-h-11 w-full text-base font-bold sm:order-4 sm:w-full"
            onClick={onAddAnother}
          >
            <Plus className="size-5" />
            Add another member
          </Button>
          <button
            type="button"
            onClick={onDone}
            className="min-h-11 px-3 text-center text-base font-bold text-primary underline underline-offset-4 sm:order-1 sm:mr-auto sm:px-0"
          >
            Done
          </button>
        </div>
      </footer>
    </>
  );
}
