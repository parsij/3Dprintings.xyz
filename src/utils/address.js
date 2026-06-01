const MIDDLE_DOT_PATTERN = /[\u00B7·]/g;

export function sanitizeStreetLine(value) {
    return String(value || '')
        .replace(MIDDLE_DOT_PATTERN, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function addressesMatchIgnoringCase(left, right) {
    const a = sanitizeStreetLine(left);
    const b = sanitizeStreetLine(right);
    if (!a || !b) return a === b;
    return a.localeCompare(b, undefined, { sensitivity: 'base' }) === 0;
}

export function preserveDisplayCasing(preferred, normalized) {
    const preferredText = sanitizeStreetLine(preferred);
    const normalizedText = sanitizeStreetLine(normalized);
    if (!normalizedText) return preferredText;
    if (!preferredText) return normalizedText;
    if (addressesMatchIgnoringCase(preferredText, normalizedText)) {
        return preferredText;
    }
    return normalizedText;
}

export function formatAddressSummary(address) {
    const parts = [
        sanitizeStreetLine(address?.line1),
        sanitizeStreetLine(address?.line2),
        [
            sanitizeStreetLine(address?.city),
            String(address?.state || '').trim().toUpperCase(),
            String(address?.zip || '').trim(),
        ].filter(Boolean).join(', '),
    ].filter(Boolean);

    return parts.join(', ');
}
