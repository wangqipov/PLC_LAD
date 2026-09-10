import { ASSIST_SIZE, TiaTheme } from '@/app/lad/view/core/config';
import { isBoxInstruction } from '@/app/lad/view/render/drawSymbols';
import type { TreeNode } from '@/app/lad/class/index';
import { paintElement } from '@/app/lad/view/render/drawSymbols';
import { paintPolyline } from '@/app/lad/view/render/drawSymbols';

export interface PreviewGhost {
    type: string;
    /** Grid coordinates (relative to the current viewer) */
    gridX: number;
    gridY: number;
    width?: number;
    height?: number;
}

/**
 * Translucent preview while dragging from the palette or moving.
 * Caller passes already-snapped grid coordinates; this function does not snap.
 */
export function paintGhost(
    ctx: CanvasRenderingContext2D,
    ghost: PreviewGhost,
    basicLength: number,
    fontSize: number
): void {
    ctx.save();
    ctx.globalAlpha = 0.45;
    const node = {
        blockType: 'element',
        type: ghost.type as TreeNode['type'],
        location: { x: ghost.gridX, y: ghost.gridY },
        width: ghost.width ?? (isBoxInstruction(String(ghost.type)) ? 4 : 1),
        height: ghost.height ?? (isBoxInstruction(String(ghost.type)) ? 3 : 1),
        originalWidth: 1,
        originalHeight: 1,
        pinY: ghost.gridY + 0.4,
        pinOffsetY: 0.4,
        varName: '',
    } as TreeNode;
    paintElement(ctx, node, basicLength, fontSize, TiaTheme.previewStroke);
    ctx.restore();
}

export function paintMarquee(
    ctx: CanvasRenderingContext2D,
    x0: number,
    y0: number,
    x1: number,
    y1: number
): void {
    const x = Math.min(x0, x1);
    const y = Math.min(y0, y1);
    const w = Math.abs(x1 - x0);
    const h = Math.abs(y1 - y0);
    ctx.fillStyle = TiaTheme.marqueeFill;
    ctx.strokeStyle = TiaTheme.marqueeStroke;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);
}

export function paintSelectionFrame(
    ctx: CanvasRenderingContext2D,
    bbox: { x: number; y: number; w: number; h: number },
    hover = false
): void {
    const pad = 2;
    ctx.strokeStyle = hover ? TiaTheme.hoverStroke : TiaTheme.selectStroke;
    ctx.fillStyle = TiaTheme.selectFill;
    ctx.lineWidth = 2;
    ctx.fillRect(bbox.x - pad, bbox.y - pad, bbox.w + pad * 2, bbox.h + pad * 2);
    ctx.strokeRect(bbox.x - pad, bbox.y - pad, bbox.w + pad * 2, bbox.h + pad * 2);
}

export function paintAssistRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    basicLength: number,
    hot = false
): void {
    const s = ASSIST_SIZE * basicLength;
    ctx.fillStyle = hot ? TiaTheme.assistHotFill : TiaTheme.assistFill;
    ctx.strokeStyle = hot ? TiaTheme.assistHotStroke : TiaTheme.assistStroke;
    ctx.lineWidth = 1;
    ctx.fillRect(x - s / 2, y - s / 2, s, s);
    ctx.strokeRect(x - s / 2, y - s / 2, s, s);
}

export function paintWirePreview(
    ctx: CanvasRenderingContext2D,
    points: [number, number][],
    basicLength: number
): void {
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.setLineDash([6, 4]);
    paintPolyline(ctx, points, basicLength, TiaTheme.selectStroke);
    ctx.restore();
}
