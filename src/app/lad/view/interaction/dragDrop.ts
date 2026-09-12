import type { TreeNode, TreeNodeObj } from '@/app/lad/class/index';
import type { MiniRectOpts, PositionDir } from '@/app/lad/view/core/viewHost';
import type { LadViewHost } from '@/app/lad/view/core/viewHost';
import { cssToWorld, snapGrid, worldToViewerGrid } from '@/app/lad/view/interaction/zoomPan';
import { isBoxInstruction, isCoil } from '@/app/lad/view/render/drawSymbols';

/** Leaf LAD symbol. ANB / ORB / FBL must not be passed to moveElements / copy. */
export function isLadElement(node?: TreeNode): boolean {
    return !!node && node.blockType === 'element' && node.type !== 'END';
}

/** moveElements(copyIds) must be the dragged symbol ids, never a parent ANB/ORB. */
export function onlyElementIds(linkedList: TreeNodeObj, ids: Iterable<string>): string[] {
    const out: string[] = [];
    for (const id of ids) {
        if (isLadElement(linkedList[id]) && out.indexOf(id) === -1) {
            out.push(id);
        }
    }
    return out;
}

export type MoveType = 'OUT' | 'IN' | 'LINE';
export type PaletteElementType =
    | 'NO'
    | 'NC'
    | 'P'
    | 'N'
    | 'NOT'
    | 'Coil'
    | 'COIL'
    | 'N‑COIL'
    | 'SET'
    | 'RST'
    | 'OB'
    | 'FB'
    | 'TON'
    | 'TOF'
    | 'TP'
    | 'CTU'
    | 'CTD';

export interface MoveNodeData {
    moveType: MoveType;
    /** IN: moved element ids; LINE / OUT: extra payload */
    data: string[] | {
        OBId?: string;
        ids?: string[];
        type?: string;
    };
}

export interface PaletteDragState {
    type: string;
    gridX: number;
    gridY: number;
}

export interface ElementMoveState {
    ids: string[];
    grabOffsetX: number;
    grabOffsetY: number;
    gridX: number;
    gridY: number;
}

export function dropEventAttrs(assist: MiniRectOpts | null | undefined, fallbackRootId: string): {
    attrs: { id: string; parentId: string; direction: PositionDir; pinIndex?: number };
} {
    if (assist) {
        const id = assist.id || assist.parentId;
        return {
            attrs: {
                id,
                parentId: assist.parentId || id,
                direction: assist.direction,
                pinIndex: assist.pinIndex,
            },
        };
    }
    return { attrs: { id: fallbackRootId, parentId: fallbackRootId, direction: 'left' } };
}

/**
 * Palette drag: convert a screen point to a grid point.
 * TODO: call project API for grid snap
 */
export function palettePreviewAt(host: LadViewHost, cssX: number, cssY: number, type: string): PaletteDragState {
    const world = cssToWorld(host, cssX, cssY);
    const snapped = snapGrid(world.x, world.y);
    const local = worldToViewerGrid(host, snapped.x, snapped.y);
    return { type, gridX: local.x, gridY: local.y };
}

/**
 * In-canvas move preview. On drop, emit nodedrop(IN); ladEvent calls moveElements.
 * TODO: call project API moveElements / update element positions
 */
export function elementMovePreview(
    host: LadViewHost,
    cssX: number,
    cssY: number,
    ids: string[]
): ElementMoveState {
    const world = cssToWorld(host, cssX, cssY);
    const snapped = snapGrid(world.x, world.y);
    const local = worldToViewerGrid(host, snapped.x, snapped.y);
    return { ids, grabOffsetX: 0, grabOffsetY: 0, gridX: local.x, gridY: local.y };
}

export function ghostGridAtAssist(
    assist: MiniRectOpts,
    type: string,
    basicLength: number
): { gridX: number; gridY: number } {
    const gw = isBoxInstruction(type) ? 4 : 1;
    const cx = assist.x / basicLength;
    const cy = assist.y / basicLength;
    const size = assist.height / basicLength;
    const midX = cx + assist.width / basicLength / 2;
    if (assist.direction === 'down') {
        return { gridX: midX - gw / 2, gridY: cy + size };
    }
    if (assist.direction === 'up') {
        return { gridX: midX - gw / 2, gridY: cy - 1 };
    }
    const gridY = cy + size / 2 - 0.4;
    if (assist.direction === 'left') {
        return { gridX: cx - gw, gridY };
    }
    return { gridX: cx + assist.width / basicLength, gridY };
}

/**
 * Matches addCheck / TIA: coil, jump, return may only drop on the left of an arrow.
 * Filters drop slots only; does not change add itself.
 */
export function isCoilLike(type?: string): boolean {
    return isCoil(type) || type === 'jump' || type === 'return';
}

export function filterAssistForAdd(
    host: LadViewHost,
    points: MiniRectOpts[],
    type: string
): MiniRectOpts[] {
    const addType = type === 'COIL' ? 'Coil' : type;
    if (addType === 'OB') {
        return points.filter((p) => p.direction === 'down');
    }
    if (!isCoilLike(addType)) {
        return points;
    }
    return points.filter((p) => {
        const id = p.id || p.parentId;
        const node = host.data.linkedList[id];
        return node?.type === 'OB' && p.direction === 'left';
    });
}

export const PALETTE_MIME = 'application/x-lad-element';

export const PALETTE_GROUPS: { title: string; items: { type: PaletteElementType; label: string }[] }[] = [
    {
        title: '分支',
        items: [
            { type: 'OB', label: '开路分支' },
        ],
    },
    {
        title: '触点',
        items: [
            { type: 'NO', label: '常开触点  | |' },
            { type: 'NC', label: '常闭触点  |/|' },
            { type: 'P', label: '上升沿    |P|' },
            { type: 'N', label: '下降沿    |N|' },
            { type: 'NOT', label: '能流取反' },
        ],
    },
    {
        title: '线圈',
        items: [
            { type: 'Coil', label: '输出线圈  ( )' },
            { type: 'N‑COIL', label: '取反线圈  (/)' },
            { type: 'SET', label: '置位线圈  (S)' },
            { type: 'RST', label: '复位线圈  (R)' },
        ],
    },
    {
        title: '指令框',
        items: [
            { type: 'TON', label: 'TON 接通延时' },
            { type: 'TOF', label: 'TOF 断开延时' },
            { type: 'TP', label: 'TP 脉冲' },
            { type: 'CTU', label: 'CTU 增计数' },
            { type: 'FB', label: 'FB 功能块' },
        ],
    },
];
