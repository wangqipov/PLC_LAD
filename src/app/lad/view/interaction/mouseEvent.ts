import type { LadRenderer } from '@/app/lad/view/render/renderer';
import type { LadViewHost } from '@/app/lad/view/core/viewHost';
import type { DragLineController } from '@/app/lad/view/interaction/wireDrag';
import type { Editing, FbEditing } from '@/app/lad/view/core/textEditor';
import { PALETTE_MIME, dropEventAttrs, elementMovePreview, palettePreviewAt, ghostGridAtAssist, filterAssistForAdd, isCoilLike, isLadElement, onlyElementIds } from '@/app/lad/view/interaction/dragDrop';
import { isBoxInstruction, pinLabelRect, varLabelRect } from '@/app/lad/view/render/drawSymbols';
import { elementSlotGrid } from '@/app/lad/stubs/utility';
import { buildAssistPoints, wireDropToConnectArgs } from '@/app/lad/view/interaction/wireDrag';
import { idsInMarquee, hitElementByBBox, hitTest, pickAssistExact, pickAssistNear } from '@/app/lad/view/interaction/hitTest';
import { selectClick, selectMarquee } from '@/app/lad/view/interaction/selection';
import { nextBasicLength, panBy, zoomAtCursor } from '@/app/lad/view/interaction/zoomPan';
import { ASSIST_MAGNET, ASSIST_WIRE_HIT } from '@/app/lad/view/core/config';
import type { HitTarget, MiniRectOpts, PositionDir } from '@/app/lad/view/core/viewHost';

export interface CanvasPointerHost {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    dpr: number;
    host: LadViewHost;
    rootId: string;
    renderer: LadRenderer;
    DragLine: DragLineController;
    paletteType?: string;
    emit(name: string, ...args: unknown[]): void;
    layers: { draw: () => void };
    onVirtualScroll(): void;
    updateScroll(): void;
    openTextEditor(editing: Editing | FbEditing, cssX: number, cssY: number, cssW: number): void;
    syncSelection(): void;
    selectionIds: string[];
    positionList?: MiniRectOpts[];
    installConnectPoints(excludeIds?: Iterable<string>): void;
    applyNodedrop(
        moveType: 'OUT' | 'IN' | 'LINE',
        payload: { attrs: { id?: string; parentId: string; direction: PositionDir; pinIndex?: number; type?: string } },
        extra: { type?: string; ids?: string[]; OBId?: string; copy?: boolean }
    ): Promise<void>;
    beginConnectLine(sourceId: string, sourceDir?: PositionDir, sourcePinIndex?: number): Promise<void>;
    rememberPasteTarget(id?: string, direction?: PositionDir): void;
    applyDelete(ids?: string[]): Promise<void>;
    applyCopy(ids?: string[]): void;
    applyPaste(): Promise<void>;
    applyUndo(): Promise<void>;
    applyRedo(): Promise<void>;
}

type Gesture =
    | { name: 'idle' }
    | { name: 'pan'; lastX: number; lastY: number; startX: number; startY: number; clickClears: boolean }
    | { name: 'marquee'; x0: number; y0: number; ctrl: boolean }
    | { name: 'move'; ids: string[]; startX: number; startY: number; dragging: boolean; copy: boolean }
    | { name: 'wire'; startX: number; startY: number }
    | { name: 'palette' };

/**
 * Canvas pointer / wheel / keyboard.
 * Pan (scroll) with left-drag on empty paper, right-drag, middle-drag, or Space+left-drag.
 * Wheel zooms; Ctrl+left-drag on empty paper marquees; left-drag on a symbol moves it.
 */
