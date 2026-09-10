import type { LadRenderer } from '@/app/lad/view/render/renderer';
import type { LadViewHost } from '@/app/lad/view/core/viewHost';
import type { DragLineController } from '@/app/lad/view/interaction/wireDrag';
import type { Editing, FbEditing } from '@/app/lad/view/core/textEditor';
import { PALETTE_MIME, dropEventAttrs, elementMovePreview, palettePreviewAt, ghostGridAtAssist, filterAssistForAdd } from '@/app/lad/view/interaction/dragDrop';
import { idsInMarquee, hitElementByBBox, hitTest, pickAssistNear } from '@/app/lad/view/interaction/hitTest';
import { selectClick, selectMarquee } from '@/app/lad/view/interaction/selection';
import { nextBasicLength, panBy, zoomAtCursor } from '@/app/lad/view/interaction/zoomPan';
import { ASSIST_MAGNET } from '@/app/lad/view/core/config';
import type { MiniRectOpts, PositionDir } from '@/app/lad/view/core/viewHost';

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
    installConnectPoints(excludeIds?: Iterable<string>): void;
    applyNodedrop(
        moveType: 'OUT' | 'IN' | 'LINE',
        payload: { attrs: { id?: string; parentId: string; direction: PositionDir; pinIndex?: number; type?: string } },
        extra: { type?: string; ids?: string[]; OBId?: string }
    ): Promise<void>;
    beginConnectLine(sourceId: string, sourceDir?: PositionDir, sourcePinIndex?: number): Promise<void>;
}

