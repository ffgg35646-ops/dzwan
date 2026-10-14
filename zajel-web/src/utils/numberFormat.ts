export const UI_LOCALE = "ar-IQ-u-nu-latn";

export function formatNumber(
  value: number | string | null | undefined,
  options?: Intl.NumberFormatOptions
) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat(UI_LOCALE, options).format(
    Number.isFinite(n) ? n : 0
  );
}