export function bindCanvasPointerEvents(view: CanvasPointerHost): () => void {
    const canvas = view.canvas;
    const ac = new AbortController();
    const { signal } = ac;
    let gesture: Gesture = { name: 'idle' };
    let spaceDown = false;
    const paint = () => view.layers.draw();

    const cssPos = (e: { clientX: number; clientY: number }): { x: number; y: number } => {
        const rect = canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const capture = (e: PointerEvent) => {
        try {
            canvas.setPointerCapture(e.pointerId);
        } catch {
            /* Synthetic events may have no active pointer */
        }
    };

    canvas.addEventListener('contextmenu', (e) => e.preventDefault(), { signal });
    canvas.addEventListener('auxclick', (e) => {
        if (e.button === 1) {
            e.preventDefault();
        }
    }, { signal });

    const beginPan = (e: PointerEvent, clickClears = false): void => {
        e.preventDefault();
        gesture = {
            name: 'pan',
            lastX: e.clientX,
            lastY: e.clientY,
            startX: e.clientX,
            startY: e.clientY,
            clickClears,
        };
        capture(e);
        canvas.style.cursor = 'grabbing';
    };

    canvas.addEventListener('pointerdown', (e) => {
        canvas.focus();
        const { x, y } = cssPos(e);
        if (e.button === 1 || e.button === 2 || (e.button === 0 && spaceDown)) {
            beginPan(e);
            return;
        }
        if (e.button !== 0) {
            return;
        }
        const boxHit = hitElementByBBox(view.renderer.hitTargets, x, y);
        const hit = hitTest(view.ctx, view.renderer.hitTargets, x, y, view.dpr);
        const yellow = resolveAssist(view, x, y);
        const yellowWire = resolveWireAssist(view, x, y);
        const onOb = (id?: string) => elementType(view, id) === 'OB';
        const yellowObId = yellowWire
            ? (onOb(yellowWire.parentId || yellowWire.id) ? (yellowWire.parentId || yellowWire.id) : undefined)
            : yellow && onOb(yellow.parentId || yellow.id)
                ? (yellow.parentId || yellow.id)
                : undefined;

        // Yellow square starts a wire and must not start a symbol move.
        if (yellowWire) {
            const slotId = yellowWire.parentId || yellowWire.id;
            if (slotId && isLadElement(view.host.data.linkedList[slotId])) {
                view.rememberPasteTarget(slotId, yellowWire.direction);
                startWireFrom(view, slotId, yellowWire.direction, yellowWire.pinIndex, yellowWire);
                gesture = { name: 'wire', startX: x, startY: y };
                capture(e);
                paint();
                return;
            }
        }

        // Arrow, or magnet-near yellow on empty paper next to an arrow.
        if (yellowObId && !boxHit) {
            const slot = yellow ?? yellowWire;
            startWireFrom(view, yellowObId, slot?.direction ?? 'left', slot?.pinIndex, slot ?? undefined);
            gesture = { name: 'wire', startX: x, startY: y };
            capture(e);
            paint();
            return;
        }

        // FB pin (and contact pin): start a wire; drop still calls connectOB.
        if (
            hit?.kind === 'pin'
            && (hit.pinSide === 'left' || hit.pinSide === 'right')
            && isLadElement(view.host.data.linkedList[hit.id])
        ) {
            startWireFrom(view, hit.id, hit.pinSide, hit.pinIndex);
            gesture = { name: 'wire', startX: x, startY: y };
            capture(e);
            paint();
            return;
        }

        // Click inside a non-OB symbol selects / moves; skip when the pointer is on a yellow slot.
        if (boxHit && !onOb(boxHit.id) && isLadElement(view.host.data.linkedList[boxHit.id])) {
            selectClick(view.renderer, boxHit.id, e.ctrlKey);
            view.syncSelection();
            view.emit('nodeclick', { attrs: { id: boxHit.id } });
            const ids = onlyElementIds(view.host.data.linkedList, view.renderer.overlay.selectedIds);
            if (!ids.length) {
                ids.push(boxHit.id);
            }
            view.rememberPasteTarget(boxHit.id, 'right');
            gesture = { name: 'move', ids, startX: x, startY: y, dragging: false, copy: e.ctrlKey };
            capture(e);
            paint();
            return;
        }

        const obId = onOb(boxHit?.id)
            ? boxHit?.id
            : (hit?.kind === 'element' || hit?.kind === 'pin') && onOb(hit.id)
                ? hit.id
                : undefined;
        if (obId) {
            const pinSide = hit?.kind === 'pin' && hit.pinSide === 'right' ? 'right' : 'left';
            startWireFrom(view, obId, pinSide, hit?.pinIndex);
            gesture = { name: 'wire', startX: x, startY: y };
            capture(e);
            paint();
            return;
        }

        if (hit?.kind === 'wire' && view.host.data.lineMap[hit.id]) {
            selectClick(view.renderer, hit.id, e.ctrlKey);
            view.syncSelection();
            view.emit('lineclick', { attrs: { id: hit.id } });
            gesture = { name: 'idle' };
            paint();
            return;
        }

        if (e.ctrlKey) {
            gesture = { name: 'marquee', x0: x, y0: y, ctrl: true };
            capture(e);
            paint();
            return;
        }
        beginPan(e, true);
        paint();
    }, { signal });

    canvas.addEventListener('pointermove', (e) => {
        const { x, y } = cssPos(e);
        if (gesture.name === 'pan') {
            e.preventDefault();
            panBy(e.clientX - gesture.lastX, e.clientY - gesture.lastY);
            gesture.lastX = e.clientX;
            gesture.lastY = e.clientY;
            view.updateScroll();
            return;
        }
        if (gesture.name === 'marquee') {
            view.renderer.overlay.marquee = { x0: gesture.x0, y0: gesture.y0, x1: x, y1: y };
            paint();
            return;
        }
        if (gesture.name === 'move') {
            if (!gesture.dragging && Math.hypot(x - gesture.startX, y - gesture.startY) < 4) {
                return;
            }
            const moveIds = gesture.ids;
            gesture.dragging = true;
            const first = view.renderer.scene.find((s) => s.kind === 'element' && s.id === moveIds[0]);
            const type = first && first.kind === 'element' ? String(first.treeNode.type ?? 'NO') : 'NO';
            applyAddSlotFilter(view, type, moveIds);
            const assist = resolveAssist(view, x, y);
            view.renderer.overlay.hotAssist = assist;
            if (assist) {
                const g = ghostGridAtAssist(assist, type, view.host.basicLength);
                view.renderer.overlay.ghost = { type, gridX: g.gridX, gridY: g.gridY };
            } else {
                const preview = elementMovePreview(view.host, x, y, moveIds);
                view.renderer.overlay.ghost = { type, gridX: preview.gridX, gridY: preview.gridY };
            }
            canvas.style.cursor = assist ? 'copy' : 'move';
            paint();
            return;
        }
        if (gesture.name === 'wire') {
            view.renderer.overlay.wirePoints = view.DragLine.move(view.host, x, y) ?? undefined;
            view.renderer.overlay.hotAssist = resolveLineAssist(view, x, y);
            canvas.style.cursor = view.renderer.overlay.hotAssist ? 'copy' : 'crosshair';
            paint();
            return;
        }
        if (gesture.name === 'idle') {
            const boxHit = hitElementByBBox(view.renderer.hitTargets, x, y);
            const hit = hitTest(view.ctx, view.renderer.hitTargets, x, y, view.dpr);
            const assist = resolveAssist(view, x, y);
            const wireAssist = resolveWireAssist(view, x, y);
            const hoverId = wireAssist
                ? undefined
                : (boxHit?.id ?? (hit?.kind === 'element' || hit?.kind === 'pin' ? hit.id : undefined));
            if (wireAssist) {
                view.rememberPasteTarget(wireAssist.parentId || wireAssist.id, wireAssist.direction);
            }
            const nextCursor = wireAssist
                ? 'crosshair'
                : elementType(view, hoverId) === 'OB'
                        ? 'crosshair'
                        : !boxHit && assist
                            ? 'copy'
                            : hit?.kind === 'pin'
                                ? 'crosshair'
                                : hit?.kind === 'wire'
                                    ? 'pointer'
                                    : boxHit
                                        ? 'pointer'
                                        : 'grab';
            if (hoverId !== view.renderer.overlay.hoverId || (wireAssist ?? assist) !== view.renderer.overlay.hotAssist || canvas.style.cursor !== nextCursor) {
                view.renderer.overlay.hoverId = hoverId;
                view.renderer.overlay.hotAssist = wireAssist ?? (!boxHit ? assist : null);
                canvas.style.cursor = nextCursor;
                paint();
            }
        }
    }, { signal });

    canvas.addEventListener('pointerup', (e) => {
        const { x, y } = cssPos(e);
        if (gesture.name === 'pan') {
            const click = Math.hypot(e.clientX - gesture.startX, e.clientY - gesture.startY) < 4;
            if (gesture.clickClears && click) {
                clearCanvasSelection(view);
            }
            canvas.style.cursor = 'grab';
            gesture = { name: 'idle' };
            paint();
            return;
        }
        if (gesture.name === 'marquee') {
            const m = view.renderer.overlay.marquee;
            if (m && Math.hypot(m.x1 - m.x0, m.y1 - m.y0) > 4) {
                const ids = onlyElementIds(
                    view.host.data.linkedList,
                    idsInMarquee(view.renderer.hitTargets, m.x0, m.y0, m.x1, m.y1)
                );
                selectMarquee(view.renderer, ids, gesture.ctrl);
                view.syncSelection();
            }
            view.renderer.overlay.marquee = undefined;
            gesture = { name: 'idle' };
            paint();
            return;
        }
        if (gesture.name === 'move') {
            if (!gesture.dragging) {
                gesture = { name: 'idle' };
                return;
            }
            const ids = onlyElementIds(view.host.data.linkedList, gesture.ids);
            const copyDrop = gesture.copy;
            const assist = resolveAssist(view, x, y);
            view.renderer.overlay.ghost = undefined;
            view.renderer.overlay.hotAssist = null;
            canvas.style.cursor = 'default';
            gesture = { name: 'idle' };
            if (assist) {
                const payload = dropEventAttrs(assist, view.rootId);
                view.emit('nodedrop', payload, { moveType: 'IN', data: ids });
                void view.applyNodedrop('IN', payload, { ids, copy: copyDrop }).finally(() => {
                    view.installConnectPoints();
                    paint();
                });
            } else {
                view.installConnectPoints();
                paint();
            }
            return;
        }
        if (gesture.name === 'wire') {
            const click = Math.hypot(x - gesture.startX, y - gesture.startY) < 4;
            const assist = resolveLineAssist(view, x, y);
            const from = view.DragLine.end();
            view.renderer.overlay.wirePoints = undefined;
            view.renderer.overlay.hotAssist = null;
            canvas.style.cursor = 'grab';
            gesture = { name: 'idle' };
            const line = !click && from && assist
                ? connectLineDrop(view, from.fromId, from.fromSide, from.fromPin, assist)
                : null;
            if (click) {
                if (!hitElementByBBox(view.renderer.hitTargets, x, y)) {
                    clearCanvasSelection(view);
                }
                view.installConnectPoints();
                paint();
                return;
            }
            if (line) {
                const payload = {
                    attrs: {
                        id: line.targetId,
                        parentId: line.targetId,
                        direction: line.direction,
                        pinIndex: line.pinIndex,
                    },
                };
                view.emit('nodedrop', payload, { moveType: 'LINE', data: { OBId: line.OBId } });
                void view.applyNodedrop('LINE', payload, { OBId: line.OBId }).finally(() => {
                    view.installConnectPoints();
                    paint();
                });
            } else {
                view.installConnectPoints();
                paint();
            }
            return;
        }
        gesture = { name: 'idle' };
    }, { signal });

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const { x, y } = cssPos(e);
        const next = nextBasicLength(view.host.basicLength, e.deltaY);
        zoomAtCursor(view.host, x, y, next);
        // TODO: call project API setBaseLength(next, lad)
        view.updateScroll();
    }, { signal, passive: false });

    canvas.addEventListener('dragover', (e) => {
        if (!e.dataTransfer?.types.includes(PALETTE_MIME) && !e.dataTransfer?.types.includes('text/plain')) {
            return;
        }
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        const type = view.paletteType || e.dataTransfer.getData(PALETTE_MIME) || e.dataTransfer.getData('text/plain') || 'NO';
        const { x, y } = cssPos(e);
        applyAddSlotFilter(view, type);
        const assist = resolveAssist(view, x, y);
        view.renderer.overlay.hotAssist = assist;
        if (assist) {
            const g = ghostGridAtAssist(assist, type, view.host.basicLength);
            view.renderer.overlay.ghost = { type, gridX: g.gridX, gridY: g.gridY };
        } else {
            const preview = palettePreviewAt(view.host, x, y, type);
            view.renderer.overlay.ghost = { type: preview.type, gridX: preview.gridX, gridY: preview.gridY };
        }
        paint();
    }, { signal });

    canvas.addEventListener('dragleave', (e) => {
        const next = e.relatedTarget as Node | null;
        if (next && (next === canvas || canvas.contains(next))) {
            return;
        }
        view.renderer.overlay.ghost = undefined;
        view.renderer.overlay.hotAssist = null;
        view.installConnectPoints();
        paint();
    }, { signal });

    canvas.addEventListener('drop', (e) => {
        e.preventDefault();
        const type = e.dataTransfer?.getData(PALETTE_MIME) || e.dataTransfer?.getData('text/plain') || view.paletteType || 'NO';
        const { x, y } = cssPos(e);
        applyAddSlotFilter(view, type);
        const assist = resolveAssist(view, x, y) ?? view.renderer.overlay.hotAssist;
        const payload = dropEventAttrs(assist, view.rootId);
        (payload.attrs as { type?: string }).type = type;
        view.emit('nodedrop', payload, { moveType: 'OUT', data: { type } });
        view.renderer.overlay.ghost = undefined;
        view.renderer.overlay.hotAssist = null;
        if (assist) {
            void view.applyNodedrop('OUT', payload, { type }).finally(() => {
                view.installConnectPoints();
                paint();
            });
        } else {
            view.installConnectPoints();
            paint();
        }
    }, { signal });

    canvas.addEventListener('dblclick', (e) => {
        const { x, y } = cssPos(e);
        const hit = hitTest(view.ctx, view.renderer.hitTargets, x, y, view.dpr)
            ?? hitElementByBBox(view.renderer.hitTargets, x, y);
        if (hit?.kind !== 'element' && hit?.kind !== 'pin' && hit?.kind !== 'pinLabel') {
            return;
        }
        beginNameEdit(view, hit);
    }, { signal });

    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !isTextInputTarget(e.target)) {
            e.preventDefault();
            if (!spaceDown) {
                spaceDown = true;
                if (gesture.name === 'idle') {
                    canvas.style.cursor = 'grab';
                }
            }
            return;
        }
        if (e.key === 'Escape') {
            view.renderer.overlay.marquee = undefined;
            view.renderer.overlay.ghost = undefined;
            view.renderer.overlay.wirePoints = undefined;
            view.renderer.overlay.hotAssist = null;
            view.installConnectPoints();
            view.DragLine.end();
            gesture = { name: 'idle' };
            canvas.style.cursor = 'grab';
            paint();
        }
        if (isTextInputTarget(e.target)) {
            return;
        }
        const ctrl = e.ctrlKey || e.metaKey;
        if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            void view.applyDelete();
            return;
        }
        if (ctrl && (e.key === 'c' || e.key === 'C')) {
            e.preventDefault();
            view.applyCopy();
            return;
        }
        if (ctrl && (e.key === 'x' || e.key === 'X')) {
            e.preventDefault();
            view.applyCopy();
            void view.applyDelete();
            return;
        }
        if (ctrl && (e.key === 'v' || e.key === 'V')) {
            e.preventDefault();
            void view.applyPaste();
            return;
        }
        if (ctrl && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
            e.preventDefault();
            void view.applyUndo();
            return;
        }
        if (ctrl && (e.key === 'y' || e.key === 'Y' || ((e.key === 'z' || e.key === 'Z') && e.shiftKey))) {
            e.preventDefault();
            void view.applyRedo();
        }
    }, { signal });

    window.addEventListener('keyup', (e) => {
        if (e.code !== 'Space') {
            return;
        }
        spaceDown = false;
        if (gesture.name === 'idle') {
            canvas.style.cursor = 'grab';
        }
    }, { signal });

    return () => ac.abort();
}

