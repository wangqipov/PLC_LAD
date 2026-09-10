/**
 * Approximate wrapped-text height in grid units.
 * Production lives in lad/virtualScrolling/utility.
 */
export function getStrHeight(text?: string, blockTextNum?: number, _absoluteWidth?: number): number {
    if (!text) {
        return 0;
    }
    const charsPerLine = blockTextNum && blockTextNum > 0 ? blockTextNum : 12;
    const lines = Math.ceil(String(text).length / charsPerLine);
    return Math.max(0.4, lines * 0.4);
}
