import config from '@/app/lad/config';
import { SingletonOpInfo } from '@/app/lad/stubs/shareData';

/** Grid height of one wrapped name line; getStrHeight is lines * this. */
export const STR_LINE_GRID = 0.4;

/** Same basicLength source as transformData.setPinWidth */
function resolveBasicLength(): number {
    if (SingletonOpInfo && SingletonOpInfo.instance && SingletonOpInfo.instance.getBasicLength()) {
        return SingletonOpInfo.instance.getBasicLength();
    }
    return config.basicLength;
}

/**
 * Characters per line from setFB / getStrHeight:
 * min(blockTextNum, absoluteWidth / (fontWidth * basicLength)).
 * Column width always wins so left/right pin text cannot cross the mid gap.
 */
export function charsPerLine(blockTextNum?: number, absoluteWidth?: number): number {
    let n = 12;
    if (blockTextNum && blockTextNum > 0) {
        n = blockTextNum;
    }
    if (absoluteWidth && absoluteWidth > 0) {
        const charPx = config.fontWidth * resolveBasicLength();
        n = Math.min(n, Math.max(1, Math.floor(absoluteWidth / charPx)));
    }
    return Math.max(1, n);
}

/**
 * Same wrap as getStrHeight.
 * Production lives in lad/virtualScrolling/utility.
 */
export function wrapStr(text?: string, blockTextNum?: number, absoluteWidth?: number): string[] {
    if (!text) {
        return [];
    }
    const n = charsPerLine(blockTextNum, absoluteWidth);
    const s = String(text);
    const lines: string[] = [];
    for (let i = 0; i < s.length; i += n) {
        lines.push(s.slice(i, i + n));
    }
    return lines;
}

/**
 * Wrapped-text height in grid units.
 * Production lives in lad/virtualScrolling/utility.
 */
export function getStrHeight(text?: string, blockTextNum?: number, absoluteWidth?: number): number {
    const lines = wrapStr(text, blockTextNum, absoluteWidth);
    if (!lines.length) {
        return 0;
    }
    return Math.max(STR_LINE_GRID, lines.length * STR_LINE_GRID);
}

/** Pixel width of wrapped text: longest line * fontWidth * basicLength (setFB / setPinWidth). */
export function getStrWidth(text?: string, blockTextNum?: number, absoluteWidth?: number): number {
    const lines = wrapStr(text, blockTextNum, absoluteWidth);
    if (!lines.length) {
        return 0;
    }
    let maxChars = 1;
    for (const line of lines) {
        if (line.length > maxChars) {
            maxChars = line.length;
        }
    }
    return maxChars * config.fontWidth * resolveBasicLength();
}

/**
 * One element's horizontal slot in calculateLocation / initWidth:
 * next.x = last.x + last.width + margin_horizontal
 */
export function elementSlotGrid(width: number, margin_horizontal: number): number {
    return (width || 1) + margin_horizontal;
}

/**
 * FB pin-name column from setFB:
 * width = length * fontWidth + 2 * pinLength, each side (width - 2 * pinLength) / 2.
 */
export function pinNameAbsWidth(fbWidthGrid: number, basicLength: number): number {
    const inner = Math.max(config.fontWidth, (fbWidthGrid || 0) - 2 * config.pinLength);
    return (inner / 2) * basicLength;
}