function clearCanvasSelection(view: CanvasPointerHost): void {
    selectClick(view.renderer, undefined, false);
    view.syncSelection();
}

function isTextInputTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}

function applyAddSlotFilter(view: CanvasPointerHost, type: string, excludeIds?: Iterable<string>): void {
    const addType = type === 'COIL' ? 'Coil' : type;
    // addCheck only allows OB with direction === 'down' (parallel branch)
    if (addType === 'OB') {
        const downs = buildAssistPoints(view.host, ['down'], excludeIds).down;
        view.renderer.overlay.assistPoints = downs;
        view.positionList = downs;
        return;
    }
    view.installConnectPoints(excludeIds);
    const filtered = filterAssistForAdd(view.host, view.renderer.overlay.assistPoints, type);
    view.renderer.overlay.assistPoints = filtered;
    view.positionList = filtered;
}

function magnetPx(host: LadViewHost): number {
    return ASSIST_MAGNET * host.basicLength;
}

function resolveAssist(view: CanvasPointerHost, x: number, y: number): MiniRectOpts | null {
    return pickAssistNear(view.renderer.overlay.assistPoints, x, y, magnetPx(view.host));
}

function resolveWireAssist(view: CanvasPointerHost, x: number, y: number): MiniRectOpts | null {
    return pickAssistExact(view.renderer.overlay.assistPoints, x, y, ASSIST_WIRE_HIT * view.host.basicLength);
}

