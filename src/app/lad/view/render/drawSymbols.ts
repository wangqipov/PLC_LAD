import type { FBParameter, TreeNode } from '@/app/lad/class/index';
import { elementSlotGrid, pinNameAbsWidth, STR_LINE_GRID, wrapStr } from '@/app/lad/stubs/utility';
import config from '@/app/lad/config';
import { blockTextNum, TiaTheme } from '@/app/lad/view/core/config';
import type { PinViewerRange } from '@/app/lad/view/core/viewHost';

const BOX_TYPES = new Set([
    'FB', 'FU', 'TON', 'TOF', 'TP', 'TONR', 'CTU', 'CTD', 'CTUD',
    'SR', 'RS', 'R_TRIG', 'F_TRIG',
]);

const CONTACT_TYPES = new Set(['NO', 'NC', 'P', 'N', 'NOT', 'NORMALLY_OPEN']);
const COIL_TYPES = new Set(['COIL', 'Coil', 'N‑COIL', 'N-COIL', 'SET', 'RST']);

export function isBoxInstruction(type?: string): boolean {
    return !!type && BOX_TYPES.has(type);
}

export function isContact(type?: string): boolean {
    return !!type && CONTACT_TYPES.has(type);
}

export function isCoil(type?: string): boolean {
    return !!type && COIL_TYPES.has(type);
}

function pinYPx(treeNode: TreeNode, basicLength: number): number {
    return (treeNode.pinY ?? treeNode.location.y + (treeNode.pinOffsetY ?? 0.4)) * basicLength;
}

/**
 * Contacts/coils match calculateLines: left pin at location.x - 0.5, right at location.x + width - 0.5.
 * Box bbox stays at location.x; incoming wires also stop at x-0.5, so pin stubs must meet there or a gap appears.
 */
export function wirePinX(treeNode: TreeNode, side: 'left' | 'right'): number {
    const type = treeNode.type as string | undefined;
    if (isBoxInstruction(type)) {
        return side === 'left'
            ? treeNode.location.x - 0.5
            : treeNode.location.x + treeNode.width;
    }
    const w = treeNode.width || 1;
    return side === 'left' ? treeNode.location.x - 0.5 : treeNode.location.x + w - 0.5;
}

/** Horizontal span used for drawing / hit-testing (grid units) */
export function elementDrawX(treeNode: TreeNode): { x: number; w: number } {
    const type = treeNode.type as string | undefined;
    if (isBoxInstruction(type)) {
        return { x: treeNode.location.x, w: treeNode.width };
    }
    return { x: wirePinX(treeNode, 'left'), w: treeNode.width || 1 };
}

/** Box pin Y from post-layout pinY, ignoring leftover absolute pinY on sample / TON nodes */
export function boxPinY(treeNode: TreeNode, pin: FBParameter): number {
    const base = treeNode.pinY ?? treeNode.location.y + (treeNode.pinOffsetY ?? 0);
    return base + (pin.pinOffsetFirstPin ?? 0);
}

function strokeSetup(ctx: CanvasRenderingContext2D, color: string, width = 1.5): void {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';
}

function nameLinePx(basicLength: number): number {
    return STR_LINE_GRID * basicLength;
}

function fillWrappedLines(
    ctx: CanvasRenderingContext2D,
    lines: string[],
    x: number,
    firstY: number,
    linePx: number,
    down: boolean
): void {
    for (let i = 0; i < lines.length; i++) {
        const y = down ? firstY + i * linePx : firstY - (lines.length - 1 - i) * linePx;
        ctx.fillText(lines[i], x, y);
    }
}

/** Hit / editor box for the name drawn above the symbol */
export function varLabelRect(
    treeNode: TreeNode,
    basicLength: number,
    fontSize: number,
    margin_horizontal = 2
): { x: number; y: number; w: number; h: number } {
    const box = elementDrawX(treeNode);
    const cx = (box.x + box.w / 2) * basicLength;
    const py = pinYPx(treeNode, basicLength);
    const symbolTop = isBoxInstruction(treeNode.type as string)
        ? treeNode.location.y * basicLength
        : py - basicLength * 0.32;
    const h = Math.max(fontSize + 6, (treeNode.varNameHeight || STR_LINE_GRID) * basicLength);
    const w = elementSlotGrid(treeNode.width || box.w, margin_horizontal) * basicLength;
    return { x: cx - w / 2, y: symbolTop - 3 - h, w, h };
}

