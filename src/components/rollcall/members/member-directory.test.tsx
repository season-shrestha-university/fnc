import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockCreateMember,
  mockUpdateMember,
  mockDeleteMember,
  mockShowToast,
  mockStorageUpload,
  mockRouterRefresh,
} = vi.hoisted(() => ({
  mockCreateMember: vi.fn(),
  mockUpdateMember: vi.fn(),
  mockDeleteMember: vi.fn(),
  mockShowToast: vi.fn(),
  mockStorageUpload: vi.fn().mockResolvedValue({ error: null }),
  mockRouterRefresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRouterRefresh }),
}));

vi.mock("@/app/actions", () => ({
  createMember: mockCreateMember,
  updateMember: mockUpdateMember,
  deleteMember: mockDeleteMember,
}));

vi.mock("@/components/rollcall/layout/toast-provider", () => ({
  useToast: () => mockShowToast,
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => ({
    storage: {
      from: () => ({
        upload: mockStorageUpload,
        getPublicUrl: () => ({
          data: { publicUrl: "https://example.com/photo.webp" },
        }),
      }),
    },
  }),
}));

import MemberDirectory from "./member-directory";

const sampleMembers = [
  {
    id: "uuid-1",
    memberId: "FNC-001",
    name: "Ada Lovelace",
    email: "ada@example.com",
    phone: "555-0100",
    address: "10 Downing",
    dob: "1815-12-10",
    pictureUrl: "https://example.com/ada.jpg",
  },
  {
    id: "uuid-2",
    memberId: "FNC-002",
    name: "Grace Hopper",
    email: "",
    phone: "",
    address: "",
    dob: "",
    pictureUrl: "",
  },
];

