import type { DirectoryMember } from "@/app/actions";

export type WizardStep = "photo" | "details" | "contact" | "done";
export type EditSection = "photo" | "details" | "contact";
export type PhotoSubState = "camera" | "captured" | "portrait";

export type WizardFormValues = {
  name: string;
  memberId: string;
  dob: string;
  email: string;
  phone: string;
  address: string;
};

export type WizardErrors = {
  name?: string;
  memberId?: string;
  email?: string;
  form?: string;
};

export const EMPTY_WIZARD_VALUES: WizardFormValues = {
  name: "",
  memberId: "",
  dob: "",
  email: "",
  phone: "",
  address: "",
};

export const STEP_META: Record<
  Exclude<WizardStep, "done">,
  { number: 1 | 2 | 3; label: string }
> = {
  photo: { number: 1, label: "Photo" },
  details: { number: 2, label: "Details" },
  contact: { number: 3, label: "Contact" },
};

export function hasAnyWizardValue(
  values: WizardFormValues,
  photoFile: File | null,
): boolean {
  return Boolean(
    photoFile ||
      values.name.trim() ||
      values.memberId.trim() ||
      values.dob.trim() ||
      values.email.trim() ||
      values.phone.trim() ||
      values.address.trim(),
  );
}

export const EDIT_SECTIONS: EditSection[] = ["photo", "details", "contact"];

export type EditSnapshot = {
  values: WizardFormValues;
  pictureUrl: string;
};

export type EditDirtyMap = Record<EditSection, boolean>;

export function getEditDirtyMap(
  snapshot: EditSnapshot,
  values: WizardFormValues,
  pictureUrl: string,
  photoFile: File | null,
): EditDirtyMap {
  return {
    photo: photoFile !== null || pictureUrl !== snapshot.pictureUrl,
    details:
      values.name.trim() !== snapshot.values.name.trim() ||
      values.dob.trim() !== snapshot.values.dob.trim(),
    contact:
      values.email !== snapshot.values.email ||
      values.phone !== snapshot.values.phone ||
      values.address !== snapshot.values.address,
  };
}

export function isEditDirty(dirty: EditDirtyMap): boolean {
  return dirty.photo || dirty.details || dirty.contact;
}

export function validateDetailsFields(
  values: WizardFormValues,
  mode: "create" | "edit" = "create",
): WizardErrors {
  const errors: WizardErrors = {};
  if (!values.name.trim()) {
    errors.name =
      mode === "edit"
        ? "Enter the member’s name"
        : "Enter the member's name to continue";
  }
  return errors;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContactFields(values: WizardFormValues): WizardErrors {
  const errors: WizardErrors = {};
  const trimmedEmail = values.email.trim();
  if (trimmedEmail && !EMAIL_PATTERN.test(trimmedEmail)) {
    errors.email = "Enter a valid email address";
  }
  return errors;
}

export function routeServerErrorToStep(
  errorMessage: string,
  mode: "create" | "edit" = "create",
): { step: WizardStep; errors: WizardErrors } {
  const lower = errorMessage.toLowerCase();
  if (mode === "create" && lower.includes("member id")) {
    return { step: "details", errors: { memberId: errorMessage } };
  }
  if (lower.includes("member name") || lower.includes("name is required")) {
    return {
      step: "details",
      errors: {
        name:
          mode === "edit"
            ? "Enter the member’s name"
            : "Enter the member's name to continue",
      },
    };
  }
  if (lower.includes("email")) {
    return { step: "contact", errors: { email: errorMessage } };
  }
  return { step: "contact", errors: { form: errorMessage } };
}

export type WizardDoneMember = DirectoryMember;
