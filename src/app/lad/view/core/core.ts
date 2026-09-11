import type { TreeNode } from '@/app/lad/class/index';
import { calculateViewer } from '@/app/lad/service/calculateViewer';
import { updateScroll as applyLadUpdateScroll } from '@/app/lad/service/updateScroll';
import { ViewEventBus } from '@/app/lad/view/actionComponent/eventBus';
import type { Editing, FbEditing } from '@/app/lad/view/core/textEditor';
import type {
    DrawElementOpts,
    DrawLineOpts,
    LadViewHost,
    MiniRectOpts,
    PinViewerRange,
    PositionDir,
} from '@/app/lad/view/core/viewHost';
import { bindCanvasPointerEvents } from '@/app/lad/view/interaction/mouseEvent';
import {
    commitCopy,
    commitDelete,
    commitDeleteLine,
    commitPasteAt,
    ensureHistory,
    setPasteTarget,
} from '@/app/lad/view/interaction/editHistory';
import { selectedNodeById } from '@/app/lad/view/interaction/selection';
import { buildAssistPoints, DragLineController, filterLineAssists, visibleConnectPoints } from '@/app/lad/view/interaction/wireDrag';
import { getCenterView, scrollNodeIntoView } from '@/app/lad/view/interaction/zoomPan';
import { LadRenderer } from '@/app/lad/view/render/renderer';

/**
 * LAD canvas view. Native Canvas, API aligned with the original Konva CanvasView,
 * called directly by updateViewer / ladEvent / cleanViewer / destoryLad.
 */
export class CanvasView {
    viewerDom: HTMLElement;
    rootId: string;
    hostInstance: LadViewHost;
    host: LadViewHost;
    width: number | undefined;
    height: number | undefined;
    background = false;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    dpr = 1;
    renderer = new LadRenderer();
    selectionIds: string[] = [];
    DragLine = new DragLineController();
    paletteType?: string;
    layers: { draw: () => void };
    stage: { destroy: () => void; toDataURL: () => string };
    positionList: MiniRectOpts[] = [];

    private bus = new ViewEventBus();
    private unbind: (() => void) | null = null;
    private editorEl: HTMLInputElement | null = null;
    private resizeObs: ResizeObserver | null = null;
    private centerView: HTMLElement | null = null;
    private onCenterScroll = (): void => {
        this.updateScroll();
    };

