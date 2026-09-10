import type Lad from '@/app/lad/index';
import {
    calculateLines,
    calculateLocation,
    cleanLine,
    clearPinY,
    initBlueLine,
    initHeight,
    initPinOffsetY,
    initVDom,
    initWidth,
} from '@/app/lad/controller/calculate';
import type { LadViewHost } from '@/app/lad/view/core/viewHost';

/**
 * Same layout refresh order as updateCanvas.
 * Skips vscode initCanvas / updateViewer; CanvasView.redrawFromHost paints the visible region.
 */
export function refreshLadLayout(host: LadViewHost): void {
    const lad = toLayoutLad(host);
    const rootId = host.data.rootId;
    clearPinY(lad, rootId);
    initPinOffsetY(lad, rootId);
    initWidth(lad, rootId, 0);
    initHeight(lad, rootId);
    calculateLocation(lad, rootId);
    cleanLine(lad);
    calculateLines(lad, rootId, false);
    initBlueLine(lad);
    initVDom(lad);

    const root = host.data.linkedList[rootId];
    if (root) {
        host.data.widthV = ((root.width as number) + 5) * host.basicLength;
        host.data.heightV = ((root.height as number) + 2) * host.basicLength;
        const animate = host.ladData.animateDom;
        if (animate) {
            animate.style.width = `${host.data.widthV}px`;
            animate.style.height = `${host.data.heightV}px`;
        }
    }
}

function toLayoutLad(host: LadViewHost): Lad {
    if (host.margin_horizontal === undefined) {
        host.margin_horizontal = 2;
    }
    if (host.margin_vertical === undefined) {
        host.margin_vertical = 0.5;
    }
    if (host.fBMargin === undefined) {
        host.fBMargin = 1;
    }
    if (host.FBLeftHeight === undefined) {
        host.FBLeftHeight = 1.5;
    }
    return host as unknown as Lad;
}
