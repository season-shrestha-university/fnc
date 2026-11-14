import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockCreateMember, mockUpdateMember, mockDeleteMember, mockShowToast } =
  vi.hoisted(() => ({
    mockCreateMember: vi.fn(),
    mockUpdateMember: vi.fn(),
    mockDeleteMember: vi.fn(),
    mockShowToast: vi.fn(),
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
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: () => ({
          data: { publicUrl: "https://example.com/photo.jpg" },
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
      vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
        (callback) => {
          callback(new Blob(["jpeg-bytes"], { type: "image/jpeg" }));
        },
      );

      return { getUserMedia, stopTrack, drawImage };
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

    it("captures a camera photo and submits it when creating a member", async () => {
      const { getUserMedia, stopTrack, drawImage } = setupCameraEnvironment();
      mockCreateMember.mockResolvedValue({
        id: "uuid-3",
        memberId: "FNC-003",
        name: "Katherine Johnson",
        email: "",
        phone: "",
        address: "",
        dob: "",
        pictureUrl: "https://example.com/photo.jpg",
      });

      render(<MemberDirectory initialMembers={sampleMembers} />);

      fireEvent.click(screen.getByRole("button", { name: "Add member" }));
      fireEvent.change(screen.getByLabelText("Name *"), {
        target: { value: "Katherine Johnson" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Take photo" }));

      await waitFor(() => {
        expect(getUserMedia).toHaveBeenCalledWith({
          audio: false,
          video: {
            facingMode: { ideal: "user" },
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
        expect(drawImage).toHaveBeenCalled();
        expect(stopTrack).toHaveBeenCalled();
        expect(screen.getByAltText("Member photo preview")).toHaveAttribute(
          "src",
          "blob:captured-photo",
        );
      });

      fireEvent.click(
        screen.getByRole("button", { name: "Create & generate QR" }),
      );

      await waitFor(() => {
        expect(mockCreateMember).toHaveBeenCalledWith(
          expect.objectContaining({
            name: "Katherine Johnson",
            pictureUrl: "https://example.com/photo.jpg",
          }),
        );
      });
    });

    it("stops the camera stream when cancelling camera or closing the modal", async () => {
      const { stopTrack } = setupCameraEnvironment();

      render(<MemberDirectory initialMembers={sampleMembers} />);
      fireEvent.click(screen.getByRole("button", { name: "Add member" }));
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
      fireEvent.click(screen.getByRole("button", { name: "Add member" }));
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
      fireEvent.click(screen.getByRole("button", { name: "Add member" }));
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
});
