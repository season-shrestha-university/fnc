import { compressImageFileToPhoto } from "@/components/rollcall/members/member-photo-utils";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export async function uploadMemberPhoto(
  file: File,
  options?: { preCompressed?: boolean },
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please select an image file");
  }

  const compressedFile = options?.preCompressed
    ? file
    : await compressImageFileToPhoto(file);

  if (compressedFile.size > MAX_PHOTO_BYTES) {
    throw new Error("Member photo must be 5 MB or smaller");
  }

  const extension = compressedFile.type === "image/webp" ? "webp" : "jpg";
  const contentType =
    compressedFile.type === "image/webp" ? "image/webp" : "image/jpeg";
  const path = `${crypto.randomUUID()}.${extension}`;
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.storage
    .from("member-photos")
    .upload(path, compressedFile, { contentType, upsert: true });

  if (error) {
    throw new Error(error.message || "Unable to upload member photo");
  }

  const { data } = supabase.storage.from("member-photos").getPublicUrl(path);
  return data.publicUrl;
}