/**
 * Pin names sit in the setFB inner columns (after pinLength, split at mid).
 * Not the element slot — that width is only for titles above the symbol.
 */
function pinNameColumn(
    treeNode: TreeNode,
    side: 'left' | 'right',
    basicLength: number
): { x: number; w: number } {
    const x = treeNode.location.x * basicLength;
    const boxW = treeNode.width * basicLength;
    const mid = x + boxW / 2;
    const w = pinNameAbsWidth(treeNode.width, basicLength);
    const inset = config.pinLength * basicLength;
    if (side === 'left') {
        return { x: x + inset, w };
    }
    return { x: mid, w };
}

/** Hit / editor box for a pin name inside an FB / box instruction */
export function pinLabelRect(
    treeNode: TreeNode,
    pin: FBParameter,
    side: 'left' | 'right',
    basicLength: number,
    fontSize: number,
    margin_horizontal = 2
): { x: number; y: number; w: number; h: number } {
    const py = boxPinY(treeNode, pin) * basicLength;
    const font = Math.max(10, fontSize - 1);
    const h = Math.max(font + 6, (pin.varNameHeight || 0.6) * basicLength);
    const col = pinNameColumn(treeNode, side, basicLength);
    return { x: col.x, y: py - nameLinePx(basicLength) / 2, w: col.w, h };
}

/** Variable name above the symbol (TIA convention) */
function drawVarLabel(
    ctx: CanvasRenderingContext2D,
    treeNode: TreeNode,
    basicLength: number,
    fontSize: number,
    margin_horizontal = 2
): void {
    const box = elementDrawX(treeNode);
    const cx = (box.x + box.w / 2) * basicLength;
    const py = pinYPx(treeNode, basicLength);
    const symbolTop = isBoxInstruction(treeNode.type as string)
        ? treeNode.location.y * basicLength
        : py - basicLength * 0.32;
    const y = symbolTop - 3;
    ctx.fillStyle = TiaTheme.label;
    ctx.font = `${fontSize}px "Segoe UI", "Microsoft YaHei", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const name = treeNode.varName || treeNode.varAddr || '';
    const absW = elementSlotGrid(treeNode.width || box.w, margin_horizontal) * basicLength;
    const reserved = treeNode.varNameHeight || STR_LINE_GRID;
    const lines = wrapStr(name, undefined, absW);
    if (lines.length) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(cx - absW / 2, y - reserved * basicLength, absW, reserved * basicLength + 4);
        ctx.clip();
        fillWrappedLines(ctx, lines, cx, y, nameLinePx(basicLength), false);
        ctx.restore();
    }
}

/**
 * NO --| |--  NC --|/|--  edge --|P|-- --|N|--
 */
function drawContact(
    ctx: CanvasRenderingContext2D,
    treeNode: TreeNode,
    basicLength: number,
    color: string
): void {
    const type = treeNode.type as string;
    const py = pinYPx(treeNode, basicLength);
    const x = wirePinX(treeNode, 'left') * basicLength;
    const w = (treeNode.width || 1) * basicLength;
    const cx = x + w / 2;
    const bar = basicLength * 0.22;
    const gap = basicLength * 0.28;
    const halfH = basicLength * 0.28;

    strokeSetup(ctx, color);
    ctx.beginPath();
    ctx.moveTo(x, py);
    ctx.lineTo(cx - gap, py);
    ctx.moveTo(cx + gap, py);
    ctx.lineTo(x + w, py);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - bar, py - halfH);
    ctx.lineTo(cx - bar, py + halfH);
    ctx.moveTo(cx + bar, py - halfH);
    ctx.lineTo(cx + bar, py + halfH);
    ctx.stroke();

    if (type === 'NC') {
        ctx.beginPath();
        ctx.moveTo(cx - bar - 2, py + halfH);
        ctx.lineTo(cx + bar + 2, py - halfH);
        ctx.stroke();
    } else if (type === 'P' || type === 'N' || type === 'NOT') {
        ctx.fillStyle = color;
        ctx.font = `${Math.round(basicLength * 0.32)}px "Segoe UI", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(type === 'NOT' ? '/' : type, cx, py);
    }
}

