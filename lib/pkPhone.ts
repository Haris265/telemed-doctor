/** Pakistani local mobile: 11 digits, display as 03XX-XXXXXXX */

export const pkMobileHint = "11 digits · 03XX-XXXXXXX";

export function digitsOnly(value: string): string {
  return (value || "").replace(/\D/g, "");
}

/** Cap at 11 digits; format as 03XX or 03XX-XXXXXXX */
export function formatPkMobile(value: string): string {
  const digits = digitsOnly(value).slice(0, 11);
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
}

/** Empty is valid (optional field); otherwise exactly 11 digits */
export function isValidPkMobile(value: string): boolean {
  const digits = digitsOnly(value);
  return digits.length === 0 || digits.length === 11;
}
