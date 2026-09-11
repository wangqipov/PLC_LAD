import type { TreeNodeObj } from '@/app/lad/class/index';
import { ASSIST_OUTSET, ASSIST_SIZE } from '@/app/lad/view/core/config';
import type { HitTarget, LadViewHost, MiniRectOpts, PositionDir } from '@/app/lad/view/core/viewHost';
import { boxPinY, elementDrawX, isBoxInstruction, orthogonalPreview } from '@/app/lad/view/render/drawSymbols';
import { cssToWorld, worldToViewerGrid } from '@/app/lad/view/interaction/zoomPan';

export interface WireDragState {
    fromId: string;
    fromPin: number;
    fromSide: 'left' | 'right';
    fromType: string;
    startGridX: number;
    startGridY: number;
    currentGridX: number;
    currentGridY: number;
}

export type ConnectObCheck = (obj: {
    OBId: string;
    targetId: string;
    direction: 'left' | 'right';
    pinIndex?: number;
}) => boolean;

/**
 * LINE drop slots for connectOB. Source may be the arrow or a target yellow;
 * the core call is always { OBId, targetId, direction of the target }.
 */
export function filterLineAssists(
    linkedList: TreeNodeObj,
    sourceId: string,
    sourceDir: 'left' | 'right',
    sourcePinIndex: number | undefined,
    grouped: Record<PositionDir, MiniRectOpts[]>,
    canConnect: ConnectObCheck
): MiniRectOpts[] {
    const source = linkedList[sourceId];
    if (!source || source.blockType !== 'element') {
        return [];
    }
    const fromOb = source.type === 'OB';
    const result: MiniRectOpts[] = [];
    for (const dir of ['left', 'right'] as const) {
        for (const item of grouped[dir]) {
            const otherId = item.parentId || item.id;
            if (!otherId || otherId === sourceId) {
                continue;
            }
            try {
                const ok = fromOb
                    ? canConnect({
                        OBId: sourceId,
                        targetId: otherId,
                        direction: dir,
                        pinIndex: item.pinIndex,
                    })
                    : linkedList[otherId]?.type === 'OB' && canConnect({
                        OBId: otherId,
                        targetId: sourceId,
                        direction: sourceDir,
                        pinIndex: sourcePinIndex,
                    });
                if (ok) {
                    result.push(item);
                }
            } catch {
                /* Replica / incomplete nodes can throw inside the core check */
            }
        }
    }
    return result;
}

/**
 * Drag an orthogonal polyline from a pin. On drop, emit nodedrop(LINE); ladEvent calls connectOB.
 */
export class DragLineController {
    private state: WireDragState | null = null;

    getCurrentTargetNode(): { attrs: { type?: string; id?: string; direction?: string; pinIndex?: number } } | null {
        if (!this.state) {
            return null;
        }
        return {
            attrs: {
                type: this.state.fromType,
                id: this.state.fromId,
                direction: this.state.fromSide,
                pinIndex: this.state.fromPin,
            },
        };
    }

    getSource(): { id: string; pinSide: 'left' | 'right'; pinIndex: number } | null {
        if (!this.state) {
            return null;
        }
        return {
            id: this.state.fromId,
            pinSide: this.state.fromSide,
            pinIndex: this.state.fromPin,
        };
    }

    get active(): boolean {
        return this.state !== null;
    }

    begin(from: { id: string; pinIndex: number; pinSide: 'left' | 'right'; gridX: number; gridY: number; type?: string }): void {
        this.state = {
            fromId: from.id,
            fromPin: from.pinIndex,
            fromSide: from.pinSide,
            fromType: from.type || 'OB',
            startGridX: from.gridX,
            startGridY: from.gridY,
            currentGridX: from.gridX,
            currentGridY: from.gridY,
        };
    }

    move(host: LadViewHost, cssX: number, cssY: number): [number, number][] | null {
        if (!this.state) {
            return null;
        }
        const world = cssToWorld(host, cssX, cssY);
        const local = worldToViewerGrid(host, world.x, world.y);
        this.state.currentGridX = local.x;
        this.state.currentGridY = local.y;
        return orthogonalPreview(
            this.state.startGridX,
            this.state.startGridY,
            this.state.currentGridX,
            this.state.currentGridY
        );
    }

    end(): WireDragState | null {
        const s = this.state;
        this.state = null;
        return s;
    }

