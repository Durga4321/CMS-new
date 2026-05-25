const NAME_PATTERN = /^[A-Za-z][A-Za-z\s.'-]*$/;
const EMAIL_PATTERN =
  /^[A-Za-z0-9](?:[A-Za-z0-9_%+-]|(?:\.(?=[A-Za-z0-9_%+-])))*@[A-Za-z0-9](?:[A-Za-z0-9-]{1,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{1,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;
const BLOCKED_TLDS = new Set(["cmm", "comm", "con", "coom", "cm", "om"]);
const BLOCKED_EMAIL_DOMAINS = new Set([
  "hmail.com",
  "ghail.com",
  "gmhil.com",
  "gmakil.com",
  "gmal.com",
  "gamil.com",
]);
export const EMAIL_INPUT_PATTERN =
  "[A-Za-z0-9._%+\\x2d]+@[A-Za-z0-9\\x2d]+(?:\\.[A-Za-z0-9\\x2d]+)+";
const PHONE_LENGTH = 10;
export const MAX_NAME_LENGTH = 80;

export function digitsOnly(value, maxLength = PHONE_LENGTH) {
  return String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, maxLength);
}

export function lettersOnly(value) {
  return String(value ?? "").replace(/[^A-Za-z\s.'-]/g, "");
}

export function alphaNumericOnly(value) {
  return String(value ?? "").replace(/[^A-Za-z0-9_.-]/g, "");
}

export function cleanEmail(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s/g, "");
}

export function required(value, label) {
  return String(value ?? "").trim() ? "" : `${label} is required`;
}

export function validateName(value, label = "Name") {
  const text = String(value ?? "").trim();
  if (!text) return `${label} is required`;
  if (text.length > MAX_NAME_LENGTH) return `${label} must be ${MAX_NAME_LENGTH} characters or fewer`;
  if (!NAME_PATTERN.test(text)) return `${label} can contain letters and spaces only`;
  return "";
}

export function validateEmail(value, label = "Email") {
  const email = cleanEmail(value);
  const [localPart, domain = ""] = email.split("@");
  const domainLabels = domain.split(".");
  const primaryDomain = domainLabels.length >= 2 ? domainLabels.at(-2) : "";
  const topLevelDomain = domainLabels.at(-1)?.toLowerCase() ?? "";
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
    !/[A-Za-z]/.test(primaryDomain) ||
    BLOCKED_TLDS.has(topLevelDomain) ||
    BLOCKED_EMAIL_DOMAINS.has(domain.toLowerCase())
  ) {
    return "Please enter a valid email address";
  }
  return "";
}

export function validatePassword(value, label = "Password") {
  const password = String(value ?? "");
  if (!password) return `${label} is required`;
  if (/\s/.test(password)) return `${label} cannot contain spaces`;
  if (password.length < 8) return `${label} must be at least 8 characters`;
  if (!/[A-Z]/.test(password)) return `${label} must include at least one uppercase letter`;
  if (!/[a-z]/.test(password)) return `${label} must include at least one lowercase letter`;
  if (!/[0-9]/.test(password)) return `${label} must include at least one number`;
  if (!/[^A-Za-z0-9]/.test(password)) return `${label} must include at least one special character`;
  return "";
}

export function validatePhone(value, label = "Phone number") {
  const phone = digitsOnly(value);
  if (!phone) return `${label} is required`;
  if (phone.length !== PHONE_LENGTH) return `${label} must be exactly ${PHONE_LENGTH} digits`;
  if (/^0+$/.test(phone)) return `Please enter a valid ${label.toLowerCase()}`;
  return "";
}

export function validateNumber(value, label) {
  const number = String(value ?? "").trim();
  if (!number) return `${label} is required`;
  if (!/^\d+$/.test(number)) return `${label} must contain numbers only`;
  return "";
}

export function validateAddress(value, label = "Address") {
  const address = String(value ?? "").trim();
  if (!address) return `${label} is required`;
  if (address.length < 5) return `${label} must be at least 5 characters`;
  if (!/[A-Za-z]/.test(address)) return `${label} must include a meaningful location`;
  if (!/[A-Za-z]{3,}/.test(address)) return `${label} must include a valid place or street name`;
  return "";
}

export function validateLocation(value, label = "Location") {
  const location = String(value ?? "").trim();
  if (!location) return `${label} is required`;
  if (location.length > 120) return `${label} must be 120 characters or fewer`;
  if (!/^[A-Za-z][A-Za-z\s,.'-]*$/.test(location)) {
    return `${label} can contain letters, spaces, commas, periods, apostrophes and hyphens only`;
  }

  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 2) return `${label} must include city and state/country separated by comma`;
  if (parts.some((part) => part.length < 3 || !/[A-Za-z]{3,}/.test(part))) {
    return `${label} must include valid city, state or country names`;
  }
  return "";
}

export function validateUniquePhone(phone, records, label = "Phone number", currentId = "") {
  const normalizedPhone = digitsOnly(phone);
  if (!normalizedPhone) return "";
  const duplicate = records.some((record) => {
    if (currentId && String(record.id) === String(currentId)) return false;
    const recordPhone = digitsOnly(
      record.phone ?? record.mobile ?? record.contact ?? record.contactNumber ?? record.mobileNumber,
    );
    return recordPhone && recordPhone === normalizedPhone;
  });
  return duplicate ? `${label} already exists` : "";
}

export function validatePastOrTodayDate(value, label = "Date") {
  if (!value) return `${label} is required`;
  const selected = new Date(`${value}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (Number.isNaN(selected.getTime())) return `${label} is invalid`;
  if (selected > today) return `${label} cannot be in the future`;
  return "";
}

export function validateTodayOrFutureDate(value, label = "Date") {
  if (!value) return `${label} is required`;
  const selected = new Date(`${value}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (Number.isNaN(selected.getTime())) return `${label} is invalid`;
  if (selected < today) return `${label} cannot be in the past`;
  return "";
}

export function firstError(errors) {
  return errors.find(Boolean) ?? "";
}