/**
 * Coil --( )--  --(/)--  --(S)--  --(R)--
 * TIA uses parentheses, not a full circle.
 */
function drawCoilSymbol(
    ctx: CanvasRenderingContext2D,
    treeNode: TreeNode,
    basicLength: number,
    color: string
): void {
    const type = String(treeNode.type ?? 'COIL');
    const py = pinYPx(treeNode, basicLength);
    const x = wirePinX(treeNode, 'left') * basicLength;
    const w = (treeNode.width || 1) * basicLength;
    const cx = x + w / 2;
    const r = basicLength * 0.32;
    const span = Math.PI * 0.78;

    strokeSetup(ctx, color, 1.6);
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(x, py);
    ctx.lineTo(cx - r, py);
    ctx.moveTo(cx + r, py);
    ctx.lineTo(x + w, py);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, py, r, Math.PI - span / 2, Math.PI + span / 2, false);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, py, r, -span / 2, span / 2, false);
    ctx.stroke();

    const barH = basicLength * 0.28;
    ctx.beginPath();
    ctx.moveTo(x + w, py - barH);
    ctx.lineTo(x + w, py + barH);
    ctx.stroke();

    if (type === 'N‑COIL' || type === 'N-COIL') {
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.38, py + r * 0.55);
        ctx.lineTo(cx + r * 0.38, py - r * 0.55);
        ctx.stroke();
    } else if (type === 'SET' || type === 'RST') {
        ctx.fillStyle = color;
        ctx.font = `${Math.round(basicLength * 0.32)}px "Segoe UI", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(type === 'SET' ? 'S' : 'R', cx, py);
    }
}

function pinRange(pins: FBParameter[] | undefined, range?: { start?: number; end?: number }): FBParameter[] {
    if (!pins) {
        return [];
    }
    if (range?.start === undefined || range?.end === undefined) {
        return pins;
    }
    return pins.slice(range.start, range.end + 1);
}

/**
 * FB / timer / counter rectangular instruction box (TIA block look)
 */
function drawBox(
    ctx: CanvasRenderingContext2D,
    treeNode: TreeNode,
    basicLength: number,
    fontSize: number,
    color: string,
    pinInviewer?: PinViewerRange | null,
    margin_horizontal = 2
): void {
    const x = treeNode.location.x * basicLength;
    const y = treeNode.location.y * basicLength;
    const w = treeNode.width * basicLength;
    const h = Math.max(treeNode.height, 1.5) * basicLength;

    strokeSetup(ctx, color, 1.25);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.fill();
    ctx.stroke();

    const title = (treeNode.type as string) || 'FB';
    ctx.fillStyle = color;
    ctx.font = `bold ${fontSize}px "Segoe UI", "Microsoft YaHei", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(title, x + w / 2, y + 4);

    const leftPins = pinRange(treeNode.left, pinInviewer?.left);
    const rightPins = pinRange(treeNode.right, pinInviewer?.right);
    ctx.font = `${Math.max(10, fontSize - 1)}px "Segoe UI", sans-serif`;
    const leftCol = pinNameColumn(treeNode, 'left', basicLength);
    const rightCol = pinNameColumn(treeNode, 'right', basicLength);

    for (const pin of leftPins) {
        const py = boxPinY(treeNode, pin) * basicLength;
        ctx.beginPath();
        ctx.moveTo(x - basicLength * 0.5, py);
        ctx.lineTo(x, py);
        ctx.stroke();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const leftLines = wrapStr(pin.varName || pin.varDataType || pinNameFallback(pin, 'IN'), blockTextNum, leftCol.w);
        const colH = (pin.varNameHeight || 0.6) * basicLength;
        ctx.save();
        ctx.beginPath();
        ctx.rect(leftCol.x, py - nameLinePx(basicLength) / 2, leftCol.w, colH);
        ctx.clip();
        fillWrappedLines(ctx, leftLines, leftCol.x + 4, py, nameLinePx(basicLength), true);
        ctx.restore();
    }
    for (const pin of rightPins) {
        const py = boxPinY(treeNode, pin) * basicLength;
        ctx.beginPath();
        // Stay outside the box so ENO/OUT labels stay readable. calculateLines
        // starts at x+w-0.5 (under the fill); yellow sits at x+w+0.5.
        ctx.moveTo(x + w, py);
        ctx.lineTo(x + w + basicLength * 0.5, py);
        ctx.stroke();
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        const rightLines = wrapStr(pin.varName || pin.varDataType || pinNameFallback(pin, 'Q'), blockTextNum, rightCol.w);
        const colH = (pin.varNameHeight || 0.6) * basicLength;
        ctx.save();
        ctx.beginPath();
        ctx.rect(rightCol.x, py - nameLinePx(basicLength) / 2, rightCol.w, colH);
        ctx.clip();
        fillWrappedLines(ctx, rightLines, rightCol.x + rightCol.w - 4, py, nameLinePx(basicLength), true);
        ctx.restore();
    }
}

