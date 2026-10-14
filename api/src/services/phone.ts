// Phone numbers are stored in E.164 (+2376XXXXXXXX).

/** Normalizes user input; Cameroonian numbers may be typed without +237. Null if invalid. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[\s().-]/g, "");
  if (/^6\d{8}$/.test(digits)) return `+237${digits}`;
  if (/^2376\d{8}$/.test(digits)) return `+${digits}`;
  if (/^00\d{8,15}$/.test(digits)) return `+${digits.slice(2)}`;
  if (/^\+\d{8,15}$/.test(digits)) return digits;
  return null;
}

/** True for Cameroonian mobile numbers, the only ones mobile money can charge. */
export function isCameroonMobile(e164: string) {
  return /^\+2376\d{8}$/.test(e164);
}

/** National 9-digit form (6XXXXXXXX), as used by ElgioPay's examples and sandbox numbers. */
export function toCameroonNational(e164: string) {
  return e164.replace(/^\+237/, "");
}
