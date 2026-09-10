import { ZoomLimit } from '@/app/lad/view/core/config';
import type { LadViewHost } from '@/app/lad/view/core/viewHost';

/**
 * TIA view ops: wheel zooms around the cursor; drag pans by writing #centerView scroll,
 * which drives existing virtual scroll (left-empty / right / middle / Space+left).
 */

export function getCenterView(): HTMLElement | null {
    return document.getElementById('centerView');
}

/**
 * TODO: call project API setBaseLength(next, lad)
 * Only computes the next basicLength; CanvasView writes it back to the host and redraws.
 */
export function nextBasicLength(current: number, wheelDelta: number): number {
    const factor = wheelDelta < 0 ? ZoomLimit.step : 1 / ZoomLimit.step;
    const next = current * factor;
    return Math.min(ZoomLimit.max, Math.max(ZoomLimit.min, next));
}

/**
 * Zoom around the mouse: keep the grid point under the cursor fixed.
 * TODO: call project API setBaseLength + calculateViewer
 * Does not rewrite the grid algorithm; only adjusts scroll so the world point stays under the cursor.
 */
export function zoomAtCursor(
    host: LadViewHost,
    cssX: number,
    cssY: number,
    nextLength: number
): void {
    const prev = host.basicLength;
    if (prev === nextLength) {
        return;
    }
    const worldX = host.viewer[0][0] + cssX / prev;
    const worldY = host.viewer[0][1] + cssY / prev;
    host.basicLength = nextLength;
    host.fontSize = Math.round(nextLength * 0.4);

    const centerView = getCenterView();
    if (centerView) {
        const newScrollLeft = worldX * nextLength - cssX;
        const newScrollTop = worldY * nextLength - cssY + (centerView.scrollTop - host.viewer[0][1] * prev);
        centerView.scrollLeft = Math.max(0, newScrollLeft);
        centerView.scrollTop = Math.max(0, newScrollTop);
    }

    // TODO: call project API setBaseLength(nextLength, host)
}

export function panBy(dx: number, dy: number): void {
    const centerView = getCenterView();
    if (!centerView) {
        return;
    }
    centerView.scrollLeft -= dx;
    centerView.scrollTop -= dy;
}

/** Grid snap: round to cell. TODO: call project position API (do not invent layout in the view layer) */
export function snapGrid(worldX: number, worldY: number): { x: number; y: number } {
    // TODO: call project API for grid snap / calculateLocation
    return {
        x: Math.round(worldX),
        y: Math.round(worldY),
    };
}

export function cssToWorld(host: LadViewHost, cssX: number, cssY: number): { x: number; y: number } {
    return {
        x: host.viewer[0][0] + cssX / host.basicLength,
        y: host.viewer[0][1] + cssY / host.basicLength,
    };
}

export function worldToViewerGrid(host: LadViewHost, worldX: number, worldY: number): { x: number; y: number } {
    return {
        x: worldX - host.viewer[0][0],
        y: worldY - host.viewer[0][1],
    };
}
