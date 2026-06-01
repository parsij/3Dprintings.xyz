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
 * Prefers explicit cent fields; falls back to dollar fields.
 */
export function readCheckoutUsdAmount({ dollars, cents } = {}) {
    if (cents !== undefined && cents !== null && cents !== '') {
        const centsValue = Number(cents);
        if (Number.isFinite(centsValue)) {
            return centsToUsd(centsValue);
        }
    }

    const dollarsValue = Number(dollars);
    return Number.isFinite(dollarsValue) ? dollarsValue : 0;
}

/**
 * Format a USD dollar amount for display (e.g. 12.5 -> "12.50").
 */
export function formatUsd(dollars) {
    const value = Number(dollars);
    if (!Number.isFinite(value)) return '0.00';
    return value.toFixed(2);
}