/** FB pins are 0.6 grid apart; prefer the exact pin, then the wider magnet for sparse contact yellows. */
function resolveLineAssist(view: CanvasPointerHost, x: number, y: number): MiniRectOpts | null {
    return resolveWireAssist(view, x, y) ?? resolveAssist(view, x, y);
}

function elementType(view: CanvasPointerHost, id?: string): string | undefined {
    if (!id) {
        return undefined;
    }
    return view.host.data.linkedList[id]?.type as string | undefined;
}

function beginNameEdit(view: CanvasPointerHost, hit: HitTarget): void {
    const el = view.renderer.scene.find((s) => s.kind === 'element' && s.id === hit.id);
    if (!el || el.kind !== 'element') {
        return;
    }
    const node = el.treeNode;
    if (node.type === 'OB' || node.type === 'END') {
        return;
    }
    const bl = view.host.basicLength;
    const fontSize = view.host.fontSize;
    const mh = view.host.margin_horizontal ?? 2;
    const pinSide = hit.pinSide;
    const pinIndex = hit.pinIndex;
    const editPin = (hit.kind === 'pinLabel' || (hit.kind === 'pin' && isBoxInstruction(node.type as string)))
        && (pinSide === 'left' || pinSide === 'right')
        && pinIndex !== undefined;
    if (editPin) {
        const pin = (pinSide === 'left' ? node.left : node.right)?.[pinIndex];
        if (!pin) {
            return;
        }
        const box = pinLabelRect(node, pin, pinSide, bl, fontSize, mh);
        const editing: FbEditing = {
            id: hit.id,
            instanceName: pin.varName ?? '',
            textWidth: box.w,
            dir: pinSide,
            pinIndex,
            varAddr: pin.varAddr,
            varDesc: pin.varDesc,
            varDataType: pin.varDataType,
            pouName: pin.pouName,
            absoluteWidth: box.w,
        };
        view.openTextEditor(editing, box.x, Math.max(0, box.y), Math.max(72, box.w));
        return;
    }
    const box = varLabelRect(node, bl, fontSize, mh);
    const slotPx = elementSlotGrid(node.width || 1, mh) * bl;
    const editing: Editing = {
        id: hit.id,
        instanceName: node.varName ?? '',
        textWidth: box.w,
        varAddr: node.varAddr,
        varDesc: node.varDesc,
        varDataType: node.varDataType,
        eleType: isBoxInstruction(node.type as string) ? 'FB_INS_NAME' : undefined,
        absoluteWidth: slotPx,
    };
    view.openTextEditor(editing, box.x, Math.max(0, box.y), Math.max(80, box.w));
}

