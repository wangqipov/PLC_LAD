import { deepClone } from '@/app/common/objects';
import type { Data, StringArr, TreeNodeObj } from '@/app/lad/class/index';
import { getAncestorArray, getPublicNearstTreeNode } from '@/app/lad/controller/calculate';
import type Lad from '@/app/lad/index';
import { copy, getNodeFromIds, paste } from '@/app/lad/service/paste';
import type { LadViewHost, PositionDir } from '@/app/lad/view/core/viewHost';
import { isLadElement, onlyElementIds } from '@/app/lad/view/interaction/dragDrop';

export type OpName = 'add' | 'deleteArr' | 'paste' | 'moveElements' | 'connectOB' | 'deleteLine';

/** One core call: method name + the arguments that method already accepts */
export interface OpCall {
    name: OpName;
    args: unknown[];
}

export interface HistEntry {
    do: OpCall;
    undo: OpCall;
}

export interface PasteClip {
    node: TreeNodeObj;
    rootId: string;
}

export interface PasteTarget {
    id: string;
    direction: 'left' | 'right';
}

interface ApplyResult {
    uuid?: string;
    newIds?: string[];
    lineId?: string;
}

const HISTORY_CAP = 50;

/**
 * Undo/redo queue. Stores core-method parameters only (not a full tree snapshot).
 * Undo runs the inverse call; redo runs the original call. New ids from add/paste/move
 * are written back into the opposite entry so the queue stays consistent.
 */
export class EditHistory {
    private queue: HistEntry[] = [];
    private index = -1;
    clipboard: PasteClip | null = null;
    pasteTarget: PasteTarget | null = null;

    get canBack(): boolean {
        return this.index >= 0;
    }

    get canForward(): boolean {
        return this.index < this.queue.length - 1;
    }

    push(entry: HistEntry): void {
        if (this.queue.length - 1 > this.index) {
            this.queue.splice(this.index + 1);
        } else if (this.index === HISTORY_CAP - 1) {
            this.queue.shift();
            this.index -= 1;
        }
        this.queue.push(entry);
        this.index = this.queue.length - 1;
    }

    async back(host: LadViewHost): Promise<boolean> {
        if (!this.canBack) {
            return false;
        }
        const entry = this.queue[this.index];
        const result = await applyOp(host, entry.undo);
        syncOppositeIds(entry.do, result);
        this.index -= 1;
        return true;
    }

    async forward(host: LadViewHost): Promise<boolean> {
        if (!this.canForward) {
            return false;
        }
        const entry = this.queue[this.index + 1];
        const result = await applyOp(host, entry.do);
        syncOppositeIds(entry.undo, result);
        this.index += 1;
        return true;
    }
}

export function ensureHistory(host: LadViewHost): EditHistory {
    if (!host.editHistory) {
        host.editHistory = new EditHistory();
    }
    return host.editHistory;
}

export function setPasteTarget(host: LadViewHost, id: string | undefined, direction: PositionDir | undefined): void {
    if (!id || (direction !== 'left' && direction !== 'right')) {
        return;
    }
    ensureHistory(host).pasteTarget = { id, direction };
}

/** Clicked wire: service/delete.deleteLine (opens a parallel with an arrow). */
export async function commitDeleteLine(host: LadViewHost, lineId: string): Promise<boolean> {
    if (!lineId || !host.data.lineMap[lineId]) {
        return false;
    }
    try {
        const { deleteLine } = await import('@/app/lad/service/delete');
        deleteLine(lineId, host as unknown as Lad);
        const view = host.canvasView as { redrawFromHost?: () => void } | undefined;
        view?.redrawFromHost?.();
        return !host.data.lineMap[lineId];
    } catch (err) {
        console.error('[LAD] deleteLine 失败', err);
        return false;
    }
}

