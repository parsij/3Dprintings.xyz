/**
 * Convert integer cents from Stripe/EasyPost-style APIs to USD dollars.
 */
export function centsToUsd(cents) {
    const value = Number(cents);
    if (!Number.isFinite(value)) return 0;
    return value / 100;
}

/**
 * Read a USD dollar amount from checkout API fields.
 * The API sends `shipping`/`subtotal`/etc. as dollars and matching *Cents fields.
 */
export function readCheckoutUsdAmount({ dollars, cents } = {}) {
    const dollarsValue = Number(dollars);
    const centsValue = Number(cents);
    const hasDollars = dollars !== undefined && dollars !== null && dollars !== '';
    const hasCents = cents !== undefined && cents !== null && cents !== '';

    if (hasDollars && Number.isFinite(dollarsValue)) {
        // Legacy payloads duplicated cents into the dollar field (e.g. shipping: 2000, shippingCents: 2000).
        if (hasCents && Number.isFinite(centsValue) && centsValue > 0 && dollarsValue === centsValue) {
            return centsToUsd(centsValue);
        }
        return dollarsValue;
    }

    if (hasCents && Number.isFinite(centsValue)) {
        return centsToUsd(centsValue);
    }

    return 0;
}

/**
 * Format a USD dollar amount for display (e.g. 12.5 -> "12.50").
 */
export function formatUsd(dollars) {
    const value = Number(dollars);
    if (!Number.isFinite(value)) return '0.00';
    return value.toFixed(2);
}