function startWireFrom(
    view: CanvasPointerHost,
    id: string,
    dir: PositionDir,
    pinIndex?: number,
    assist?: MiniRectOpts
): void {
    const node = view.host.data.linkedList[id];
    if (!isLadElement(node) || (dir !== 'left' && dir !== 'right')) {
        return;
    }
    if (dir === 'right' && isCoilLike(node.type as string)) {
        return;
    }
    const pinSide: 'left' | 'right' = dir === 'right' ? 'right' : 'left';
    const bl = view.host.basicLength;
    let gx: number;
    let gy: number;
    if (assist) {
        gx = (assist.x + assist.width / 2) / bl;
        gy = (assist.y + assist.height / 2) / bl;
    } else {
        const vx = view.host.viewer[0][0];
        const vy = view.host.viewer[0][1];
        gx = node
            ? (pinSide === 'left' ? node.location.x : node.location.x + (node.width || 1)) - vx
            : 0;
        gy = (node?.pinY ?? node?.location.y ?? 0) - vy;
    }
    view.DragLine.begin({
        id,
        pinIndex: pinIndex ?? 0,
        pinSide,
        gridX: gx,
        gridY: gy,
        type: String(node.type ?? ''),
    });
    view.emit('beforedragLine', id);
    if (view.host.invokeCoreOnDrop) {
        void view.beginConnectLine(id, pinSide, pinIndex);
    }
}

function connectLineDrop(
    view: CanvasPointerHost,
    fromId: string,
    fromSide: 'left' | 'right',
    fromPinIndex: number,
    assist: MiniRectOpts
): { OBId: string; targetId: string; direction: 'left' | 'right'; pinIndex?: number } | null {
    return wireDropToConnectArgs(view.host.data.linkedList, fromId, fromSide, fromPinIndex, assist);
}
