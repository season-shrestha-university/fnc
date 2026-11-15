"use client";

import {
  Suspense,
  use,
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import {
  Camera,
  Download,
  Pencil,
  Plus,
  Printer,
  QrCode,
  Search,
  Trash2,
} from "lucide-react";

import {
  deleteMember,
  updateMember,
  type DirectoryMember,
} from "@/app/actions";
import { Avatar } from "@/components/rollcall/check-in/attendance-view";
import { useToast } from "@/components/rollcall/layout/toast-provider";
import { CreateMemberWizardDialog } from "@/components/rollcall/members/create-member-wizard-dialog";
import { uploadMemberPhoto } from "@/components/rollcall/members/member-photo-upload";
import { useMemberCamera } from "@/components/rollcall/members/use-member-camera";
import {
  getAvatarColor,
  getInitials,
} from "@/components/rollcall/shared/member-utils";
import { MembersListSkeleton } from "@/components/rollcall/shared/workspace-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type MemberFormState = {
  memberId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  dob: string;
  pictureUrl: string;
};

const emptyMemberForm: MemberFormState = {
  memberId: "",
  name: "",
  email: "",
  phone: "",
  address: "",
  dob: "",
  pictureUrl: "",
};

function MembersListContent({
  initialMembers,
  search,
  optimisticMembers,
  deletedMemberIds,
  onSelectMember,
  onEditMember,
  onDeleteMember,
}: {
  initialMembers: DirectoryMember[];
  search: string;
  optimisticMembers: DirectoryMember[];
  deletedMemberIds: string[];
  onSelectMember: (member: DirectoryMember) => void;
  onEditMember: (member: DirectoryMember) => void;
  onDeleteMember: (member: DirectoryMember) => void;
}) {
  const deletedSet = new Set(deletedMemberIds);
  const mergedMap = new Map<string, DirectoryMember>();
  for (const member of initialMembers) {
    if (!deletedSet.has(member.id)) mergedMap.set(member.id, member);
  }
  for (const member of optimisticMembers) {
    if (!deletedSet.has(member.id)) mergedMap.set(member.id, member);
  }
  const members = Array.from(mergedMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const visibleMembers = members.filter((member) =>
    `${member.name} ${member.memberId} ${member.email} ${member.phone}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  if (visibleMembers.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-tint text-primary">
            <QrCode className="size-6" />
          </span>
          <p className="font-heading text-lg font-extrabold">No members found</p>
          <p className="text-[15px] text-muted-foreground">
            Add your first member to generate a QR code.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {visibleMembers.map((member) => {
        const contactSummary = [member.email, member.phone]
          .filter(Boolean)
          .join(" · ");
        return (
          <Card key={member.id}>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3.5">
                <Avatar
                  initials={getInitials(member.name)}
                  color={getAvatarColor(member.name)}
                  pictureUrl={member.pictureUrl || undefined}
                  alt={member.name}
                  size="lg"
                />
                <div className="min-w-0">
                  <p className="truncate text-[17px] font-bold">{member.name}</p>
                  <p className="mt-0.5 truncate font-mono text-sm text-muted-foreground">
                    {member.memberId}
                  </p>
                  {contactSummary && (
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {contactSummary}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  aria-label={`Edit ${member.name}`}
                  onClick={() => onEditMember(member)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="rounded-full text-destructive hover:bg-destructive-tint hover:text-destructive"
                  aria-label={`Delete ${member.name}`}
                  onClick={() => onDeleteMember(member)}
                >
                  <Trash2 className="size-4" />
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => onSelectMember(member)}
                >
                  <QrCode className="size-4" />
                  Generate QR
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function ResolvedMembersList({
  membersPromise,
  search,
  optimisticMembers,
  deletedMemberIds,
  onSelectMember,
  onEditMember,
  onDeleteMember,
}: {
  membersPromise: Promise<DirectoryMember[]>;
  search: string;
  optimisticMembers: DirectoryMember[];
  deletedMemberIds: string[];
  onSelectMember: (member: DirectoryMember) => void;
  onEditMember: (member: DirectoryMember) => void;
  onDeleteMember: (member: DirectoryMember) => void;
}) {
  const initialMembers = use(membersPromise);
  return (
    <MembersListContent
      initialMembers={initialMembers}
      search={search}
      optimisticMembers={optimisticMembers}
      deletedMemberIds={deletedMemberIds}
      onSelectMember={onSelectMember}
      onEditMember={onEditMember}
      onDeleteMember={onDeleteMember}
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
  const router = useRouter();
  const [optimisticMembers, setOptimisticMembers] = useState<DirectoryMember[]>(
    [],
  );
  const [deletedMemberIds, setDeletedMemberIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<DirectoryMember | null>(
    null,
  );
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [isCreateWizardOpen, setIsCreateWizardOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<DirectoryMember | null>(
    null,
  );
  const [deletingMember, setDeletingMember] = useState<DirectoryMember | null>(
    null,
  );
  const [memberForm, setMemberForm] =
    useState<MemberFormState>(emptyMemberForm);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isCameraPhoto, setIsCameraPhoto] = useState(false);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloadingQr, setIsDownloadingQr] = useState(false);
  const [isPrintingQr, setIsPrintingQr] = useState(false);

  useEffect(() => {
    if (!selectedMember) return;

    void QRCode.toDataURL(selectedMember.memberId, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 280,
      color: { dark: "#17171a", light: "#ffffff" },
    })
      .then(setQrDataUrl)
      .catch(() =>
        onMessage("Unable to generate this member QR code", "error"),
      );
  }, [onMessage, selectedMember]);

  useEffect(() => {
    return () => {
      if (photoPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);

  function applyPhotoFile(file: File | null, fromCamera = false) {
    if (photoPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreviewUrl);
    }
    setPhotoFile(file);
    setIsCameraPhoto(Boolean(file && fromCamera));
    setPhotoPreviewUrl(
      file ? URL.createObjectURL(file) : memberForm.pictureUrl,
    );
  }

  const {
    videoRef,
    isCameraOpen,
    isStartingCamera,
    startCamera,
    stopCamera,
    capturePhoto,
  } = useMemberCamera({
    onCapture: (file) => applyPhotoFile(file, true),
    onMessage,
  });

  function selectMember(member: DirectoryMember) {
    setQrDataUrl("");
    setSelectedMember(member);
  }

  function closeFormDialog() {
    stopCamera();
    setIsFormOpen(false);
    setEditingMember(null);
  }

  function openCreateDialog() {
    stopCamera();
    setIsFormOpen(false);
    setEditingMember(null);
    setIsCreateWizardOpen(true);
  }

  function openEditDialog(member: DirectoryMember) {
    stopCamera();
    setEditingMember(member);
    setMemberForm({
      memberId: member.memberId,
      name: member.name,
      email: member.email,
      phone: member.phone,
      address: member.address,
      dob: member.dob,
      pictureUrl: member.pictureUrl,
    });
    setPhotoFile(null);
    setIsCameraPhoto(false);
    setPhotoPreviewUrl(member.pictureUrl);
    setIsFormOpen(true);
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;
    if (selectedFile && !selectedFile.type.startsWith("image/")) {
      event.target.value = "";
      onMessage("Please select an image file", "error");
      return;
    }
    applyPhotoFile(selectedFile, false);
  }

  function clearPhoto() {
    if (photoPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreviewUrl);
    }
    setPhotoFile(null);
    setIsCameraPhoto(false);
    setPhotoPreviewUrl("");
    setMemberForm((current) => ({ ...current, pictureUrl: "" }));
  }

  async function handleSubmitMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      const pictureUrl = photoFile
        ? await uploadMemberPhoto(photoFile, { preCompressed: isCameraPhoto })
        : memberForm.pictureUrl;

      if (!editingMember) return;
      const updated = await updateMember({
        id: editingMember.id,
        name: memberForm.name,
        email: memberForm.email,
        phone: memberForm.phone,
        address: memberForm.address,
        dob: memberForm.dob,
        pictureUrl,
      });
      setOptimisticMembers((current) => [
        ...current.filter((item) => item.id !== updated.id),
        updated,
      ]);
      closeFormDialog();
      onMessage(`Updated ${updated.name}`, "success");
    } catch (error) {
      onMessage(
        error instanceof Error ? error.message : "Unable to save member",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingMember) return;
    setIsDeleting(true);
    try {
      await deleteMember(deletingMember.id);
      setDeletedMemberIds((current) => [...current, deletingMember.id]);
      setOptimisticMembers((current) =>
        current.filter((item) => item.id !== deletingMember.id),
      );
      if (selectedMember?.id === deletingMember.id) {
        setSelectedMember(null);
      }
      onMessage(`Deleted ${deletingMember.name}`, "success");
      setDeletingMember(null);
    } catch (error) {
      onMessage(
        error instanceof Error ? error.message : "Unable to delete member",
        "error",
      );
    } finally {
      setIsDeleting(false);
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
    <section className="py-8 sm:py-12">
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-4xl font-extrabold tracking-[-.03em]">
            Members and QR codes.
          </h1>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Search members"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search members"
            />
          </div>
          <Button onClick={openCreateDialog}
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
            deletedMemberIds={deletedMemberIds}
            onSelectMember={selectMember}
            onEditMember={openEditDialog}
            onDeleteMember={setDeletingMember}
          />
        </Suspense>
      ) : (
        <MembersListContent
          initialMembers={initialMembers ?? []}
          search={search}
          optimisticMembers={optimisticMembers}
          deletedMemberIds={deletedMemberIds}
          onSelectMember={selectMember}
          onEditMember={openEditDialog}
          onDeleteMember={setDeletingMember}
        />
      )}

      <CreateMemberWizardDialog
        open={isCreateWizardOpen}
        onClose={() => setIsCreateWizardOpen(false)}
        onCreated={(created) => {
          setOptimisticMembers((current) => [...current, created]);
          onMessage(
            `Member created and QR generated for ${created.name}`,
            "success",
          );
        }}
        onRefresh={() => router.refresh()}
        onMessage={onMessage}
      />

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-foreground/45 p-4">
          <Card className="my-auto w-full max-w-md">
            <CardContent className="p-6">
              <h2 className="mt-1 font-heading text-2xl font-extrabold tracking-[-.02em]">
                {editingMember ? "Update member profile" : "Create a member QR"}
              </h2>
              <form className="mt-6 grid gap-4" onSubmit={handleSubmitMember}>
                <label className="grid gap-2 text-sm font-semibold">
                  Name *
                  <Input
                    required
                    value={memberForm.name}
                    onChange={(event) =>
                      setMemberForm((current) => ({
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
                    value={memberForm.memberId}
                    readOnly={Boolean(editingMember)}
                    disabled={Boolean(editingMember)}
                    onChange={(event) =>
                      setMemberForm((current) => ({
                        ...current,
                        memberId: event.target.value,
                      }))
                    }
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-semibold">
                    Email
                    <Input
                      type="email"
                      placeholder="Optional"
                      value={memberForm.email}
                      onChange={(event) =>
                        setMemberForm((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold">
                    Phone
                    <Input
                      type="tel"
                      placeholder="Optional"
                      value={memberForm.phone}
                      onChange={(event) =>
                        setMemberForm((current) => ({
                          ...current,
                          phone: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
                <label className="grid gap-2 text-sm font-semibold">
                  Address
                  <Input
                    placeholder="Optional"
                    value={memberForm.address}
                    onChange={(event) =>
                      setMemberForm((current) => ({
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
                    value={memberForm.dob}
                    onChange={(event) =>
                      setMemberForm((current) => ({
                        ...current,
                        dob: event.target.value,
                      }))
                    }
                  />
                </label>
                <div className="grid gap-2 text-sm font-semibold">
                  <label htmlFor="member-photo-input">Photo</label>
                  {isCameraOpen ? (
                    <div className="grid gap-2">
                      <video
                        ref={videoRef}
                        aria-label="Member camera preview"
                        className="aspect-video w-full rounded-lg bg-scanner object-cover"
                        muted
                        playsInline
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={capturePhoto}
                          disabled={isStartingCamera}
                        >
                          {isStartingCamera ? "Starting camera..." : "Capture"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={stopCamera}
                        >
                          Cancel camera
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {photoPreviewUrl && (
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photoPreviewUrl}
                            alt="Member photo preview"
                            className="size-20 rounded-full object-cover ring-1 ring-border"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => void startCamera()}
                          >
                            Retake
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-sm text-muted-foreground"
                            onClick={clearPhoto}
                          >
                            Remove photo
                          </Button>
                        </div>
                      )}
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Input
                          id="member-photo-input"
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoChange}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() => void startCamera()}
                        >
                          <Camera className="size-4" />
                          Take photo
                        </Button>
                      </div>
                    </>
                  )}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeFormDialog}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" loading={isSaving}>
                    {isSaving
                      ? editingMember
                        ? "Saving..."
                        : "Creating..."
                      : editingMember
                        ? "Save changes"
                        : "Create & generate QR"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {deletingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/45 p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="p-6">
              <h2 className="font-heading text-xl font-extrabold">
                Delete {deletingMember.name}?
              </h2>
              <p className="mt-2 text-[15px] text-muted-foreground">
                This will permanently remove this member and all of their event
                check-in records. This action cannot be undone.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeletingMember(null)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-destructive text-white hover:bg-destructive/90"
                  onClick={handleConfirmDelete}
                  loading={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete member"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/45 p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="flex flex-col items-center p-6 text-center">
              <p className="text-[13px] font-bold text-muted-foreground">
                Member QR code
              </p>
              <h2 className="mt-1 font-heading text-2xl font-extrabold tracking-[-.02em]">{selectedMember.name}</h2>
              {qrDataUrl ? (
                <Image
                  className="my-5 size-64 rounded-xl p-2 ring-1 ring-border"
                  src={qrDataUrl}
                  alt={`QR code for ${selectedMember.memberId}`}
                  width={256}
                  height={256}
                  unoptimized
                />
              ) : (
                <div className="my-5 size-64 animate-pulse rounded-xl bg-muted" />
              )}
              <p className="font-mono text-sm text-muted-foreground">
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
