/**
 * Generate a standard RFC4122 v4 UUID
 * @returns Unique id string in the form xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
export function generateUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
        // Random integer 0–15
        const random = Math.random() * 16 | 0;
        // x uses the random value; y sets high bits to 8/9/A/B per v4
        const value = char === 'x' ? random : (random & 0x3 | 0x8);
        return value.toString(16);
    });
}

// High-performance crypto-safe version (crypto API; browser/Node)
/**
 * Crypto-safe UUID v4 with stronger randomness; for unique ids, order numbers, key ids
 * @returns RFC4122 v4 UUID
 */
export function generateSafeUuid(): string {
    // Fill a 16-byte random buffer
    const buffer = new Uint8Array(16);
    crypto.getRandomValues(buffer);

    // Set version and variant bits per v4
    buffer[6] = (buffer[6] & 0x0f) | 0x40; // Version 4: 0100xxxx
    buffer[8] = (buffer[8] & 0x3f) | 0x80; // Variant: 10xxxxxx

    // Hex-encode and join with hyphens
    const hexArr = Array.from(buffer).map(byte => byte.toString(16).padStart(2, '0'));
    return `${hexArr.slice(0,4).join('')}-${hexArr.slice(4,6).join('')}-${hexArr.slice(6,8).join('')}-${hexArr.slice(8,10).join('')}-${hexArr.slice(10).join('')}`;
}

// // Usage example
// const id1 = generateUuid();
// const id2 = generateSafeUuid();
// console.log('Plain UUID:', id1);
// console.log('Crypto-safe UUID:', id2);