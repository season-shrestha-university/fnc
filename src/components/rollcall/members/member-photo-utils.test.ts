import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MAX_PHOTO_DIMENSION,
  WEBP_QUALITY,
  calculateScaledDimensions,
  canvasToCompressedPhotoFile,
  compressImageFileToPhoto,
} from "./member-photo-utils";

describe("member-photo-utils", () => {
  const originalCreateImageBitmap = globalThis.createImageBitmap;
  const originalImage = globalThis.Image;
  const originalCreateObjectUrl = URL.createObjectURL;
  const originalRevokeObjectUrl = URL.revokeObjectURL;

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.createImageBitmap = originalCreateImageBitmap;
    globalThis.Image = originalImage;
    URL.createObjectURL = originalCreateObjectUrl;
    URL.revokeObjectURL = originalRevokeObjectUrl;
  });

  it("uses WebP quality between 0.75 and 0.80 and 600px max dimension", () => {
    expect(WEBP_QUALITY).toBeGreaterThanOrEqual(0.75);
    expect(WEBP_QUALITY).toBeLessThanOrEqual(0.8);
    expect(MAX_PHOTO_DIMENSION).toBe(600);
  });

  it("scales large dimensions to fit maxDimension while preserving aspect ratio and not upscaling", () => {
    expect(calculateScaledDimensions(4032, 3024)).toEqual({
      width: 600,
      height: 450,
    });
    expect(calculateScaledDimensions(1500, 3000)).toEqual({
      width: 300,
      height: 600,
    });
    expect(calculateScaledDimensions(320, 240)).toEqual({
      width: 320,
      height: 240,
    });
  });

  it("encodes a canvas into a .webp File when supported", async () => {
    const canvas = document.createElement("canvas");
    const toBlobSpy = vi
      .spyOn(canvas, "toBlob")
      .mockImplementation((callback) => {
        callback(new Blob(["webp-bytes"], { type: "image/webp" }));
      });

    const file = await canvasToCompressedPhotoFile(canvas, "portrait");

    expect(toBlobSpy).toHaveBeenCalledWith(
      expect.any(Function),
      "image/webp",
      WEBP_QUALITY,
    );
    expect(file.name).toBe("portrait.webp");
    expect(file.type).toBe("image/webp");
  });

  it("falls back to compressed JPEG when WebP encoding is unsupported", async () => {
    const canvas = document.createElement("canvas");
    const toBlobSpy = vi
      .spyOn(canvas, "toBlob")
      .mockImplementation((callback, mimeType) => {
        if (mimeType === "image/webp") {
          callback(new Blob(["png-fallback"], { type: "image/png" }));
          return;
        }
        callback(new Blob(["jpeg-bytes"], { type: "image/jpeg" }));
      });

    const file = await canvasToCompressedPhotoFile(canvas, "portrait");

    expect(toBlobSpy).toHaveBeenNthCalledWith(
      1,
      expect.any(Function),
      "image/webp",
      WEBP_QUALITY,
    );
    expect(toBlobSpy).toHaveBeenNthCalledWith(
      2,
      expect.any(Function),
      "image/jpeg",
      WEBP_QUALITY,
    );
    expect(file.name).toBe("portrait.jpg");
    expect(file.type).toBe("image/jpeg");
  });

  it("throws when both WebP and JPEG encoding fail", async () => {
    const canvas = document.createElement("canvas");
    vi.spyOn(canvas, "toBlob").mockImplementation((callback) => {
      callback(null);
    });

    await expect(canvasToCompressedPhotoFile(canvas, "portrait")).rejects.toThrow(
      "Unable to encode photo. Please try again.",
    );
  });

  it("rejects non-image files", async () => {
    const textFile = new File(["hello"], "notes.txt", { type: "text/plain" });

    await expect(compressImageFileToPhoto(textFile)).rejects.toThrow(
      "Please select an image file",
    );
  });

  it("downscales a large image file to <= 600px, compresses to WebP, and cleans up resources", async () => {
    const closeBitmap = vi.fn();
    const mockBitmap = {
      width: 4032,
      height: 3024,
      close: closeBitmap,
    } as unknown as ImageBitmap;
    globalThis.createImageBitmap = vi.fn().mockResolvedValue(mockBitmap);

    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
      (callback) => {
        callback(new Blob(["webp-bytes"], { type: "image/webp" }));
      },
    );

    const input = new File(["raw-jpeg"], "avatar.jpg", { type: "image/jpeg" });
    const output = await compressImageFileToPhoto(input);

    expect(output.name).toBe("avatar.webp");
    expect(output.type).toBe("image/webp");
    expect(drawImage).toHaveBeenCalledWith(mockBitmap, 0, 0, 600, 450);
    expect(closeBitmap).toHaveBeenCalledTimes(1);
  });

  it("falls back to HTMLImageElement when createImageBitmap is unavailable and revokes object URL", async () => {
    // @ts-expect-error -- testing fallback when createImageBitmap is absent
    globalThis.createImageBitmap = undefined;
    URL.createObjectURL = vi.fn(() => "blob:temp-image");
    URL.revokeObjectURL = vi.fn();

    class MockImage {
      naturalWidth = 320;
      naturalHeight = 240;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    globalThis.Image = MockImage as unknown as typeof Image;

    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
      (callback) => {
        callback(new Blob(["webp-bytes"], { type: "image/webp" }));
      },
    );

    const input = new File(["raw-png"], "avatar.png", { type: "image/png" });
    const output = await compressImageFileToPhoto(input);

    expect(output.name).toBe("avatar.webp");
    expect(output.type).toBe("image/webp");
    expect(drawImage).toHaveBeenCalledWith(
      expect.any(MockImage),
      0,
      0,
      320,
      240,
    );
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:temp-image");
  });

  it("throws a clear error when an image file cannot be decoded", async () => {
    globalThis.createImageBitmap = vi
      .fn()
      .mockRejectedValue(new Error("Invalid image"));

    const corrupt = new File(["bad-bytes"], "broken.jpg", {
      type: "image/jpeg",
    });

    await expect(compressImageFileToPhoto(corrupt)).rejects.toThrow(
      "Unable to read the selected image file.",
    );
  });
});