describe("MemberDirectory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders photo avatars and initials fallback", () => {
    render(<MemberDirectory initialMembers={sampleMembers} />);

    const adaPhoto = screen.getByRole("img", { name: "Ada Lovelace" });
    expect(adaPhoto).toHaveAttribute("src", "https://example.com/ada.jpg");
    expect(screen.getByText("GH")).toBeInTheDocument();
  });

  it("edits a member with read-only member ID", async () => {
    mockUpdateMember.mockResolvedValue({
      ...sampleMembers[0],
      name: "Ada King",
    });

    render(<MemberDirectory initialMembers={sampleMembers} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit Ada Lovelace" }));

    const memberIdInput = screen.getByLabelText("Member ID");
    expect(memberIdInput).toHaveAttribute("readonly");
    expect(memberIdInput).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Name *"), {
      target: { value: "Ada King" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(mockUpdateMember).toHaveBeenCalledWith({
        id: "uuid-1",
        name: "Ada King",
        email: "ada@example.com",
        phone: "555-0100",
        address: "10 Downing",
        dob: "1815-12-10",
        pictureUrl: "https://example.com/ada.jpg",
      });
    });

    expect(screen.getByText("Ada King")).toBeInTheDocument();
  });

  it("deletes a member after confirmation", async () => {
    mockDeleteMember.mockResolvedValue(undefined);

    render(<MemberDirectory initialMembers={sampleMembers} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Delete Grace Hopper" }),
    );
    expect(screen.getByText("Delete Grace Hopper?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete member" }));

    await waitFor(() => {
      expect(mockDeleteMember).toHaveBeenCalledWith("uuid-2");
    });
    expect(screen.queryByText("Grace Hopper")).not.toBeInTheDocument();
  });

  describe("camera photo capture", () => {
    const originalMediaDevices = navigator.mediaDevices;
    const originalIsSecureContext = window.isSecureContext;
    const originalCreateObjectUrl = URL.createObjectURL;
    const originalRevokeObjectUrl = URL.revokeObjectURL;

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

    function setupCameraEnvironment() {
      const stopTrack = vi.fn();
      const mockStream = {
        getTracks: () => [{ stop: stopTrack }],
      } as unknown as MediaStream;
      const getUserMedia = vi.fn().mockResolvedValue(mockStream);

      Object.defineProperty(window, "isSecureContext", {
        configurable: true,
        value: true,
      });
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: { getUserMedia },
      });

      vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
      URL.createObjectURL = vi.fn(() => "blob:captured-photo");
      URL.revokeObjectURL = vi.fn();

      const drawImage = vi.fn();
      vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
        drawImage,
      } as unknown as CanvasRenderingContext2D);
      const toBlob = vi
        .spyOn(HTMLCanvasElement.prototype, "toBlob")
        .mockImplementation((callback) => {
          callback(new Blob(["webp-bytes"], { type: "image/webp" }));
        });

      return { getUserMedia, stopTrack, drawImage, toBlob };
    }

    function markVideoReady() {
      const video = screen.getByLabelText(
        "Member camera preview",
      ) as HTMLVideoElement;
      Object.defineProperty(video, "readyState", {
        configurable: true,
        value: HTMLMediaElement.HAVE_CURRENT_DATA,
      });
      Object.defineProperty(video, "videoWidth", {
        configurable: true,
        value: 640,
      });
      Object.defineProperty(video, "videoHeight", {
        configurable: true,
        value: 480,
      });
      return video;
    }

    it("captures a camera photo and submits it when updating a member", async () => {
      const { getUserMedia, stopTrack, drawImage, toBlob } =
        setupCameraEnvironment();
      mockUpdateMember.mockResolvedValue({
        ...sampleMembers[1],
        name: "Katherine Johnson",
        pictureUrl: "https://example.com/photo.webp",
      });

      render(<MemberDirectory initialMembers={sampleMembers} />);

      fireEvent.click(screen.getByRole("button", { name: "Edit Grace Hopper" }));
      fireEvent.change(screen.getByLabelText("Name *"), {
        target: { value: "Katherine Johnson" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Take photo" }));

      await waitFor(() => {
        expect(getUserMedia).toHaveBeenCalledWith({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      });

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Capture" })).toBeEnabled();
      });

      markVideoReady();
      fireEvent.click(screen.getByRole("button", { name: "Capture" }));

      await waitFor(() => {
        expect(drawImage).toHaveBeenCalledWith(
          expect.any(HTMLVideoElement),
          0,
          0,
          600,
          450,
        );
        expect(toBlob).toHaveBeenCalledWith(
          expect.any(Function),
          "image/webp",
          expect.any(Number),
        );
        const quality = toBlob.mock.calls[0]?.[2];
        expect(quality).toBeGreaterThanOrEqual(0.75);
        expect(quality).toBeLessThanOrEqual(0.8);
        expect(stopTrack).toHaveBeenCalled();
        expect(screen.getByAltText("Member photo preview")).toHaveAttribute(
          "src",
          "blob:captured-photo",
        );
      });

      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

      await waitFor(() => {
        expect(mockUpdateMember).toHaveBeenCalledWith(
          expect.objectContaining({
            name: "Katherine Johnson",
            pictureUrl: "https://example.com/photo.webp",
          }),
        );
      });
    });

    it("stops the camera stream when cancelling camera or closing the modal", async () => {
      const { stopTrack } = setupCameraEnvironment();

      render(<MemberDirectory initialMembers={sampleMembers} />);
      fireEvent.click(screen.getByRole("button", { name: "Edit Grace Hopper" }));
      fireEvent.click(screen.getByRole("button", { name: "Take photo" }));

      await waitFor(() => {
        expect(
          screen.getByLabelText("Member camera preview"),
        ).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "Cancel camera" }));
      expect(stopTrack).toHaveBeenCalledTimes(1);
      expect(screen.getByLabelText("Photo")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Take photo" }));
      await waitFor(() => {
        expect(
          screen.getByLabelText("Member camera preview"),
        ).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(stopTrack).toHaveBeenCalledTimes(2);
    });

    it("supports retaking a captured photo", async () => {
      const { getUserMedia } = setupCameraEnvironment();

      render(<MemberDirectory initialMembers={sampleMembers} />);
      fireEvent.click(screen.getByRole("button", { name: "Edit Grace Hopper" }));
      fireEvent.click(screen.getByRole("button", { name: "Take photo" }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Capture" })).toBeEnabled();
      });

      markVideoReady();
      fireEvent.click(screen.getByRole("button", { name: "Capture" }));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Retake" }),
        ).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "Retake" }));

      await waitFor(() => {
        expect(getUserMedia).toHaveBeenCalledTimes(2);
        expect(
          screen.getByLabelText("Member camera preview"),
        ).toBeInTheDocument();
      });
    });

    it("shows an error and keeps file upload available on permission denied or insecure context", async () => {
      Object.defineProperty(window, "isSecureContext", {
        configurable: true,
        value: false,
      });

      render(<MemberDirectory initialMembers={sampleMembers} />);
      fireEvent.click(screen.getByRole("button", { name: "Edit Grace Hopper" }));
      fireEvent.click(screen.getByRole("button", { name: "Take photo" }));

      expect(mockShowToast).toHaveBeenCalledWith(
        "Camera access requires HTTPS. Open this app over HTTPS on your phone.",
        "error",
      );
      expect(screen.getByLabelText("Photo")).toBeInTheDocument();

      Object.defineProperty(window, "isSecureContext", {
        configurable: true,
        value: true,
      });
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: {
          getUserMedia: vi
            .fn()
            .mockRejectedValue(
              new DOMException("Permission denied", "NotAllowedError"),
            ),
        },
      });

      fireEvent.click(screen.getByRole("button", { name: "Take photo" }));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          "Camera permission was denied. Allow camera access in browser settings.",
          "error",
        );
      });
      expect(screen.getByLabelText("Photo")).toBeInTheDocument();
    });
  });

  describe("photo file upload", () => {
    const originalCreateImageBitmap = globalThis.createImageBitmap;
    const originalCreateObjectUrl = URL.createObjectURL;
    const originalRevokeObjectUrl = URL.revokeObjectURL;

    afterEach(() => {
      vi.restoreAllMocks();
      globalThis.createImageBitmap = originalCreateImageBitmap;
      URL.createObjectURL = originalCreateObjectUrl;
      URL.revokeObjectURL = originalRevokeObjectUrl;
    });

    it("compresses an uploaded image file to WebP before storing", async () => {
      const closeBitmap = vi.fn();
      globalThis.createImageBitmap = vi.fn().mockResolvedValue({
        width: 800,
        height: 600,
        close: closeBitmap,
      } as unknown as ImageBitmap);
      URL.createObjectURL = vi.fn(() => "blob:selected-photo");
      URL.revokeObjectURL = vi.fn();

      const drawImage = vi.fn();
      vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
        drawImage,
      } as unknown as CanvasRenderingContext2D);
      vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
        (callback) => {
          callback(new Blob(["webp-bytes"], { type: "image/webp" }));
        },
      );

      mockUpdateMember.mockResolvedValue({
        ...sampleMembers[1],
        name: "Alan Turing",
        pictureUrl: "https://example.com/photo.webp",
      });

      render(<MemberDirectory initialMembers={sampleMembers} />);

      fireEvent.click(screen.getByRole("button", { name: "Edit Grace Hopper" }));
      fireEvent.change(screen.getByLabelText("Name *"), {
        target: { value: "Alan Turing" },
      });

      const fileInput = screen.getByLabelText("Photo") as HTMLInputElement;
      const pngFile = new File(["png-data"], "alan.png", { type: "image/png" });
      fireEvent.change(fileInput, { target: { files: [pngFile] } });

      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

      await waitFor(() => {
        expect(mockStorageUpload).toHaveBeenCalledWith(
          expect.stringMatching(/\.webp$/),
          expect.objectContaining({ type: "image/webp" }),
          { contentType: "image/webp", upsert: true },
        );
      });
      expect(mockUpdateMember).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Alan Turing",
          pictureUrl: "https://example.com/photo.webp",
        }),
      );
      expect(closeBitmap).toHaveBeenCalled();
    });

    it("rejects non-image files and unconvertible images without uploading", async () => {
      URL.createObjectURL = vi.fn(() => "blob:selected-photo");
      URL.revokeObjectURL = vi.fn();

      render(<MemberDirectory initialMembers={sampleMembers} />);

      fireEvent.click(screen.getByRole("button", { name: "Edit Grace Hopper" }));
      fireEvent.change(screen.getByLabelText("Name *"), {
        target: { value: "Margaret Hamilton" },
      });

      const fileInput = screen.getByLabelText("Photo") as HTMLInputElement;
      const nonImage = new File(["hello"], "notes.txt", { type: "text/plain" });
      fireEvent.change(fileInput, { target: { files: [nonImage] } });

      expect(mockShowToast).toHaveBeenCalledWith(
        "Please select an image file",
        "error",
      );
      expect(mockStorageUpload).not.toHaveBeenCalled();

      globalThis.createImageBitmap = vi
        .fn()
        .mockRejectedValue(new Error("Corrupt image"));
      const corruptImage = new File(["bad"], "broken.jpg", {
        type: "image/jpeg",
      });
      fireEvent.change(fileInput, { target: { files: [corruptImage] } });

      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          "Unable to read the selected image file.",
          "error",
        );
      });
      expect(mockStorageUpload).not.toHaveBeenCalled();
      expect(screen.getByLabelText("Photo")).toBeInTheDocument();
    });

    it("falls back to compressed JPEG when WebP encoding is unsupported", async () => {
      globalThis.createImageBitmap = vi.fn().mockResolvedValue({
        width: 1200,
        height: 900,
        close: vi.fn(),
      } as unknown as ImageBitmap);
      URL.createObjectURL = vi.fn(() => "blob:selected-photo");
      URL.revokeObjectURL = vi.fn();

      const drawImage = vi.fn();
      vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
        drawImage,
      } as unknown as CanvasRenderingContext2D);
      vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
        (callback, mimeType) => {
          if (mimeType === "image/webp") {
            callback(new Blob(["png-fallback"], { type: "image/png" }));
            return;
          }
          callback(new Blob(["jpeg-bytes"], { type: "image/jpeg" }));
        },
      );

      mockUpdateMember.mockResolvedValue({
        ...sampleMembers[1],
        name: "Annie Easley",
        pictureUrl: "https://example.com/photo.jpg",
      });

      render(<MemberDirectory initialMembers={sampleMembers} />);

      fireEvent.click(screen.getByRole("button", { name: "Edit Grace Hopper" }));
      fireEvent.change(screen.getByLabelText("Name *"), {
        target: { value: "Annie Easley" },
      });

      const fileInput = screen.getByLabelText("Photo") as HTMLInputElement;
      const pngFile = new File(["png-data"], "annie.png", { type: "image/png" });
      fireEvent.change(fileInput, { target: { files: [pngFile] } });

      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

      await waitFor(() => {
        expect(mockStorageUpload).toHaveBeenCalledWith(
          expect.stringMatching(/\.jpg$/),
          expect.objectContaining({ type: "image/jpeg" }),
          { contentType: "image/jpeg", upsert: true },
        );
      });
    });
  });
});