export async function commitDelete(host: LadViewHost, ids: string[]): Promise<boolean> {
    const copyIds = onlyElementIds(host.data.linkedList, ids);
    if (!copyIds.length) {
        return false;
    }
    const history = ensureHistory(host);
    const clip = snapshotForRestore(host, copyIds);
    const anchor = findPasteAnchor(host, copyIds);
    const { deleteArr } = await import('@/app/lad/service/delete');
    deleteArr(copyIds, host as unknown as Lad, false);
    if (clip && anchor) {
        history.push({
            do: { name: 'deleteArr', args: [copyIds] },
            undo: { name: 'paste', args: [clip, anchor.id, anchor.direction] },
        });
    }
    return true;
}

export function commitCopy(host: LadViewHost, ids: string[]): boolean {
    const copyIds = onlyElementIds(host.data.linkedList, ids);
    if (!copyIds.length) {
        return false;
    }
    const history = ensureHistory(host);
    const clip = copy(copyIds, host as unknown as Lad);
    if (!clip) {
        return false;
    }
    history.clipboard = clip;
    return true;
}

export async function commitPasteAt(host: LadViewHost, target: PasteTarget, clip?: PasteClip | null): Promise<boolean> {
    const history = ensureHistory(host);
    const payload = clip ?? history.clipboard;
    if (!payload) {
        return false;
    }
    const before = Object.keys(host.data.linkedList);
    paste(deepClone(payload), target.id, target.direction, host as unknown as Lad, false);
    const newIds = elementIdsAdded(host.data, before);
    history.push({
        do: { name: 'paste', args: [deepClone(payload), target.id, target.direction] },
        undo: { name: 'deleteArr', args: [newIds] },
    });
    return newIds.length > 0;
}

export function recordAdd(host: LadViewHost, addObj: unknown, uuid: string): void {
    ensureHistory(host).push({
        do: { name: 'add', args: [deepClone(addObj)] },
        undo: { name: 'deleteArr', args: [[uuid]] },
    });
}

export function recordMove(
    host: LadViewHost,
    oldIds: string[],
    targetId: string,
    direction: 'left' | 'right',
    newIds: string[],
    undoTarget: PasteTarget
): void {
    ensureHistory(host).push({
        do: { name: 'moveElements', args: [oldIds, targetId, direction] },
        undo: { name: 'moveElements', args: [newIds, undoTarget.id, undoTarget.direction] },
    });
}

export function recordConnect(
    host: LadViewHost,
    line: { OBId: string; targetId: string; direction: 'left' | 'right'; pinIndex?: number },
    lineId?: string
): void {
    if (!lineId) {
        return;
    }
    ensureHistory(host).push({
        do: { name: 'connectOB', args: [deepClone(line)] },
        undo: { name: 'deleteLine', args: [lineId] },
    });
}

export function findPasteAnchor(host: LadViewHost, ids: Iterable<string>): PasteTarget | null {
    const skip = new Set(ids);
    const linkedList = host.data.linkedList;
    for (const id of ids) {
        const node = linkedList[id];
        const parent = node?.parent ? linkedList[node.parent] : undefined;
        const children = parent?.children ?? [];
        const index = children.indexOf(id);
        for (let i = index + 1; i < children.length; i++) {
            if (!skip.has(children[i]) && isLadElement(linkedList[children[i]])) {
                return { id: children[i], direction: 'left' };
            }
        }
        for (let i = index - 1; i >= 0; i--) {
            if (!skip.has(children[i]) && isLadElement(linkedList[children[i]])) {
                return { id: children[i], direction: 'right' };
            }
        }
    }
    for (const id of Object.keys(linkedList)) {
        if (!skip.has(id) && isLadElement(linkedList[id])) {
            return { id, direction: 'right' };
        }
    }
    return null;
}

export function findConnectLineId(data: Data, obId: string, targetId: string): string | undefined {
    const map = data.elementToLineMap;
    if (map[obId]?.[targetId]) {
        return map[obId][targetId];
    }
    if (map[targetId]?.[obId]) {
        return map[targetId][obId];
    }
    for (const id of Object.keys(data.lineMap ?? {})) {
        const line = data.lineMap[id] as { left?: string; right?: string };
        if (!line || typeof line !== 'object') {
            continue;
        }
        if ((line.left === obId && line.right === targetId) || (line.left === targetId && line.right === obId)) {
            return id;
        }
    }
    return undefined;
}

