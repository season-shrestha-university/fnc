import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DirectoryMember } from "@/app/actions";

const {
  mockUpdateMember,
  mockShowToast,
  mockStorageUpload,
} = vi.hoisted(() => ({
  mockUpdateMember: vi.fn(),
  mockShowToast: vi.fn(),
  mockStorageUpload: vi.fn().mockResolvedValue({ error: null }),
}));

vi.mock("@/app/actions", () => ({
  updateMember: mockUpdateMember,
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => ({
    storage: {
      from: () => ({
        upload: mockStorageUpload,
        getPublicUrl: () => ({
          data: { publicUrl: "https://example.com/updated-photo.webp" },
        }),
      }),
    },
  }),
}));

import { EditMemberDialog } from "./edit-member-dialog";

const sampleMember: DirectoryMember = {
  id: "uuid-1",
  memberId: "MEMBER-001",
  name: "Bahadur Gurung",
  email: "bahadur@example.com",
  phone: "07700 900481",
  address: "12 Victoria Road",
  dob: "1961-03-14",
  pictureUrl: "https://example.com/bahadur.jpg",
};

describe("EditMemberDialog", () => {
  const originalMediaDevices = navigator.mediaDevices;
  const originalIsSecureContext = window.isSecureContext;
  const originalCreateObjectUrl = URL.createObjectURL;
  const originalRevokeObjectUrl = URL.revokeObjectURL;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "isSecureContext", {
      configurable: true,
      value: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: originalMediaDevices,
    });
    Object.defineProperty(window, "isSecureContext", {
      configurable: true,
      value: originalIsSecureContext,
    });
    URL.createObjectURL = originalCreateObjectUrl;
    URL.revokeObjectURL = originalRevokeObjectUrl;
  });

  function setupCameraMock() {
    const stopTrack = vi.fn();
    const mockStream = {
      getTracks: () => [{ stop: stopTrack }],
    } as unknown as MediaStream;
    const getUserMedia = vi.fn().mockResolvedValue(mockStream);
    const enumerateDevices = vi.fn().mockResolvedValue([
      { kind: "videoinput", deviceId: "cam-1" },
      { kind: "videoinput", deviceId: "cam-2" },
    ]);

    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia, enumerateDevices },
    });

    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    URL.createObjectURL = vi.fn(() => "blob:edit-photo");
    URL.revokeObjectURL = vi.fn();

    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      save: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      drawImage: vi.fn(),
      restore: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
      (callback) => {
        callback(new Blob(["webp"], { type: "image/webp" }));
      },
    );

    return { getUserMedia, stopTrack };
  }

  function renderDialog(member: DirectoryMember | null = sampleMember) {
    const onClose = vi.fn();
    const onUpdated = vi.fn();
    const result = render(
      <EditMemberDialog
        member={member}
        onClose={onClose}
        onUpdated={onUpdated}
        onMessage={mockShowToast}
      />,
    );
    return { ...result, onClose, onUpdated };
  }

  it("opens on Photo portrait without starting camera and closes immediately with no edits", () => {
    const { getUserMedia } = setupCameraMock();
    const { onClose } = renderDialog();

    expect(screen.getByRole("heading", { name: "Edit member" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Member photo" })).toBeInTheDocument();
    expect(screen.getByText("can’t be changed")).toBeInTheDocument();
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("dots only Contact when Phone changes, preserves across tabs, and saves from Photo", async () => {
    mockUpdateMember.mockResolvedValue({
      ...sampleMember,
      phone: "07700 900999",
    });

    const { onClose, onUpdated } = renderDialog();

    fireEvent.click(screen.getByRole("tab", { name: "Contact" }));
    fireEvent.change(screen.getByLabelText("Phone"), {
      target: { value: "07700 900999" },
    });

    const contactTab = screen.getByRole("tab", { name: /Contact/ });
    const photoTab = screen.getByRole("tab", { name: /Photo/ });
    const detailsTab = screen.getByRole("tab", { name: /Details/ });
    expect(within(contactTab).getByLabelText("Unsaved changes")).toBeInTheDocument();
    expect(within(photoTab).queryByLabelText("Unsaved changes")).not.toBeInTheDocument();
    expect(within(detailsTab).queryByLabelText("Unsaved changes")).not.toBeInTheDocument();

    fireEvent.click(photoTab);
    expect(within(contactTab).getByLabelText("Unsaved changes")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /Contact/ }));
    expect(screen.getByLabelText("Phone")).toHaveValue("07700 900999");

    fireEvent.click(photoTab);
    const saveButton = screen.getByRole("button", { name: "Save changes" });
    expect(saveButton).toBeEnabled();
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateMember).toHaveBeenCalledWith({
        id: "uuid-1",
        name: "Bahadur Gurung",
        email: "bahadur@example.com",
        phone: "07700 900999",
        address: "12 Victoria Road",
        dob: "1961-03-14",
        pictureUrl: "https://example.com/bahadur.jpg",
      });
    });

    expect(onUpdated).toHaveBeenCalledWith(
      expect.objectContaining({ phone: "07700 900999" }),
    );
    expect(mockShowToast).toHaveBeenCalledWith("Updated Bahadur Gurung", "success");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("validates Name immediately, updates header, and clears dots when reverted", async () => {
    renderDialog();

    fireEvent.click(screen.getByRole("tab", { name: "Details" }));
    const memberIdInput = screen.getByLabelText("Member ID");
    expect(memberIdInput).toHaveAttribute("readonly");
    expect(memberIdInput).toBeDisabled();

    const nameInput = screen.getByLabelText(/Name/);
    fireEvent.change(nameInput, { target: { value: "   " } });

    expect(screen.getByText("Unnamed member")).toBeInTheDocument();
    expect(screen.getByText("Enter the member’s name")).toBeInTheDocument();
    expect(nameInput).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();

    fireEvent.change(nameInput, { target: { value: "Bahadur Gurung" } });
    await waitFor(() => {
      expect(
        screen.queryByText("Enter the member’s name"),
      ).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    expect(screen.queryByLabelText("Unsaved changes")).not.toBeInTheDocument();
  });

  it("removes existing photo and persists empty pictureUrl", async () => {
    mockUpdateMember.mockResolvedValue({
      ...sampleMember,
      pictureUrl: "",
    });

    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Remove photo" }));

    expect(screen.getByRole("heading", { name: "Add a photo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Take photo" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(mockUpdateMember).toHaveBeenCalledWith(
        expect.objectContaining({ pictureUrl: "" }),
      );
    });
  });

  it("stops camera stream on Cancel camera and when switching tabs", async () => {
    const { getUserMedia, stopTrack } = setupCameraMock();
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Retake" }));
    await waitFor(() => {
      expect(getUserMedia).toHaveBeenCalledTimes(1);
      expect(screen.getByLabelText("Member camera preview")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel camera" }));
    expect(stopTrack).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("heading", { name: "Member photo" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retake" }));
    await waitFor(() => {
      expect(getUserMedia).toHaveBeenCalledTimes(2);
    });

    fireEvent.click(screen.getByRole("tab", { name: "Details" }));
    expect(stopTrack).toHaveBeenCalledTimes(2);
  });

  it("routes invalid email to Contact and blocks dismissal while saving", async () => {
    let resolveUpdate!: (member: DirectoryMember) => void;
    mockUpdateMember.mockImplementation(
      () =>
        new Promise<DirectoryMember>((resolve) => {
          resolveUpdate = resolve;
        }),
    );

    const { onClose } = renderDialog();

    fireEvent.click(screen.getByRole("tab", { name: "Contact" }));
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "not-an-email" },
    });

    fireEvent.click(screen.getByRole("tab", { name: "Photo" }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(screen.getByRole("heading", { name: "Contact details" })).toBeInTheDocument();
    expect(screen.getByText("Enter a valid email address")).toBeInTheDocument();
    expect(mockUpdateMember).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "new@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    resolveUpdate({ ...sampleMember, email: "new@example.com" });
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("opens discard sheet on Esc when dirty and dismisses sheet with Esc", () => {
    const { onClose } = renderDialog();

    fireEvent.click(screen.getByRole("tab", { name: "Details" }));
    fireEvent.change(screen.getByLabelText(/Name/), {
      target: { value: "Bahadur B. Gurung" },
    });

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText("Discard changes?")).toBeInTheDocument();
    expect(
      screen.getByText(
        "You have unsaved edits for Bahadur Gurung. Closing now will lose them.",
      ),
    ).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(mockUpdateMember).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