    constructor(viewerDom: HTMLElement, rootId: string, hostInstance: unknown) {
        this.viewerDom = viewerDom;
        this.rootId = rootId;
        this.host = hostInstance as LadViewHost;
        this.hostInstance = this.host;
        ensureHistory(this.host);
        this.canvas = document.createElement('canvas');
        this.canvas.tabIndex = 0;
        this.canvas.style.display = 'block';
        this.canvas.style.outline = 'none';
        this.canvas.style.touchAction = 'none';
        this.canvas.style.cursor = 'grab';
        this.canvas.style.userSelect = 'none';
        const ctx = this.canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Canvas 2D context 不可用');
        }
        this.ctx = ctx;
        this.layers = { draw: () => this.paint() };
        this.stage = {
            destroy: () => this.dispose(),
            toDataURL: () => this.canvas.toDataURL(),
        };
        this.init();
    }

    on(name: string, handler: (...args: unknown[]) => void): void {
        this.bus.on(name, handler);
    }

    emit(name: string, ...args: unknown[]): void {
        this.bus.emit(name, ...args);
    }

    private init(): void {
        this.viewerDom.innerHTML = '';
        this.viewerDom.appendChild(this.canvas);
        this.host.canvas = this.canvas;
        this.host.ctx = this.ctx;
        this.host.canvasView = this;
        this.syncCanvasSize(this.host.width || this.viewerDom.clientWidth || 800, this.host.height || this.viewerDom.clientHeight || 480);
        this.unbind = bindCanvasPointerEvents(this);
        this.centerView = getCenterView();
        this.centerView?.addEventListener('scroll', this.onCenterScroll);
        this.resizeObs = new ResizeObserver(() => {
            this.updateScroll();
        });
        if (this.centerView) {
            this.resizeObs.observe(this.centerView);
        } else {
            this.resizeObs.observe(this.viewerDom);
        }
        this.updateScroll();
        requestAnimationFrame(() => this.updateScroll());
    }

    updateBackgroundAndWH(param: { width: number; height: number; background: boolean }): void {
        this.width = Math.max(1, param.width);
        this.height = Math.max(1, param.height);
        this.background = param.background;
        this.syncCanvasSize(this.width, this.height);
    }

    private syncCanvasSize(cssW: number, cssH: number): void {
        const w = Math.max(1, Math.floor(cssW));
        const h = Math.max(1, Math.floor(cssH));
        this.dpr = window.devicePixelRatio || 1;
        this.canvas.style.width = `${w}px`;
        this.canvas.style.height = `${h}px`;
        this.canvas.width = Math.floor(w * this.dpr);
        this.canvas.height = Math.floor(h * this.dpr);
        this.host.width = w;
        this.host.height = h;
    }

    /**
     * After page scroll / zoom, must go through the host:
     * updateScroll → calculateViewer (viewer size + margin) + updateViewer(isScroll)
     */
    updateScroll(): void {
        try {
            applyLadUpdateScroll(this.host as never);
        } catch (err) {
            console.error('[LAD] updateScroll 失败', err);
            try {
                calculateViewer(this.host as never);
            } catch (e2) {
                console.error('[LAD] calculateViewer 失败', e2);
            }
            this.renderer.rebuildFromHost(this.host);
        }
        this.refreshConnectPoints();
        this.paint();
    }

    /** Legacy alias; still calls updateScroll */
    onVirtualScroll(): void {
        this.updateScroll();
    }

    redrawFromHost(): void {
        this.renderer.rebuildFromHost(this.host);
        this.refreshConnectPoints();
        this.paint();
    }

    /** Keep LINE-filtered yellows while dragging a wire; otherwise show all slots */
    private refreshConnectPoints(): void {
        if (this.DragLine.active) {
            const src = this.DragLine.getSource();
            if (src) {
                void this.beginConnectLine(src.id, src.pinSide, src.pinIndex);
                return;
            }
        }
        this.installConnectPoints();
    }

    paint(): void {
        if (this.renderer.isEmpty() && this.host.data.linkedList) {
            this.renderer.rebuildFromHost(this.host);
        }
        const cssW = this.canvas.clientWidth || this.host.width || 1;
        const cssH = this.canvas.clientHeight || this.host.height || 1;
        this.renderer.paint(this.ctx, cssW, cssH, this.host, this.selectionIds);
    }

    drawLine(opts: DrawLineOpts): void {
        this.renderer.pushLine(opts);
    }

    drawElement(opts: DrawElementOpts): void {
        this.renderer.pushElement(opts);
    }

    continuousPolyline(points: [number, number][], basicLength: number, _layerName?: string): void {
        this.renderer.pushPolyline(points, basicLength, 'monitor');
        void _layerName;
    }

    removeMainView(): void {
        this.renderer.clearMain();
        this.renderer.hitTargets = [];
    }

    removeMonitorView(): void {
        this.renderer.clearMonitor();
    }

    destoryPositionList(): void {
        this.positionList = [];
        this.renderer.overlay.assistPoints = [];
        this.renderer.overlay.hotAssist = null;
    }

    /** Left/right connection slots of visible elements, used as add/move drop targets */
    installConnectPoints(excludeIds?: Iterable<string>): void {
        this.renderer.overlay.assistPoints = visibleConnectPoints(this.host, excludeIds);
        this.positionList = this.renderer.overlay.assistPoints;
    }

    async applyNodedrop(
        moveType: 'OUT' | 'IN' | 'LINE',
        payload: { attrs: { id?: string; parentId: string; direction: PositionDir; pinIndex?: number; type?: string } },
        extra: { type?: string; ids?: string[]; OBId?: string; copy?: boolean }
    ): Promise<void> {
        if (!this.host.invokeCoreOnDrop) {
            return;
        }
        try {
            const { commitElementMove, commitElementCopy, commitPaletteAdd, commitConnectLine } = await import('@/app/lad/view/interaction/commitDrop');
            if (moveType === 'OUT') {
                const type = extra.type ?? payload.attrs.type ?? 'NO';
                const uuid = await commitPaletteAdd(this.host, payload.attrs, type);
                if (uuid) {
                    scrollNodeIntoView(this.host, uuid);
                    selectedNodeById(this.renderer, uuid, false);
                    this.syncSelection();
                }
            } else if (moveType === 'LINE') {
                const line = resolveConnectLine(payload.attrs, extra.OBId);
                if (line) {
                    await commitConnectLine(this.host, line);
                }
            } else if (extra.ids?.length) {
                if (extra.copy) {
                    await commitElementCopy(this.host, extra.ids, payload.attrs);
                } else {
                    await commitElementMove(this.host, extra.ids, payload.attrs);
                }
            }
        } catch (err) {
            console.error('[LAD] 落点核心算法失败', err);
        }
        this.installConnectPoints();
        this.paint();
    }

    /**
     * Wire from a yellow slot: keep only slots where ifCanConnectOB is true.
     * Source may be the arrow or a contact/coil/box yellow; drop still calls connectOB.
     * Matches ladEvent beforedragLine → showAssistPoint.
     */
    async beginConnectLine(sourceId: string, sourceDir?: PositionDir, sourcePinIndex?: number): Promise<void> {
        const source = this.host.data.linkedList[sourceId];
        if (!source || source.blockType !== 'element') {
            return;
        }
        const sourceSide: 'left' | 'right' = sourceDir === 'right' ? 'right' : 'left';
        const dirs: PositionDir[] = ['left', 'right'];
        try {
            const { ifCanConnectOB } = await import('@/app/lad/service/transformData');
            this.showAssistPoint('LINE', source.type === 'OB' ? 'OB' : 'TARGET', sourceId, dirs, (oSetData) =>
                filterLineAssists(
                    this.host.data.linkedList,
                    sourceId,
                    sourceSide,
                    sourcePinIndex,
                    oSetData,
                    (obj) => ifCanConnectOB(obj, this.host.data)
                )
            );
        } catch (err) {
            console.error('[LAD] ifCanConnectOB 失败', err);
        }
    }

    initCanvasViewData(_isScroll?: boolean): void {
        if (!_isScroll) {
            this.renderer.overlay.ghost = undefined;
            this.renderer.overlay.wirePoints = undefined;
            this.renderer.overlay.marquee = undefined;
        }
    }

    selectedNodeById(id: string | string[], keep = true): void {
        selectedNodeById(this.renderer, id, keep);
        this.syncSelection();
        this.paint();
    }

    syncSelection(): void {
        this.selectionIds = Array.from(this.renderer.overlay.selectedIds);
        this.renderer.overlay.selectedIds = new Set(this.selectionIds);
    }

    rememberPasteTarget(id?: string, direction?: PositionDir): void {
        setPasteTarget(this.host, id, direction);
    }

    async applyDelete(ids?: string[]): Promise<void> {
        const lineIds = selectedLineIds(this);
        const list = ids ?? onlySelected(this);
        if (!lineIds.length && !list.length) {
            return;
        }
        if (lineIds.length) {
            this.emit('linedelete', lineIds);
            if (this.host.invokeCoreOnDrop) {
                await commitDeleteLine(this.host, lineIds[0]);
            }
        }
        if (list.length) {
            this.emit('nodedelete', list);
            if (this.host.invokeCoreOnDrop) {
                await commitDelete(this.host, list);
            }
        }
        if (!this.host.invokeCoreOnDrop) {
            return;
        }
        this.renderer.overlay.selectedIds.clear();
        this.syncSelection();
        this.installConnectPoints();
        this.redrawFromHost();
    }

    applyCopy(ids?: string[]): void {
        const list = ids ?? onlySelected(this);
        if (!list.length) {
            return;
        }
        this.emit('nodecopy', list);
        if (!this.host.invokeCoreOnDrop) {
            return;
        }
        commitCopy(this.host, list);
    }

    async applyPaste(): Promise<void> {
        const history = ensureHistory(this.host);
        const target = history.pasteTarget
            ?? firstSelectedTarget(this);
        if (!target || !history.clipboard) {
            return;
        }
        this.emit('nodepaste', target);
        if (!this.host.invokeCoreOnDrop) {
            return;
        }
        const ok = await commitPasteAt(this.host, target);
        if (ok) {
            this.installConnectPoints();
            this.redrawFromHost();
        }
    }

    async applyUndo(): Promise<void> {
        this.emit('undo');
        if (!this.host.invokeCoreOnDrop) {
            return;
        }
        const history = ensureHistory(this.host);
        if (await history.back(this.host)) {
            this.renderer.overlay.selectedIds.clear();
            this.syncSelection();
            this.installConnectPoints();
            this.redrawFromHost();
        }
    }

    async applyRedo(): Promise<void> {
        this.emit('redo');
        if (!this.host.invokeCoreOnDrop) {
            return;
        }
        const history = ensureHistory(this.host);
        if (await history.forward(this.host)) {
            this.renderer.overlay.selectedIds.clear();
            this.syncSelection();
            this.installConnectPoints();
            this.redrawFromHost();
        }
    }

    showAssistPoint(
        _moveType: 'LINE' | 'OUT' | 'IN',
        _filterType: string,
        sourceId: string,
        dirs: PositionDir[],
        filter: (oSetData: Record<PositionDir, MiniRectOpts[]>) => MiniRectOpts[]
    ): void {
        const grouped = buildAssistPoints(this.host, dirs);
        const filtered = filter(grouped);
        this.renderer.overlay.assistPoints = _moveType === 'LINE'
            ? filtered
            : (filtered.length
                ? filtered
                : [...grouped.left, ...grouped.right, ...grouped.up, ...grouped.down].filter((p) => p.parentId !== sourceId));
        this.positionList = this.renderer.overlay.assistPoints;
        this.paint();
        void _filterType;
    }

    destoryTextEditor(): void {
        if (this.editorEl) {
            this.editorEl.remove();
            this.editorEl = null;
        }
    }

    openTextEditor(editing: Editing | FbEditing, cssX: number, cssY: number, cssW: number): void {
        this.destoryTextEditor();
        const input = document.createElement('input');
        input.value = editing.instanceName ?? '';
        input.style.cssText = `position:absolute;left:${cssX}px;top:${cssY}px;width:${cssW}px;height:22px;font-size:${this.host.fontSize}px;border:1px solid #00a2e8;padding:0 4px;z-index:5;`;
        this.viewerDom.style.position = 'relative';
        this.viewerDom.appendChild(input);
        input.focus();
        input.addEventListener('blur', () => {
            editing.instanceName = input.value;
            editing.textWidth = this.ctx.measureText(input.value).width;
            this.emit('onBlur', editing);
            this.destoryTextEditor();
        });
        this.editorEl = input;
    }

    dispose(): void {
        this.unbind?.();
        this.unbind = null;
        this.resizeObs?.disconnect();
        this.centerView?.removeEventListener('scroll', this.onCenterScroll);
        this.centerView = null;
        this.destoryTextEditor();
        this.bus.clear();
        this.canvas.remove();
    }
}

