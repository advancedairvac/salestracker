/**
 * Format a numeric amount consistently across dashboard, profile, and email UI.
 * Pass currencySymbol for the app's prefix-style amounts, or currencyCode for
 * Intl's locale-aware currency formatting.
 */
export function formatCurrency(
  value,
  {
    currencyCode = "USD",
    currencySymbol,
    maximumFractionDigits = 2,
    minimumFractionDigits,
    notation = "standard",
    invalidValue = 0,
    emptyValue = invalidValue,
  } = {},
) {
  if (value === null || value === undefined || value === "") {
    return emptyValue;
  }

  const amount = Number(value);
  if (!Number.isFinite(amount)) return invalidValue;

  const numberOptions = {
    maximumFractionDigits,
    notation,
  };

  if (minimumFractionDigits !== undefined) {
    numberOptions.minimumFractionDigits = minimumFractionDigits;
  }

  if (currencySymbol !== undefined) {
    return `${currencySymbol}${new Intl.NumberFormat("en-US", numberOptions).format(amount)}`;
  }

  return new Intl.NumberFormat("en-US", {
    ...numberOptions,
    style: "currency",
    currency: currencyCode,
  }).format(amount);
}
