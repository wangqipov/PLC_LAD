import type { ElementType } from '@/app/lad/class/index';
import type Lad from '@/app/lad/index';
import type { LadViewHost, PositionDir } from '@/app/lad/view/core/viewHost';
import { isBoxInstruction } from '@/app/lad/view/render/drawSymbols';
import { isCoilLike } from '@/app/lad/view/interaction/dragDrop';

export interface DropAttrs {
    /** Drop-target element id passed to moveElements / add */
    id?: string;
    parentId: string;
    direction: PositionDir;
    pinIndex?: number;
    type?: string;
}

function dropTargetId(attrs: DropAttrs): string {
    return attrs.id || attrs.parentId;
}

/**
 * Palette drop on a left/right slot: transformData.add mutates the tree, then updateCanvas.
 * Open-branch (OB) matches ladEvent.buildAddNodeOpts: direction is always down.
 */
export async function commitPaletteAdd(host: LadViewHost, attrs: DropAttrs, type: string): Promise<string | null> {
    try {
        const { add } = await import('@/app/lad/service/transformData');
        const targetId = dropTargetId(attrs);
        const target = host.data.linkedList[targetId];
        if (!target || target.blockType !== 'element') {
            return null;
        }
        const box = isBoxInstruction(type);
        const addType = type === 'COIL' ? 'Coil' : type;
        const direction = addType === 'OB' ? 'down' : attrs.direction;
        if (isCoilLike(addType) && (target.type !== 'OB' || direction !== 'left')) {
            return null;
        }
        const uuid = add(
            {
                type: addType as ElementType,
                id: targetId,
                direction,
                pinIndex: attrs.pinIndex,
                width: box ? 4 : 1,
                height: box ? 3 : 1,
            },
            host.data
        ) as string | null;
        if (!uuid) {
            return null;
        }
        await runUpdateCanvas(host);
        return uuid;
    } catch (err) {
        console.error('[LAD] transformData.add 失败', err);
        return null;
    }
}

/**
 * In-canvas move onto a left/right slot: pass the drop-target id to moveElements.
 * paste / deleteArr call updateCanvas internally.
 */
export async function commitElementMove(host: LadViewHost, ids: string[], attrs: DropAttrs): Promise<boolean> {
    if (attrs.direction !== 'left' && attrs.direction !== 'right') {
        return false;
    }
    const targetId = dropTargetId(attrs);
    if (!targetId || ids.indexOf(targetId) >= 0) {
        return false;
    }
    const target = host.data.linkedList[targetId];
    if (!target || target.blockType !== 'element') {
        return false;
    }
    try {
        ensureLayoutFields(host);
        const { moveElements } = await import('@/app/lad/service/moveElements');
        // TODO: call project API moveElements(copyIds, lad, id, direction, true)
        moveElements(ids, host as unknown as Lad, targetId, attrs.direction, true);
        return true;
    } catch (err) {
        console.error('[LAD] moveElements 失败', err);
        return false;
    }
}

/**
 * Arrow ↔ yellow-slot wire: transformData.connectOB mutates the tree, then updateCanvas.
 * Args match ladEvent nodedrop(LINE): { OBId, targetId, pinIndex, direction }.
 */
export async function commitConnectLine(
    host: LadViewHost,
    obj: { OBId: string; targetId: string; direction: PositionDir; pinIndex?: number }
): Promise<boolean> {
    if (obj.direction !== 'left' && obj.direction !== 'right') {
        return false;
    }
    if (!obj.OBId || !obj.targetId || obj.OBId === obj.targetId) {
        return false;
    }
    try {
        const { connectOB } = await import('@/app/lad/service/transformData');
        // TODO: call project API connectOB({ OBId, targetId, pinIndex, direction }, lad, true)
        const ok = connectOB(
            {
                OBId: obj.OBId,
                targetId: obj.targetId,
                direction: obj.direction,
                pinIndex: obj.pinIndex,
            },
            host.data
        );
        if (!ok) {
            return false;
        }
        await runUpdateCanvas(host);
        return true;
    } catch (err) {
        console.error('[LAD] connectOB 失败', err);
        return false;
    }
}

/** After every data mutation, call host updateCanvas (layout + initCanvas + updateViewer) */
export async function runUpdateCanvas(host: LadViewHost): Promise<void> {
    ensureLayoutFields(host);
    const { updateCanvas } = await import('@/app/lad/service/updateCanvas');
    updateCanvas({ _this: host as unknown as Lad });
}

function ensureLayoutFields(host: LadViewHost): void {
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
}

