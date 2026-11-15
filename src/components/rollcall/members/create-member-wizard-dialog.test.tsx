import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockCreateMember,
  mockShowToast,
  mockStorageUpload,
  mockQrToDataUrl,
} = vi.hoisted(() => ({
  mockCreateMember: vi.fn(),
  mockShowToast: vi.fn(),
  mockStorageUpload: vi.fn().mockResolvedValue({ error: null }),
  mockQrToDataUrl: vi.fn().mockResolvedValue("data:image/png;base64,QRDATA"),
}));

vi.mock("@/app/actions", () => ({
  createMember: mockCreateMember,
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => ({
    storage: {
      from: () => ({
        upload: mockStorageUpload,
        getPublicUrl: () => ({
          data: { publicUrl: "https://example.com/wizard-photo.webp" },
        }),
      }),
    },
  }),
}));

vi.mock("qrcode", () => ({
  default: {
    toDataURL: mockQrToDataUrl,
  },
}));

import { CreateMemberWizardDialog } from "./create-member-wizard-dialog";

describe("CreateMemberWizardDialog", () => {
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

  function setupCameraMock(videoInputCount = 2) {
    const stopTrack = vi.fn();
    const mockStream = {
      getTracks: () => [{ stop: stopTrack }],
    } as unknown as MediaStream;
    const getUserMedia = vi.fn().mockResolvedValue(mockStream);
    const enumerateDevices = vi.fn().mockResolvedValue(
      Array.from({ length: videoInputCount }, (_, index) => ({
        kind: "videoinput",
        deviceId: `cam-${index}`,
      })),
    );

    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia, enumerateDevices },
    });

    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    URL.createObjectURL = vi.fn(() => "blob:wizard-photo");
    URL.revokeObjectURL = vi.fn();

    const save = vi.fn();
    const translate = vi.fn();
    const scale = vi.fn();
    const drawImage = vi.fn();
    const restore = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      save,
      translate,
      scale,
      drawImage,
      restore,
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
      (callback) => {
        callback(new Blob(["webp"], { type: "image/webp" }));
      },
    );

    return {
      getUserMedia,
      enumerateDevices,
      stopTrack,
      save,
      translate,
      scale,
      drawImage,
      restore,
    };
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
  }

  function renderDialog(
    overrides?: Partial<Parameters<typeof CreateMemberWizardDialog>[0]>,
  ) {
    const onClose = vi.fn();
    const onCreated = vi.fn();
    const onRefresh = vi.fn();
    const props = {
      open: true,
      onClose,
      onCreated,
      onRefresh,
      onMessage: mockShowToast,
      ...overrides,
    };
    return {
      ...render(<CreateMemberWizardDialog {...props} />),
      props: { ...props, onClose, onCreated, onRefresh },
    };
  }

  it("auto-starts front camera, switches cameras, mirrors capture, and stops tracks", async () => {
    const {
      getUserMedia,
      stopTrack,
      translate,
      scale,
      drawImage,
    } = setupCameraMock(2);

    renderDialog();

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
      expect(
        screen.getByRole("button", { name: "Switch camera" }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Switch camera" }));

    await waitFor(() => {
      expect(stopTrack).toHaveBeenCalled();
      expect(getUserMedia).toHaveBeenLastCalledWith({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "Switch camera" }));
    await waitFor(() => {
      expect(getUserMedia).toHaveBeenLastCalledWith({
        audio: false,
        video: {
          facingMode: { ideal: "user" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Take photo" })).toBeEnabled();
    });
    markVideoReady();
    fireEvent.click(screen.getByRole("button", { name: "Take photo" }));

    await waitFor(() => {
      expect(translate).toHaveBeenCalledWith(600, 0);
      expect(scale).toHaveBeenCalledWith(-1, 1);
      expect(drawImage).toHaveBeenCalled();
      expect(screen.getByText("Photo added")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Retake" }));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:wizard-photo");
    await waitFor(() => {
      expect(screen.getByText("Line their face up with the oval")).toBeInTheDocument();
    });
  });

  it("hides switch-camera button when only one camera exists", async () => {
    setupCameraMock(1);
    renderDialog();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Take photo" })).toBeEnabled();
    });
    expect(
      screen.queryByRole("button", { name: "Switch camera" }),
    ).not.toBeInTheDocument();
  });

  it("shows fallback message on camera denial while keeping Upload and Skip working", async () => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi
          .fn()
          .mockRejectedValue(new DOMException("Denied", "NotAllowedError")),
      },
    });

    renderDialog();

    await waitFor(() => {
      expect(
        screen.getByText("Camera not available. Upload a photo instead."),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: "Upload from device" }),
    ).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Skip for now" }));
    expect(screen.getByText("Member details")).toBeInTheDocument();
  });

  it("validates Name on Details, clears error on typing, and preserves values across Back/Next", async () => {
    const { stopTrack } = setupCameraMock(1);
    renderDialog();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Take photo" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Skip for now" }));
    expect(stopTrack).toHaveBeenCalled();
    expect(screen.getByText("Step 2 of 3")).toBeInTheDocument();

    // Whitespace-only name stays on Details with inline error and focus
    const nameInput = screen.getByLabelText(/Name/);
    fireEvent.change(nameInput, { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(
      screen.getByText("Enter the member's name to continue"),
    ).toBeInTheDocument();
    expect(nameInput).toHaveAttribute("aria-invalid", "true");
    expect(nameInput).toHaveFocus();

    // Typing clears the error immediately
    fireEvent.change(nameInput, { target: { value: "Bahadur Gurung" } });
    expect(
      screen.queryByText("Enter the member's name to continue"),
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Member ID"), {
      target: { value: "MEMBER-001" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    // Step 3: Contact
    expect(screen.getByText("Step 3 of 3")).toBeInTheDocument();
    const emailInput = screen.getByLabelText("Email");
    fireEvent.change(emailInput, { target: { value: "bahadur@example.com" } });

    // Go Back to Details and forward again — email must be preserved
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("Member details")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByLabelText("Email")).toHaveValue("bahadur@example.com");

    // Summary chips jump to Photo and Details
    fireEvent.click(screen.getByRole("button", { name: "No photo" }));
    expect(screen.getByText("Add a photo")).toBeInTheDocument();
  });

  it("confirms discard when dirty on Close/Esc and closes immediately when empty", async () => {
    setupCameraMock(1);
    const { props } = renderDialog();

    // Empty form closes immediately
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(props.onClose).toHaveBeenCalledTimes(1);

    // Dirty form prompts confirmation
    props.onClose.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Skip for now" }));
    fireEvent.change(screen.getByLabelText(/Name/), {
      target: { value: "Maya Thapa" },
    });
    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.getByText("Discard new member?")).toBeInTheDocument();
    expect(props.onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("handles submission loading state, server field error routing, and Done actions", async () => {
    setupCameraMock(1);
    let resolveCreate!: (value: unknown) => void;
    mockCreateMember
      .mockRejectedValueOnce(new Error("Member ID MEMBER-001 is already in use"))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveCreate = resolve;
          }),
      );

    const { props } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Skip for now" }));
    fireEvent.change(screen.getByLabelText(/Name/), {
      target: { value: "Bahadur Gurung" },
    });
    fireEvent.change(screen.getByLabelText("Member ID"), {
      target: { value: "MEMBER-001" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    // Optional contact fields never disable submit
    const submitBtn = screen.getByRole("button", {
      name: "Create & generate QR",
    });
    expect(submitBtn).toBeEnabled();
    fireEvent.click(submitBtn);

    // Duplicate Member ID routes back to Details step
    await waitFor(() => {
      expect(screen.getByText("Member details")).toBeInTheDocument();
      expect(
        screen.getByText("Member ID MEMBER-001 is already in use"),
      ).toBeInTheDocument();
    });

    // Fix and submit again
    fireEvent.change(screen.getByLabelText("Member ID"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Create & generate QR" }),
    );

    // While submitting: buttons disabled, Creating... shown, close blocked
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Creating/ })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
    });
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(props.onClose).not.toHaveBeenCalled();

    // Resolve with server-assigned memberId
    resolveCreate({
      id: "uuid-99",
      memberId: "FNC-SERVER99",
      name: "Bahadur Gurung",
      email: "",
      phone: "",
      address: "",
      dob: "",
      pictureUrl: "",
    });

    await waitFor(() => {
      expect(screen.getByText("Bahadur Gurung is set up")).toBeInTheDocument();
      expect(mockQrToDataUrl).toHaveBeenCalledWith(
        "FNC-SERVER99",
        expect.any(Object),
      );
    });

    // Download QR uses server-returned memberId
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    fireEvent.click(screen.getByRole("button", { name: "Download QR" }));
    expect(anchorClick).toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith(
      "QR code downloaded for Bahadur Gurung",
      "success",
    );

    // Add another member resets to Photo step and refreshes list
    fireEvent.click(
      screen.getByRole("button", { name: "Add another member" }),
    );
    expect(props.onRefresh).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Add a photo")).toBeInTheDocument();
  });

  it("closes and refreshes list when clicking Done", async () => {
    setupCameraMock(1);
    mockCreateMember.mockResolvedValue({
      id: "uuid-100",
      memberId: "FNC-DONE1",
      name: "Sita Limbu",
      email: "",
      phone: "",
      address: "",
      dob: "",
      pictureUrl: "",
    });
    const { props } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Skip for now" }));
    fireEvent.change(screen.getByLabelText(/Name/), {
      target: { value: "Sita Limbu" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Create & generate QR" }),
    );

    await waitFor(() => {
      expect(screen.getByText("Sita Limbu is set up")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(props.onRefresh).toHaveBeenCalledTimes(1);
  });
});