function selectedLineIds(view: CanvasView): string[] {
    return Array.from(view.renderer.overlay.selectedIds).filter((id) => !!view.host.data.lineMap[id]);
}

function onlySelected(view: CanvasView): string[] {
    return Array.from(view.renderer.overlay.selectedIds).filter((id) => {
        const node = view.host.data.linkedList[id];
        return !!node && node.blockType === 'element' && node.type !== 'END';
    });
}

function firstSelectedTarget(view: CanvasView): { id: string; direction: 'left' | 'right' } | null {
    const id = onlySelected(view)[0];
    if (!id) {
        return null;
    }
    const type = view.host.data.linkedList[id]?.type;
    return { id, direction: type === 'OB' || type === 'Coil' ? 'left' : 'right' };
}

function resolveConnectLine(
    attrs: { id?: string; parentId: string; direction: PositionDir; pinIndex?: number },
    obId?: string
): { OBId: string; targetId: string; direction: 'left' | 'right'; pinIndex?: number } | null {
    const targetId = attrs.id || attrs.parentId;
    if (!obId || !targetId || obId === targetId) {
        return null;
    }
    if (attrs.direction !== 'left' && attrs.direction !== 'right') {
        return null;
    }
    return {
        OBId: obId,
        targetId,
        direction: attrs.direction,
        pinIndex: attrs.pinIndex,
    };
}

export type { PinViewerRange, TreeNode };
