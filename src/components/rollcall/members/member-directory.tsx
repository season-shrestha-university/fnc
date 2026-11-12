"use client";

import { Suspense, use, useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import {
  ArrowLeft,
  Download,
  Plus,
  Printer,
  QrCode,
  Search,
} from "lucide-react";

import {
  createMember,
  type DirectoryMember,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/rollcall/layout/toast-provider";
import { MembersListSkeleton } from "@/components/rollcall/shared/workspace-skeleton";

function MembersListContent({
  initialMembers,
  search,
  optimisticMembers,
  onSelectMember,
}: {
  initialMembers: DirectoryMember[];
  search: string;
  optimisticMembers: DirectoryMember[];
  onSelectMember: (member: DirectoryMember) => void;
}) {
  const mergedMap = new Map<string, DirectoryMember>();
  for (const member of initialMembers) mergedMap.set(member.id, member);
  for (const member of optimisticMembers) mergedMap.set(member.id, member);
  const members = Array.from(mergedMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const visibleMembers = members.filter((member) =>
    `${member.name} ${member.memberId}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  if (visibleMembers.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <QrCode className="size-8 text-[#85858c]" />
          <p className="font-semibold">No members found</p>
          <p className="text-sm text-[#85858c]">
            Add your first member to generate a QR code.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {visibleMembers.map((member) => (
        <Card key={member.id}>
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <p className="truncate font-bold">{member.name}</p>
              <p className="mt-1 truncate font-mono text-xs text-[#85858c]">
                {member.memberId}
              </p>
            </div>
            <Button
              className="gap-2 bg-[#5b5ce2] text-white hover:bg-[#4748c5]"
              onClick={() => onSelectMember(member)}
            >
              <QrCode className="size-4" />
              Generate QR
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ResolvedMembersList({
  membersPromise,
  search,
  optimisticMembers,
  onSelectMember,
}: {
  membersPromise: Promise<DirectoryMember[]>;
  search: string;
  optimisticMembers: DirectoryMember[];
  onSelectMember: (member: DirectoryMember) => void;
}) {
  const initialMembers = use(membersPromise);
  return (
    <MembersListContent
      initialMembers={initialMembers}
      search={search}
      optimisticMembers={optimisticMembers}
      onSelectMember={onSelectMember}
    />
  );
}

export default function MemberDirectory({
  initialMembers,
  membersPromise,
}: {
  initialMembers?: DirectoryMember[];
  membersPromise?: Promise<DirectoryMember[]>;
}) {
  const onMessage = useToast();
  const [optimisticMembers, setOptimisticMembers] = useState<DirectoryMember[]>(
    [],
  );
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<DirectoryMember | null>(
    null,
  );
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDownloadingQr, setIsDownloadingQr] = useState(false);
  const [isPrintingQr, setIsPrintingQr] = useState(false);
  const [newMember, setNewMember] = useState({
    memberId: "",
    name: "",
    address: "",
    dob: "",
    pictureUrl: "",
  });

  useEffect(() => {
    if (!selectedMember) return;

    void QRCode.toDataURL(selectedMember.memberId, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 280,
      color: { dark: "#17171a", light: "#ffffff" },
    })
      .then(setQrDataUrl)
      .catch(() => onMessage("Unable to generate this member QR code", "error"));
  }, [onMessage, selectedMember]);

  function selectMember(member: DirectoryMember) {
    setQrDataUrl("");
    setSelectedMember(member);
  }

  async function handleCreateMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreating(true);
    try {
      const member = await createMember(newMember);
      setOptimisticMembers((current) => [...current, member]);
      setNewMember({
        memberId: "",
        name: "",
        address: "",
        dob: "",
        pictureUrl: "",
      });
      setIsCreateOpen(false);
      selectMember(member);
      onMessage(`Member created and QR generated for ${member.name}`, "success");
    } catch (error) {
      onMessage(
        error instanceof Error ? error.message : "Unable to create member",
        "error",
      );
    } finally {
      setIsCreating(false);
    }
  }

  function downloadQr() {
    if (!qrDataUrl || !selectedMember) return;
    setIsDownloadingQr(true);
    try {
      const link = document.createElement("a");
      link.href = qrDataUrl;
      link.download = `${selectedMember.memberId}-qr.png`;
      link.click();
      onMessage(`QR code downloaded for ${selectedMember.name}`, "success");
    } finally {
      setIsDownloadingQr(false);
    }
  }

  function printQr() {
    if (!qrDataUrl || !selectedMember) return;
    setIsPrintingQr(true);
    try {
      const printWindow = window.open("", "_blank", "width=500,height=600");
      if (!printWindow) {
        onMessage("Allow pop-ups to print a QR code", "error");
        return;
      }
      printWindow.document.write(`
        <title>${selectedMember.name} member QR</title>
        <main style="font-family: sans-serif; text-align: center; padding: 32px">
          <h1>${selectedMember.name}</h1>
          <img src="${qrDataUrl}" alt="QR code for ${selectedMember.memberId}" />
          <p>${selectedMember.memberId}</p>
        </main>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } finally {
      setIsPrintingQr(false);
    }
  }

  return (
    <section className="py-10">
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/"
            className="-ml-3 mb-4 inline-flex h-8 items-center gap-2 rounded-lg px-2.5 text-sm font-medium text-[#77777e] transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to check-in
          </Link>
          <p className="mb-2.5 text-sm font-bold uppercase tracking-[.11em] text-[#85858c]">
            Member directory
          </p>
          <h1 className="text-4xl font-bold tracking-[-.05em]">
            Members and QR codes.
          </h1>
          <p className="mt-3 max-w-xl text-sm text-[#85858c]">
            Each QR contains the exact member ID used by the check-in scanner.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#85858c]" />
            <Input
              className="h-10 pl-9"
              placeholder="Search members"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search members"
            />
          </div>
          <Button
            className="h-10 gap-2 bg-[#5b5ce2] text-white hover:bg-[#4748c5]"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="size-4" />
            Add member
          </Button>
        </div>
      </div>

      {membersPromise ? (
        <Suspense fallback={<MembersListSkeleton />}>
          <ResolvedMembersList
            membersPromise={membersPromise}
            search={search}
            optimisticMembers={optimisticMembers}
            onSelectMember={selectMember}
          />
        </Suspense>
      ) : (
        <MembersListContent
          initialMembers={initialMembers ?? []}
          search={search}
          optimisticMembers={optimisticMembers}
          onSelectMember={selectMember}
        />
      )}

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-5">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <p className="text-xs font-bold uppercase tracking-[.11em] text-[#85858c]">
                New member
              </p>
              <h2 className="mt-2 text-2xl font-bold">Create a member QR</h2>
              <p className="mt-2 text-sm text-[#85858c]">
                Leave Member ID blank to generate one automatically.
              </p>
              <form className="mt-6 grid gap-4" onSubmit={handleCreateMember}>
                <label className="grid gap-2 text-sm font-semibold">
                  Name *
                  <Input
                    required
                    value={newMember.name}
                    onChange={(event) =>
                      setNewMember((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold">
                  Member ID
                  <Input
                    placeholder="Example: MEMBER-001"
                    value={newMember.memberId}
                    onChange={(event) =>
                      setNewMember((current) => ({
                        ...current,
                        memberId: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold">
                  Address
                  <Input
                    value={newMember.address}
                    onChange={(event) =>
                      setNewMember((current) => ({
                        ...current,
                        address: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold">
                  Date of birth
                  <Input
                    type="date"
                    value={newMember.dob}
                    onChange={(event) =>
                      setNewMember((current) => ({
                        ...current,
                        dob: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold">
                  Picture URL
                  <Input
                    type="url"
                    placeholder="Optional"
                    value={newMember.pictureUrl}
                    onChange={(event) =>
                      setNewMember((current) => ({
                        ...current,
                        pictureUrl: event.target.value,
                      }))
                    }
                  />
                </label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateOpen(false)}
                    disabled={isCreating}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" loading={isCreating}>
                    {isCreating ? "Creating..." : "Create & generate QR"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-5">
          <Card className="w-full max-w-sm">
            <CardContent className="flex flex-col items-center p-6 text-center">
              <p className="text-xs font-bold uppercase tracking-[.11em] text-[#85858c]">
                Member QR code
              </p>
              <h2 className="mt-2 text-2xl font-bold">{selectedMember.name}</h2>
              {qrDataUrl ? (
                <Image
                  className="my-5 size-64 rounded-xl border border-[#e7e7ea] p-2"
                  src={qrDataUrl}
                  alt={`QR code for ${selectedMember.memberId}`}
                  width={256}
                  height={256}
                  unoptimized
                />
              ) : (
                <div className="my-5 size-64 animate-pulse rounded-xl bg-[#f1f1f6]" />
              )}
              <p className="font-mono text-sm text-[#85858c]">
                {selectedMember.memberId}
              </p>
              <div className="mt-6 grid w-full grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={downloadQr}
                  disabled={!qrDataUrl || isDownloadingQr}
                  loading={isDownloadingQr}
                >
                  {!isDownloadingQr && <Download className="size-4" />}
                  Download
                </Button>
                <Button
                  variant="outline"
                  onClick={printQr}
                  disabled={!qrDataUrl || isPrintingQr}
                  loading={isPrintingQr}
                >
                  {!isPrintingQr && <Printer className="size-4" />}
                  Print
                </Button>
              </div>
              <Button
                variant="ghost"
                className="mt-2 w-full"
                onClick={() => setSelectedMember(null)}
              >
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}
