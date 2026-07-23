// Small string utilities. Deliberately minimal so Finn-loop issues
// have a real (but tiny) surface to implement against.

/**
 * Capitalize the first letter of a string, leaving the rest untouched.
 * @param {string} input
 * @returns {string}
 */
export function capitalize(input) {
  if (typeof input !== "string" || input.length === 0) return "";
  return input[0].toUpperCase() + input.slice(1);
}

/**
 * Convert a string to a URL-friendly slug: lowercase, spaces to dashes,
 * non-alphanumeric stripped, collapsed and trimmed dashes.
 * @param {string} input
 * @returns {string}
 */
export function slugify(input) {
  if (typeof input !== "string") return "";
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
