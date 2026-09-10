import type { HitKind, HitTarget, MiniRectOpts } from '@/app/lad/view/core/viewHost';

/**
 * Native Canvas picking.
 * Selection uses the element bbox (any point inside); isPointInPath is still used for pins/wires.
 */
const KIND_PRIORITY: Record<HitKind, number> = {
    pin: 4,
    assist: 3,
    element: 2,
    wire: 1,
};

function pointInBBox(b: { x: number; y: number; w: number; h: number }, cssX: number, cssY: number): boolean {
    return cssX >= b.x && cssX <= b.x + b.w && cssY >= b.y && cssY <= b.y + b.h;
}

/** Hit if the point is inside the element selection box (later-drawn wins) */
export function hitElementByBBox(targets: HitTarget[], cssX: number, cssY: number): HitTarget | null {
    for (let i = targets.length - 1; i >= 0; i--) {
        const t = targets[i];
        if (t.kind !== 'element' || !t.bbox) {
            continue;
        }
        if (pointInBBox(t.bbox, cssX, cssY)) {
            return t;
        }
    }
    return null;
}

function withHitTransform<T>(
    ctx: CanvasRenderingContext2D,
    fn: () => T
): T {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    try {
        return fn();
    } finally {
        ctx.restore();
    }
}

export function hitTest(
    ctx: CanvasRenderingContext2D,
    targets: HitTarget[],
    cssX: number,
    cssY: number,
    _dpr: number
): HitTarget | null {
    void _dpr;
    return withHitTransform(ctx, () => {
        let best: HitTarget | null = null;
        let bestPri = -1;
        for (let i = targets.length - 1; i >= 0; i--) {
            const t = targets[i];
            const inside = t.kind === 'element' && t.bbox
                ? pointInBBox(t.bbox, cssX, cssY)
                : ctx.isPointInPath(t.path, cssX, cssY);
            if (!inside) {
                continue;
            }
            const pri = KIND_PRIORITY[t.kind];
            if (pri >= bestPri) {
                best = t;
                bestPri = pri;
                if (pri === 4) {
                    return best;
                }
            }
        }
        return best;
    });
}

export function hitAllElements(
    ctx: CanvasRenderingContext2D,
    targets: HitTarget[],
    cssX: number,
    cssY: number,
    _dpr: number
): HitTarget[] {
    void _dpr;
    return withHitTransform(ctx, () =>
        targets.filter((t) => t.kind === 'element' && t.bbox && pointInBBox(t.bbox, cssX, cssY))
    );
}

/** Marquee: bbox intersects the rectangle */
export function idsInMarquee(
    targets: HitTarget[],
    x0: number,
    y0: number,
    x1: number,
    y1: number
): string[] {
    const left = Math.min(x0, x1);
    const top = Math.min(y0, y1);
    const right = Math.max(x0, x1);
    const bottom = Math.max(y0, y1);
    const ids: string[] = [];
    for (const t of targets) {
        if (t.kind !== 'element' || !t.bbox) {
            continue;
        }
        const b = t.bbox;
        const hit = b.x < right && b.x + b.w > left && b.y < bottom && b.y + b.h > top;
        if (hit && ids.indexOf(t.id) === -1) {
            ids.push(t.id);
        }
    }
    return ids;
}

/** Slot magnet: prefer the nearest left/right drop slot; pointer need not sit exactly on the small square */
export function pickAssistNear(
    assists: MiniRectOpts[],
    cssX: number,
    cssY: number,
    magnetPx: number
): MiniRectOpts | null {
    let best: MiniRectOpts | null = null;
    let bestD = magnetPx;
    for (const a of assists) {
        const cx = a.x + a.width / 2;
        const cy = a.y + a.height / 2;
        const inX = cssX >= a.x - magnetPx && cssX <= a.x + a.width + magnetPx;
        const inY = cssY >= a.y - magnetPx && cssY <= a.y + a.height + magnetPx;
        if (!inX || !inY) {
            continue;
        }
        const d = Math.hypot(cssX - cx, cssY - cy);
        if (d <= bestD) {
            best = a;
            bestD = d;
        }
    }
    return best;
}
