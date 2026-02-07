/**
 * Normalizes a string by:
 * 1. Converting full-width alphanumeric characters to half-width.
 * 2. Removing ALL spaces (half-width and full-width).
 * 
 * @param input The string to normalize.
 * @returns The normalized string.
 */
export function normalizeString(input: string): string {
    if (!input) return '';
    return input
        .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)) // Full-width to Half-width
        .replace(/[\s\u3000]+/g, ''); // Remove all spaces
}
