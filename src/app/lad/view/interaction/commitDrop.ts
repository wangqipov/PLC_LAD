import type { ElementType, FBParameter } from '@/app/lad/class/index';
import type Lad from '@/app/lad/index';
import { setVarName } from '@/app/lad/service/transformData';
import { calculateFBVarHeight, calculateVarHeight } from '@/app/lad/service/varNameHeight';
import type { Editing, FbEditing } from '@/app/lad/view/core/textEditor';
import { isFbEditing } from '@/app/lad/view/core/textEditor';
import type { LadViewHost, PositionDir } from '@/app/lad/view/core/viewHost';
import { isBoxInstruction, isContact } from '@/app/lad/view/render/drawSymbols';
import { isCoilLike, isLadElement, onlyElementIds } from '@/app/lad/view/interaction/dragDrop';
import {
    commitPasteAt,
    elementIdsAdded,
    findConnectLineId,
    findPasteAnchor,
    recordAdd,
    recordConnect,
    recordMove,
} from '@/app/lad/view/interaction/editHistory';
import { copy } from '@/app/lad/service/paste';

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
        if (isCoilLike(String(target.type)) && direction === 'right') {
            return null;
        }
        const addObj = {
            type: addType as ElementType,
            id: targetId,
            direction,
            pinIndex: attrs.pinIndex,
            width: box ? 4 : 1,
            height: box ? 3 : 1,
        };
        // FB pin connectOB requires the contact to sit on an ANB that ends with an open branch.
        const fbPin = isBoxInstruction(String(target.type))
            && direction === 'left'
            && !!attrs.pinIndex
            && isContact(addType);
        let uuid: string | null;
        if (fbPin) {
            const obId = add({ type: 'OB', id: targetId, direction: 'down' }, host.data) as string | null;
            if (!obId) {
                return null;
            }
            uuid = add({ type: addType as ElementType, id: obId, direction: 'left', width: 1, height: 1 }, host.data) as string | null;
            if (!uuid) {
                return null;
            }
            const { connectOB, ifCanConnectOB } = await import('@/app/lad/service/transformData');
            const line = { OBId: obId, targetId, direction: 'left' as const, pinIndex: attrs.pinIndex };
            if (ifCanConnectOB(line, host.data)) {
                connectOB(line, host.data);
            }
        } else {
            uuid = add(addObj, host.data) as string | null;
        }
        if (!uuid) {
            return null;
        }
        await runUpdateCanvas(host);
        recordAdd(host, addObj, uuid);
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
    const copyIds = onlyElementIds(host.data.linkedList, ids);
    const targetId = dropTargetId(attrs);
    if (!copyIds.length || !targetId || copyIds.indexOf(targetId) >= 0) {
        return false;
    }
    const target = host.data.linkedList[targetId];
    if (!isLadElement(target)) {
        return false;
    }
    if (isCoilLike(String(target.type)) && attrs.direction === 'right') {
        return false;
    }
    try {
        ensureLayoutFields(host);
        const undoTarget = findPasteAnchor(host, copyIds);
        const before = Object.keys(host.data.linkedList);
        const { moveElements } = await import('@/app/lad/service/moveElements');
        moveElements(copyIds, host as unknown as Lad, targetId, attrs.direction, false);
        const newIds = elementIdsAdded(host.data, before);
        if (undoTarget && newIds.length) {
            recordMove(host, copyIds, targetId, attrs.direction, newIds, undoTarget);
        }
        return true;
    } catch (err) {
        console.error('[LAD] moveElements 失败', err);
        return false;
    }
}

/** Ctrl+drag onto a slot: copy() + paste(), same as a clipboard paste */
export async function commitElementCopy(host: LadViewHost, ids: string[], attrs: DropAttrs): Promise<boolean> {
    if (attrs.direction !== 'left' && attrs.direction !== 'right') {
        return false;
    }
    const copyIds = onlyElementIds(host.data.linkedList, ids);
    const targetId = dropTargetId(attrs);
    if (!copyIds.length || !targetId || copyIds.indexOf(targetId) >= 0) {
        return false;
    }
    const clip = copy(copyIds, host as unknown as Lad);
    if (!clip) {
        return false;
    }
    return commitPasteAt(host, { id: targetId, direction: attrs.direction }, clip);
}

/**
 * Arrow ↔ yellow-slot wire: transformData.connectOB then updateCanvas.
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
        const { connectOB, ifCanConnectOB } = await import('@/app/lad/service/transformData');
        const line = {
            OBId: obj.OBId,
            targetId: obj.targetId,
            direction: obj.direction,
            pinIndex: obj.pinIndex,
        };
        if (!ifCanConnectOB(line, host.data)) {
            return false;
        }
        const ok = connectOB(line, host.data);
        if (!ok) {
            return false;
        }
        await runUpdateCanvas(host);
        recordConnect(host, line, findConnectLineId(host.data, line.OBId, line.targetId));
        return true;
    } catch (err) {
        console.error('[LAD] connectOB 失败', err);
        return false;
    }
}

/**
 * Same path as ladEvent onBlur: calculateVarHeight / calculateFBVarHeight, then transformData.setVarName.
 * Demo cannot call index.setVarName (needs a full Lad + saveCache).
 */
export async function commitSetVarName(host: LadViewHost, editing: Editing | FbEditing): Promise<boolean> {
    const node = host.data.linkedList[editing.id];
    if (!node || node.blockType !== 'element') {
        return false;
    }
    if (isFbEditing(editing)) {
        const pin = (editing.dir === 'left' ? node.left : node.right)?.[editing.pinIndex] as FBParameter | undefined;
        if (!pin) {
            return false;
        }
        const heightObj = calculateFBVarHeight(pin, editing);
        setVarName({
            data: host.data,
            width: editing.textWidth,
            id: editing.id,
            dir: editing.dir,
            fbIndex: editing.pinIndex,
            val: editing.instanceName ? editing.instanceName : '',
            varNameHeight: heightObj.varNameHeight,
            varHeight: heightObj.varHeight,
            pouName: editing.pouName,
            varAddr: editing.varAddr,
            varDesc: editing.varDesc,
            varDataType: editing.varDataType,
        });
    } else {
        const heightObj = calculateVarHeight(node, editing);
        setVarName({
            data: host.data,
            width: editing.textWidth,
            id: editing.id,
            val: editing.instanceName ? editing.instanceName : '',
            vid: editing.vtid,
            jumpId: editing.jumpId,
            jumpName: editing.jumpName,
            jumpIndex: editing.jumpIndex,
            varNameHeight: heightObj.varNameHeight,
            varHeight: heightObj.varHeight,
            pouName: editing.pouName ? editing.pouName : '',
            varAddr: editing.varAddr ? editing.varAddr : '',
            varDesc: editing.varDesc ? editing.varDesc : '',
            varDataType: editing.varDataType,
        });
    }
    await runUpdateCanvas(host);
    return true;
}

/** After every data mutation, call host updateCanvas (layout + initCanvas + updateViewer) */
export async function runUpdateCanvas(host: LadViewHost): Promise<void> {
    ensureLayoutFields(host);
    const { updateCanvas } = await import('@/app/lad/service/updateCanvas');
    updateCanvas({ _this: host as unknown as Lad });
    const view = host.canvasView as { redrawFromHost?: () => void } | undefined;
    view?.redrawFromHost?.();
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

