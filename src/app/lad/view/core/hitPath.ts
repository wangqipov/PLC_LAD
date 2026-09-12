import type { TreeNode } from '@/app/lad/class/index';
import { ASSIST_SIZE, PIN_HIT_RADIUS, WIRE_HIT_HALF } from '@/app/lad/view/core/config';
import type { LineLocation } from '@/app/lad/view/core/viewHost';
import { elementDrawX, isBoxInstruction } from '@/app/lad/view/render/drawSymbols';

/**
 * Path2D for elements / pins / wires, used with ctx.isPointInPath for picking.
 * Coordinates are CSS pixels in the current viewer (same as the draw coordinate system).
 */

const SELECT_PAD_PX = 4;
const LABEL_PAD_PX = 16;

function pinYPx(treeNode: TreeNode, basicLength: number): number {
    return (treeNode.pinY ?? treeNode.location.y + (treeNode.pinOffsetY ?? 0.4)) * basicLength;
}

/**
 * Contact / coil occupy a layout cell (`height`) that parallel rows stretch to the tallest
 * sibling (the FB). The ink sits on pinY — selection must hug that, not the cell.
 */
function symbolFrameSize(treeNode: TreeNode, basicLength: number): { y: number; h: number } {
    const labelH = Math.max(LABEL_PAD_PX, (treeNode.varNameHeight || 0.4) * basicLength);
    if (treeNode.type === 'OB') {
        const py = pinYPx(treeNode, basicLength);
        const h = basicLength * 0.7;
        return { y: py - h / 2, h };
    }
    if (isBoxInstruction(treeNode.type as string)) {
        const y = treeNode.location.y * basicLength - labelH - SELECT_PAD_PX;
        const h = Math.max(treeNode.height, 0.8) * basicLength + labelH + SELECT_PAD_PX * 2;
        return { y, h };
    }
    const py = pinYPx(treeNode, basicLength);
    const body = basicLength * 0.85;
    return {
        y: py - body / 2 - labelH,
        h: body + labelH + SELECT_PAD_PX,
    };
}

/** Visual selection frame: wraps the symbol + label, not inset into the body */
export function elementFrameBox(treeNode: TreeNode, basicLength: number): { x: number; y: number; w: number; h: number } {
    const box = elementDrawX(treeNode);
    const w = Math.max(box.w, 0.8) * basicLength + SELECT_PAD_PX * 2;
    const x = box.x * basicLength - SELECT_PAD_PX;
    const { y, h } = symbolFrameSize(treeNode, basicLength);
    return { x, y, w, h };
}

/** Click hot zone: symbol + label, inset so yellow drop slots stay outside */
export function elementSelectBox(treeNode: TreeNode, basicLength: number): { x: number; y: number; w: number; h: number } {
    const box = elementDrawX(treeNode);
    const assistPx = ASSIST_SIZE * basicLength + 2;
    let w = Math.max(box.w, 0.8) * basicLength + SELECT_PAD_PX * 2;
    let x = box.x * basicLength - SELECT_PAD_PX;
    x += assistPx;
    w -= assistPx * 2;
    if (w < basicLength * 0.45) {
        w = basicLength * 0.45;
        x = box.x * basicLength + (box.w * basicLength - w) / 2;
    }
    const { y, h } = symbolFrameSize(treeNode, basicLength);
    if (treeNode.type === 'OB' || isBoxInstruction(treeNode.type as string)) {
        return { x, y, w, h };
    }
    return { x, y, w, h: Math.max(basicLength * 0.5, h - assistPx) };
}

export function elementBodyPath(treeNode: TreeNode, basicLength: number, originX = 0, originY = 0): Path2D {
    const b = elementSelectBox(treeNode, basicLength);
    const path = new Path2D();
    path.rect(b.x + originX * basicLength, b.y + originY * basicLength, b.w, b.h);
    return path;
}

export function elementBBox(treeNode: TreeNode, basicLength: number): { x: number; y: number; w: number; h: number } {
    return elementSelectBox(treeNode, basicLength);
}

export function pinPath(cx: number, cy: number, radius = PIN_HIT_RADIUS): Path2D {
    const path = new Path2D();
    path.arc(cx, cy, radius, 0, Math.PI * 2);
    return path;
}

/** Widen a horizontal/vertical segment into a clickable rectangle */
export function wireSegmentPath(location: LineLocation, basicLength: number): Path2D {
    const x1 = location.start.x * basicLength;
    const y1 = location.start.y * basicLength;
    const x2 = location.end.x * basicLength;
    const y2 = location.end.y * basicLength;
    const path = new Path2D();
    if (Math.abs(x1 - x2) >= Math.abs(y1 - y2)) {
        const left = Math.min(x1, x2);
        const right = Math.max(x1, x2);
        path.rect(left, y1 - WIRE_HIT_HALF, right - left || 1, WIRE_HIT_HALF * 2);
    } else {
        const top = Math.min(y1, y2);
        const bottom = Math.max(y1, y2);
        path.rect(x1 - WIRE_HIT_HALF, top, WIRE_HIT_HALF * 2, bottom - top || 1);
    }
    return path;
}

export function rectPath(x: number, y: number, w: number, h: number): Path2D {
    const path = new Path2D();
    path.rect(x, y, w, h);
    return path;
}

export function polylineHitPath(points: [number, number][], basicLength: number): Path2D {
    const path = new Path2D();
    for (let i = 0; i < points.length - 1; i++) {
        const loc: LineLocation = {
            start: { x: points[i][0], y: points[i][1] },
            end: { x: points[i + 1][0], y: points[i + 1][1] },
        };
        path.addPath(wireSegmentPath(loc, basicLength));
    }
    return path;
}
