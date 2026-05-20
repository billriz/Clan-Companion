export function getUserInitials(value: string) {
  const cleanValue = value.trim();

  if (!cleanValue) {
    return "PP";
  }

  const nameParts = cleanValue
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .filter(Boolean);

  const initials = nameParts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "PP";
}
