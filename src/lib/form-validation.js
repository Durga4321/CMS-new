const NAME_PATTERN = /^[A-Za-z][A-Za-z\s.'-]*$/;
const EMAIL_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9_%+-]|(?:\.(?=[A-Za-z0-9_%+-])))*@[A-Za-z0-9](?:[A-Za-z0-9-]{1,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{1,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;
export const EMAIL_INPUT_PATTERN =
  "[A-Za-z0-9](?:[A-Za-z0-9_%+-]|(?:\\.(?=[A-Za-z0-9_%+-])))*@[A-Za-z0-9](?:[A-Za-z0-9-]{1,61}[A-Za-z0-9])?(?:\\.[A-Za-z0-9](?:[A-Za-z0-9-]{1,61}[A-Za-z0-9])?)*\\.[A-Za-z]{2,}";
const PHONE_LENGTH = 10;

export function digitsOnly(value, maxLength = PHONE_LENGTH) {
  return String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, maxLength);
}

export function lettersOnly(value) {
  return String(value ?? "").replace(/[^A-Za-z\s.'-]/g, "");
}

export function cleanEmail(value) {
  return String(value ?? "").trim().replace(/\s/g, "");
}

export function required(value, label) {
  return String(value ?? "").trim() ? "" : `${label} is required`;
}

export function validateName(value, label = "Name") {
  const text = String(value ?? "").trim();
  if (!text) return `${label} is required`;
  if (!NAME_PATTERN.test(text)) return `${label} can contain letters and spaces only`;
  return "";
}

export function validateEmail(value, label = "Email") {
  const email = cleanEmail(value);
  const [localPart, domain = ""] = email.split("@");
  const domainLabels = domain.split(".");
  const primaryDomain = domainLabels.length >= 2 ? domainLabels.at(-2) : "";
  if (!email) return `${label} is required`;
  if (
    !EMAIL_PATTERN.test(email) ||
    localPart.length < 2 ||
    localPart.length > 64 ||
    localPart.startsWith(".") ||
    localPart.endsWith(".") ||
    email.includes("..") ||
    email.split("@").length !== 2 ||
    email.endsWith(".") ||
    primaryDomain.length < 3 ||
    !/[A-Za-z]/.test(primaryDomain)
  ) {
    return `Enter a valid professional ${label.toLowerCase()} address`;
  }
  return "";
}

export function validatePhone(value, label = "Phone number") {
  const phone = digitsOnly(value);
  if (!phone) return `${label} is required`;
  if (phone.length !== PHONE_LENGTH) return `${label} must be exactly ${PHONE_LENGTH} digits`;
  return "";
}

export function validateNumber(value, label) {
  const number = String(value ?? "").trim();
  if (!number) return `${label} is required`;
  if (!/^\d+$/.test(number)) return `${label} must contain numbers only`;
  return "";
}

export function firstError(errors) {
  return errors.find(Boolean) ?? "";
}