function pinNameFallback(pin: FBParameter, fallback: string): string {
    return pin.varDataType || fallback;
}

/** Open branch: filled right-pointing arrow on the power-flow line */
function drawOpenBranch(
    ctx: CanvasRenderingContext2D,
    treeNode: TreeNode,
    basicLength: number,
    color: string
): void {
    const py = pinYPx(treeNode, basicLength);
    const left = wirePinX(treeNode, 'left') * basicLength;
    const right = wirePinX(treeNode, 'right') * basicLength;
    const tipX = right - basicLength * 0.06;
    const baseX = tipX - basicLength * 0.42;
    const halfH = basicLength * 0.22;

    strokeSetup(ctx, color, 1.5);
    ctx.beginPath();
    ctx.moveTo(left, py);
    ctx.lineTo(baseX, py);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(baseX, py - halfH);
    ctx.lineTo(tipX, py);
    ctx.lineTo(baseX, py + halfH);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
}

export function paintElement(
    ctx: CanvasRenderingContext2D,
    treeNode: TreeNode,
    basicLength: number,
    fontSize: number,
    color: string = TiaTheme.ink,
    pinInviewer?: PinViewerRange | null,
    margin_horizontal = 2
): void {
    if (treeNode.blockType !== 'element') {
        return;
    }
    const type = treeNode.type as string | undefined;
    if (type === 'OB') {
        drawOpenBranch(ctx, treeNode, basicLength, color);
        return;
    }
    drawVarLabel(ctx, treeNode, basicLength, fontSize, margin_horizontal);
    if (isBoxInstruction(type)) {
        drawBox(ctx, treeNode, basicLength, fontSize, color, pinInviewer, margin_horizontal);
        return;
    }
    if (isCoil(type)) {
        drawCoilSymbol(ctx, treeNode, basicLength, color);
        return;
    }
    drawContact(ctx, treeNode, basicLength, color);
}

export function paintLine(
    ctx: CanvasRenderingContext2D,
    location: { start: { x: number; y: number }; end: { x: number; y: number } },
    basicLength: number,
    color: string = TiaTheme.ink
): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(location.start.x * basicLength, location.start.y * basicLength);
    ctx.lineTo(location.end.x * basicLength, location.end.y * basicLength);
    ctx.stroke();
}

export function paintPolyline(
    ctx: CanvasRenderingContext2D,
    points: [number, number][],
    basicLength: number,
    color: string = TiaTheme.monitor
): void {
    if (points.length < 2) {
        return;
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(points[0][0] * basicLength, points[0][1] * basicLength);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i][0] * basicLength, points[i][1] * basicLength);
    }
    ctx.stroke();
}

/** HVH orthogonal polyline preview while dragging (does not write lineMap) */
export function orthogonalPreview(
    x0: number,
    y0: number,
    x1: number,
    y1: number
): [number, number][] {
    const mx = (x0 + x1) / 2;
    return [
        [x0, y0],
        [mx, y0],
        [mx, y1],
        [x1, y1],
    ];
}