type Gesture =
    | { name: 'idle' }
    | { name: 'pan'; lastX: number; lastY: number; startX: number; startY: number; clickClears: boolean }
    | { name: 'marquee'; x0: number; y0: number; ctrl: boolean }
    | { name: 'move'; ids: string[]; startX: number; startY: number; dragging: boolean }
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
        const onOb = (id?: string) => elementType(view, id) === 'OB';

        // Click inside a non-OB symbol always selects; yellow magnets must not steal this.
        if (boxHit && !onOb(boxHit.id)) {
            selectClick(view.renderer, boxHit.id, e.ctrlKey);
            view.syncSelection();
            view.emit('nodeclick', { attrs: { id: boxHit.id } });
            gesture = { name: 'move', ids: Array.from(view.renderer.overlay.selectedIds), startX: x, startY: y, dragging: false };
            capture(e);
            paint();
            return;
        }

        // Yellow slot / arrow: start a wire; drop calls connectOB
        if (yellow) {
            const id = yellow.parentId || yellow.id;
            startWireFrom(view, id, yellow.direction, yellow.pinIndex);
            gesture = { name: 'wire', startX: x, startY: y };
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
            view.renderer.overlay.hotAssist = resolveAssist(view, x, y);
            canvas.style.cursor = view.renderer.overlay.hotAssist ? 'copy' : 'crosshair';
            paint();
            return;
        }
        if (gesture.name === 'idle') {
            const boxHit = hitElementByBBox(view.renderer.hitTargets, x, y);
            const hit = hitTest(view.ctx, view.renderer.hitTargets, x, y, view.dpr);
            const assist = resolveAssist(view, x, y);
            const hoverId = boxHit?.id ?? (hit?.kind === 'element' || hit?.kind === 'pin' ? hit.id : undefined);
            const nextCursor = assist
                ? 'copy'
                : hit?.kind === 'pin'
                    ? 'crosshair'
                    : boxHit
                        ? 'pointer'
                        : 'grab';
            if (hoverId !== view.renderer.overlay.hoverId || assist !== view.renderer.overlay.hotAssist || canvas.style.cursor !== nextCursor) {
                view.renderer.overlay.hoverId = hoverId;
                view.renderer.overlay.hotAssist = assist;
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
                const ids = idsInMarquee(view.renderer.hitTargets, m.x0, m.y0, m.x1, m.y1);
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
            const ids = gesture.ids;
            const assist = resolveAssist(view, x, y);
            view.renderer.overlay.ghost = undefined;
            view.renderer.overlay.hotAssist = null;
            canvas.style.cursor = 'default';
            gesture = { name: 'idle' };
            if (assist) {
                const payload = dropEventAttrs(assist, view.rootId);
                view.emit('nodedrop', payload, { moveType: 'IN', data: ids });
                void view.applyNodedrop('IN', payload, { ids }).finally(() => {
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
            const assist = resolveAssist(view, x, y);
            const from = view.DragLine.end();
            view.renderer.overlay.wirePoints = undefined;
            view.renderer.overlay.hotAssist = null;
            canvas.style.cursor = 'grab';
            gesture = { name: 'idle' };
            const line = !click && from && assist ? connectLineDrop(view, from.fromId, from.pinSide, from.pinIndex, assist) : null;
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

    canvas.addEventListener('dragleave', () => {
        view.renderer.overlay.ghost = undefined;
        view.renderer.overlay.hotAssist = null;
        view.installConnectPoints();
        paint();
    }, { signal });

    canvas.addEventListener('drop', (e) => {
        e.preventDefault();
        const type = e.dataTransfer?.getData(PALETTE_MIME) || e.dataTransfer?.getData('text/plain') || view.paletteType || 'NO';
        const { x, y } = cssPos(e);
        const assist = resolveAssist(view, x, y);
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
        const hit = hitElementByBBox(view.renderer.hitTargets, x, y)
            ?? hitTest(view.ctx, view.renderer.hitTargets, x, y, view.dpr);
        if (hit?.kind !== 'element' && hit?.kind !== 'pin') {
            return;
        }
        const el = view.renderer.scene.find((s) => s.kind === 'element' && s.id === hit.id);
        if (!el || el.kind !== 'element') {
            return;
        }
        const node = el.treeNode;
        view.openTextEditor(
            {
                id: hit.id,
                instanceName: node.varName ?? '',
                textWidth: 80,
                varAddr: node.varAddr,
                varDesc: node.varDesc,
                varDataType: node.varDataType,
            },
            x,
            Math.max(0, y - 24),
            Math.max(80, (node.width || 1) * view.host.basicLength)
        );
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
        if (e.key === 'Delete' || e.key === 'Backspace') {
            const ids = Array.from(view.renderer.overlay.selectedIds);
            view.emit('nodedelete', ids);
            // TODO: call project API deleteArr(ids, lad, true)
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

function elementType(view: CanvasPointerHost, id?: string): string | undefined {
    if (!id) {
        return undefined;
    }
    return view.host.data.linkedList[id]?.type as string | undefined;
}

function startWireFrom(view: CanvasPointerHost, id: string, dir: PositionDir, pinIndex?: number): void {
    const node = view.host.data.linkedList[id];
    const pinSide: 'left' | 'right' = dir === 'right' ? 'right' : 'left';
    const vx = view.host.viewer[0][0];
    const vy = view.host.viewer[0][1];
    const gx = node
        ? (pinSide === 'left' ? node.location.x : node.location.x + (node.width || 1)) - vx
        : 0;
    const gy = (node?.pinY ?? node?.location.y ?? 0) - vy;
    view.DragLine.begin({
        id,
        pinIndex: pinIndex ?? 0,
        pinSide,
        gridX: gx,
        gridY: gy,
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
    const toId = assist.parentId || assist.id;
    if (!fromId || !toId || fromId === toId) {
        return null;
    }
    const fromType = elementType(view, fromId);
    const toType = elementType(view, toId);
    const slotDir = assist.direction === 'right' ? 'right' : assist.direction === 'left' ? 'left' : null;
    if (fromType === 'OB') {
        if (!slotDir) {
            return null;
        }
        return { OBId: fromId, targetId: toId, direction: slotDir, pinIndex: assist.pinIndex };
    }
    if (toType === 'OB') {
        return { OBId: toId, targetId: fromId, direction: fromSide, pinIndex: fromPinIndex };
    }
    return null;
}
