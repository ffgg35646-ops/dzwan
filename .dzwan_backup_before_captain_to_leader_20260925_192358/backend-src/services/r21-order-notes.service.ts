export function normalizeOrderNote(
  value: unknown
) {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const note = String(value).trim();

  return note || null;
}
