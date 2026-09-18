import { digitsOnly, isValidPkMobile } from "@/lib/pkPhone";

export type ClinicFormFields = {
  name: string;
  address: string;
  city?: string;
  area?: string;
  phone?: string;
};

export type ClinicFieldErrors = {
  name?: string;
  address?: string;
  city?: string;
  area?: string;
  phone?: string;
};

export function validateClinicForm(form: ClinicFormFields): ClinicFieldErrors {
  const errors: ClinicFieldErrors = {};
  if (!form.name.trim()) errors.name = "Clinic name is required.";
  if (!form.address.trim()) errors.address = "Address is required.";
  if (!form.city?.trim()) errors.city = "City is required.";
  if (!form.area?.trim()) errors.area = "Area is required.";

  const phone = form.phone || "";
  if (digitsOnly(phone).length > 0 && !isValidPkMobile(phone)) {
    errors.phone = "Enter a valid 11-digit Pakistani mobile (03XX-XXXXXXX).";
  }
  return errors;
}

export function hasClinicFieldErrors(errors: ClinicFieldErrors): boolean {
  return Boolean(
    errors.name ||
      errors.address ||
      errors.city ||
      errors.area ||
      errors.phone,
  );
}