    previewPoints(): [number, number][] | undefined {
        if (!this.state) {
            return undefined;
        }
        return orthogonalPreview(
            this.state.startGridX,
            this.state.startGridY,
            this.state.currentGridX,
            this.state.currentGridY
        );
    }
}

/**
 * Build left/right/up/down insert slots for visible elements. Uses computed location / pinY.
 */
export function buildAssistPoints(
    host: LadViewHost,
    dirs: PositionDir[],
    excludeIds?: Iterable<string>
): Record<PositionDir, MiniRectOpts[]> {
    const result: Record<PositionDir, MiniRectOpts[]> = { left: [], right: [], up: [], down: [] };
    const skip = excludeIds ? new Set(excludeIds) : null;
    const leftTopX = host.viewer[0][0];
    const leftTopY = host.viewer[0][1];
    const bl = host.basicLength;
    const size = ASSIST_SIZE * bl;

    for (const id of host.viewElement) {
        if (skip?.has(id)) {
            continue;
        }
        const node = host.data.linkedList[id];
        if (!node || node.blockType !== 'element' || node.type === 'END') {
            continue;
        }
        const draw = elementDrawX(node);
        const x = (draw.x - leftTopX) * bl;
        const y = (node.location.y - leftTopY) * bl;
        const w = draw.w * bl;
        const h = node.height * bl;
        const py = ((node.pinY ?? node.location.y) - leftTopY) * bl;
        const box = isBoxInstruction(node.type as string);
        const stub = box ? 0.5 * bl : 0;
        const gap = ASSIST_OUTSET * bl;
        const nest = size * 0.35;

        if (dirs.indexOf('left') >= 0) {
            if (box && node.left) {
                node.left.forEach((pin, pinIndex) => {
                    const cy = (boxPinY(node, pin) - leftTopY) * bl;
                    result.left.push(assistSlot(id, 'left', x - stub - gap - size + nest, cy - size / 2, size, pinIndex));
                });
            } else {
                result.left.push(assistSlot(id, 'left', x - gap - size + nest, py - size / 2, size));
            }
        }
        if (dirs.indexOf('right') >= 0 && node.type !== 'OB') {
            if (box && node.right) {
                node.right.forEach((pin, pinIndex) => {
                    const cy = (boxPinY(node, pin) - leftTopY) * bl;
                    result.right.push(assistSlot(id, 'right', x + w + stub + gap - nest, cy - size / 2, size, pinIndex));
                });
            } else {
                result.right.push(assistSlot(id, 'right', x + w + gap - nest, py - size / 2, size));
            }
        }
        if (dirs.indexOf('up') >= 0) {
            result.up.push(assistSlot(id, 'up', x + w / 2 - size / 2, y - size, size));
        }
        if (dirs.indexOf('down') >= 0) {
            result.down.push(assistSlot(id, 'down', x + w / 2 - size / 2, y + h, size));
        }
    }
    return result;
}

export function hitAssist(targets: HitTarget[], kindOnly = true): HitTarget | null {
    void kindOnly;
    return targets.find((t) => t.kind === 'assist') ?? null;
}

export function flattenAssist(map: Record<PositionDir, MiniRectOpts[]>): MiniRectOpts[] {
    return dedupeAssists([...map.left, ...map.right, ...map.up, ...map.down]);
}

/** Persistent left/right connection slots (TIA insert slots) */
export function visibleConnectPoints(host: LadViewHost, excludeIds?: Iterable<string>): MiniRectOpts[] {
    return flattenAssist(buildAssistPoints(host, ['left', 'right'], excludeIds));
}

/** Slot writes both id and parentId for moveElements(copyIds, lad, id, direction) */
function assistSlot(
    elementId: string,
    direction: PositionDir,
    x: number,
    y: number,
    size: number,
    pinIndex?: number
): MiniRectOpts {
    return {
        id: elementId,
        parentId: elementId,
        direction,
        pinIndex,
        x,
        y,
        width: size,
        height: size,
    };
}

function dedupeAssists(list: MiniRectOpts[]): MiniRectOpts[] {
    const kept: MiniRectOpts[] = [];
    for (const a of list) {
        const overlap = kept.some(
            (b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
        );
        if (!overlap) {
            kept.push(a);
        }
    }
    return kept;
}