export function elementIdsAdded(data: Data, beforeKeys: string[]): string[] {
    const before = new Set(beforeKeys);
    const added: string[] = [];
    for (const id of Object.keys(data.linkedList)) {
        if (!before.has(id) && isLadElement(data.linkedList[id])) {
            added.push(id);
        }
    }
    return added;
}

function snapshotForRestore(host: LadViewHost, ids: string[]): PasteClip | null {
    const viaCopy = copy(ids, host as unknown as Lad);
    if (viaCopy) {
        return viaCopy;
    }
    const linkedList = host.data.linkedList;
    if (ids.length === 1) {
        const key = ids[0];
        const node = linkedList[key];
        if (!node) {
            return null;
        }
        return { node: { [key]: deepClone(node) }, rootId: key };
    }
    const ancestors: StringArr = {};
    for (const id of ids) {
        if (linkedList[id]) {
            ancestors[id] = getAncestorArray(linkedList, id);
        }
    }
    if (!Object.keys(ancestors).length) {
        return null;
    }
    const pub = getPublicNearstTreeNode(ancestors);
    return { node: getNodeFromIds(linkedList, ancestors, pub.index), rootId: pub.rootId };
}

async function applyOp(host: LadViewHost, op: OpCall): Promise<ApplyResult> {
    const lad = host as unknown as Lad;
    switch (op.name) {
        case 'add': {
            const { add } = await import('@/app/lad/service/transformData');
            const uuid = add(op.args[0] as Parameters<typeof add>[0], host.data) as string | null;
            if (!uuid) {
                return {};
            }
            const { updateCanvas } = await import('@/app/lad/service/updateCanvas');
            updateCanvas({ _this: lad });
            return { uuid };
        }
        case 'deleteArr': {
            const { deleteArr } = await import('@/app/lad/service/delete');
            deleteArr(op.args[0] as string[], lad, false);
            return {};
        }
        case 'paste': {
            const before = Object.keys(host.data.linkedList);
            paste(
                deepClone(op.args[0]) as PasteClip,
                op.args[1] as string,
                op.args[2] as 'left' | 'right',
                lad,
                false
            );
            return { newIds: elementIdsAdded(host.data, before) };
        }
        case 'moveElements': {
            const before = Object.keys(host.data.linkedList);
            const { moveElements } = await import('@/app/lad/service/moveElements');
            moveElements(
                op.args[0] as string[],
                lad,
                op.args[1] as string,
                op.args[2] as 'left' | 'right',
                false
            );
            return { newIds: elementIdsAdded(host.data, before) };
        }
        case 'connectOB': {
            const { connectOB, ifCanConnectOB } = await import('@/app/lad/service/transformData');
            const line = op.args[0] as { OBId: string; targetId: string; direction: 'left' | 'right'; pinIndex?: number };
            if (!ifCanConnectOB(line, host.data)) {
                return {};
            }
            if (!connectOB(line, host.data)) {
                return {};
            }
            const { updateCanvas } = await import('@/app/lad/service/updateCanvas');
            updateCanvas({ _this: lad });
            const view = host.canvasView as { redrawFromHost?: () => void } | undefined;
            view?.redrawFromHost?.();
            return { lineId: findConnectLineId(host.data, line.OBId, line.targetId) };
        }
        case 'deleteLine': {
            const { deleteLine } = await import('@/app/lad/service/delete');
            deleteLine(op.args[0] as string, lad);
            return {};
        }
        default:
            return {};
    }
}

function syncOppositeIds(opposite: OpCall, result: ApplyResult): void {
    if (result.uuid && opposite.name === 'deleteArr') {
        opposite.args[0] = [result.uuid];
    }
    if (result.newIds?.length && (opposite.name === 'deleteArr' || opposite.name === 'moveElements')) {
        opposite.args[0] = result.newIds;
    }
    if (result.lineId && opposite.name === 'deleteLine') {
        opposite.args[0] = result.lineId;
    }
}
