import type { LineLocation, LM, TreeNode, VirtualDomX, VD } from '@/app/lad/class/index';
import { TiaTheme } from '@/app/lad/view/core/config';
import { elementBBox, elementBodyPath, pinPath, wireSegmentPath } from '@/app/lad/view/core/hitPath';
import type {
    DrawElementOpts,
    DrawLineOpts,
    HitTarget,
    LadViewHost,
    SceneElement,
    SceneItem,
    SceneLine,
    ScenePolyline,
} from '@/app/lad/view/core/viewHost';
import { boxPinY, isBoxInstruction, paintElement, paintLine, paintPolyline, wirePinX } from '@/app/lad/view/render/drawSymbols';
import {
    paintAssistRect,
    paintGhost,
    paintMarquee,
    paintSelectionFrame,
    paintWirePreview,
    type PreviewGhost,
} from '@/app/lad/view/render/drawPreview';
import type { MiniRectOpts } from '@/app/lad/view/core/viewHost';

export interface OverlayState {
    selectedIds: Set<string>;
    hoverId?: string;
    marquee?: { x0: number; y0: number; x1: number; y1: number };
    ghost?: PreviewGhost;
    wirePoints?: [number, number][];
    assistPoints: MiniRectOpts[];
    hotAssist?: MiniRectOpts | null;
}

/**
 * Scene buffer + paint.
 * updateViewer pushes via drawLine/drawElement;
 * demo/scroll uses rebuildFromHost and only consumes visible virtualDom cells.
 */
export class LadRenderer {
    scene: SceneItem[] = [];
    hitTargets: HitTarget[] = [];
    overlay: OverlayState = {
        selectedIds: new Set(),
        assistPoints: [],
    };

    clearMain(): void {
        this.scene = this.scene.filter((item) => item.kind === 'polyline' && item.layer === 'monitor');
    }

    clearMonitor(): void {
        this.scene = this.scene.filter((item) => !(item.kind === 'polyline' && item.layer === 'monitor'));
    }

    clearAll(): void {
        this.scene = [];
        this.hitTargets = [];
    }

    isEmpty(): boolean {
        return this.scene.length === 0;
    }

    pushLine(opts: DrawLineOpts): void {
        const item: SceneLine = {
            kind: 'line',
            id: opts.id,
            location: opts.location,
            basicLength: opts.basicLength,
            color: opts.color,
        };
        this.scene.push(item);
    }

    pushElement(opts: DrawElementOpts): void {
        const item: SceneElement = {
            kind: 'element',
            id: opts.id,
            treeNode: opts.treeNode,
            basicLength: opts.basicLength,
            textOpts: opts.textOpts,
            pinInviewer: opts.pinInviewer,
        };
        this.scene.push(item);
    }

    pushPolyline(points: [number, number][], basicLength: number, layer: 'main' | 'monitor' = 'monitor'): void {
        const item: ScenePolyline = { kind: 'polyline', points, basicLength, layer };
        this.scene.push(item);
    }

    /**
     * Collect visible elements/lines from host virtualDom into host.viewElement.
     * Same algorithm as getViewElement: read the spatial index only, do not recompute coordinates.
     * TODO: call project API getViewElement(_this)
     */
    collectVisible(host: LadViewHost): void {
        const viewElement: string[] = [];
        const viewLine: string[] = [];
        const viewBlueLine: string[] = [];
        const rightBottomY = host.viewer[1][1];
        const rightBottomX = host.viewer[1][0];
        const leftTopYInt = Math.floor(host.viewer[0][1]);
        const leftTopXInt = Math.floor(host.viewer[0][0]);

        for (let i = leftTopYInt; i < rightBottomY; i++) {
            const row: VirtualDomX | undefined = host.data.virtualDom[i];
            if (!row) {
                continue;
            }
            for (let j = leftTopXInt; j < rightBottomX; j++) {
                const cell: VD | undefined = row[j];
                if (!cell) {
                    continue;
                }
                if (cell.items) {
                    for (const id of cell.items) {
                        if (viewElement.indexOf(id) === -1) {
                            viewElement.push(id);
                        }
                    }
                }
                if (cell.lines) {
                    for (const id of cell.lines) {
                        if (viewLine.indexOf(id) === -1) {
                            viewLine.push(id);
                        }
                    }
                }
                if (cell.bluelines) {
                    for (const id of cell.bluelines) {
                        if (viewBlueLine.indexOf(id) === -1) {
                            viewBlueLine.push(id);
                        }
                    }
                }
            }
        }
        host.viewElement = viewElement;
        host.viewLine = viewLine;
        host.viewBlueLine = viewBlueLine;
    }

    /**
     * Push linkedList / lineMap into the scene from the visible arrays (coordinates minus viewer origin).
     * Matches drawViewer; does not mutate linkedList objects.
     */
    rebuildFromHost(host: LadViewHost): void {
        this.clearAll();
        this.collectVisible(host);
        const leftTopX = host.viewer[0][0];
        const leftTopY = host.viewer[0][1];
        const { linkedList, lineMap } = host.data;

        for (const lineId of host.viewLine) {
            const lm = lineMap[lineId] as unknown as LM | undefined;
            if (!lm?.location) {
                continue;
            }
            const location: LineLocation = {
                start: { x: lm.location.start.x - leftTopX, y: lm.location.start.y - leftTopY },
                end: { x: lm.location.end.x - leftTopX, y: lm.location.end.y - leftTopY },
            };
            this.pushLine({ location, basicLength: host.basicLength, id: lineId });
        }

        for (const id of host.viewElement) {
            const src = linkedList[id];
            if (!src || src.type === 'END') {
                continue;
            }
            const treeNode: TreeNode = {
                ...src,
                location: { x: src.location.x - leftTopX, y: src.location.y - leftTopY },
                pinY: src.pinY !== undefined ? src.pinY - leftTopY : src.pinY,
                left: src.left?.map((p) => ({ ...p, pinY: (p.pinY ?? 0) - leftTopY })),
                right: src.right?.map((p) => ({ ...p, pinY: (p.pinY ?? 0) - leftTopY })),
            };
            this.pushElement({
                treeNode,
                basicLength: host.basicLength,
                textOpts: { fontSize: host.fontSize, lineHeight: host.lineHeight },
                id,
                heightV: host.data.heightV,
            });
        }
    }

    rebuildHitTargets(basicLength = 30): void {
        void basicLength;
        this.hitTargets = [];
        for (const item of this.scene) {
            if (item.kind === 'line') {
                this.hitTargets.push({
                    kind: 'wire',
                    id: item.id,
                    path: wireSegmentPath(item.location, item.basicLength),
                });
            } else if (item.kind === 'element') {
                const { treeNode, basicLength: bl, id } = item;
                this.hitTargets.push({
                    kind: 'element',
                    id,
                    path: elementBodyPath(treeNode, bl),
                    bbox: elementBBox(treeNode, bl),
                });
                this.pushPinHits(id, treeNode, bl);
            }
        }
        for (const assist of this.overlay.assistPoints) {
            const path = new Path2D();
            path.rect(assist.x, assist.y, assist.width, assist.height);
            this.hitTargets.push({
                kind: 'assist',
                id: assist.id || assist.parentId,
                parentId: assist.parentId || assist.id,
                direction: assist.direction,
                pinIndex: assist.pinIndex,
                path,
            });
        }
    }

    private pushPinHits(id: string, treeNode: TreeNode, basicLength: number): void {
        const py = (treeNode.pinY ?? treeNode.location.y + (treeNode.pinOffsetY ?? 0.4)) * basicLength;
        const x = wirePinX(treeNode, 'left') * basicLength;
        const w = (wirePinX(treeNode, 'right') - wirePinX(treeNode, 'left')) * basicLength;
        if (isBoxInstruction(treeNode.type as string)) {
            const left = treeNode.left ?? [];
            left.forEach((pin, index) => {
                const cy = boxPinY(treeNode, pin) * basicLength;
                this.hitTargets.push({
                    kind: 'pin',
                    id,
                    pinIndex: index,
                    pinSide: 'left',
                    path: pinPath(x, cy),
                });
            });
            const right = treeNode.right ?? [];
            right.forEach((pin, index) => {
                const cy = boxPinY(treeNode, pin) * basicLength;
                this.hitTargets.push({
                    kind: 'pin',
                    id,
                    pinIndex: index,
                    pinSide: 'right',
                    path: pinPath(x + w, cy),
                });
            });
            return;
        }
        this.hitTargets.push({ kind: 'pin', id, pinIndex: 0, pinSide: 'left', path: pinPath(x, py) });
        this.hitTargets.push({ kind: 'pin', id, pinIndex: 0, pinSide: 'right', path: pinPath(x + w, py) });
    }

    /**
     * Left power rail. x matches the first line of the root ANB in calculateLines:
     * root.x - margin_horizontal/2 - 0.5
     */
    paintLeftBusbar(ctx: CanvasRenderingContext2D, host: LadViewHost, cssH: number): void {
        const root = host.data.linkedList[host.data.rootId];
        if (!root?.location) {
            return;
        }
        const mh = host.margin_horizontal ?? 2;
        const x = (root.location.x - mh / 2 - 0.5 - host.viewer[0][0]) * host.basicLength;
        const y0 = (root.location.y - host.viewer[0][1]) * host.basicLength;
        const y1 = y0 + Math.max(root.height || 1, 1) * host.basicLength;
        const top = Math.max(0, y0);
        const bot = Math.min(cssH, y1);
        if (bot <= top) {
            return;
        }
        ctx.strokeStyle = TiaTheme.powerRail;
        ctx.lineWidth = 3;
        ctx.lineCap = 'butt';
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x, bot);
        ctx.stroke();
    }

    paintGrid(ctx: CanvasRenderingContext2D, cssW: number, cssH: number, basicLength: number, originX: number, originY: number): void {
        ctx.strokeStyle = TiaTheme.grid;
        ctx.lineWidth = 1;
        const startX = -((originX * basicLength) % basicLength);
        const startY = -((originY * basicLength) % basicLength);
        ctx.beginPath();
        for (let x = startX; x <= cssW; x += basicLength) {
            ctx.moveTo(x + 0.5, 0);
            ctx.lineTo(x + 0.5, cssH);
        }
        for (let y = startY; y <= cssH; y += basicLength) {
            ctx.moveTo(0, y + 0.5);
            ctx.lineTo(cssW, y + 0.5);
        }
        ctx.stroke();
    }

    paint(
        ctx: CanvasRenderingContext2D,
        cssW: number,
        cssH: number,
        host: LadViewHost,
        selectedIds?: Iterable<string>
    ): void {
        if (selectedIds) {
            this.overlay.selectedIds = new Set(selectedIds);
        }
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        const dpr = window.devicePixelRatio || 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = TiaTheme.paper;
        ctx.fillRect(0, 0, cssW, cssH);
        this.paintGrid(ctx, cssW, cssH, host.basicLength, host.viewer[0][0], host.viewer[0][1]);
        this.paintLeftBusbar(ctx, host, cssH);

        const selectedSet = this.overlay.selectedIds;

        for (const item of this.scene) {
            if (item.kind === 'line') {
                paintLine(ctx, item.location, item.basicLength, item.color ?? TiaTheme.ink);
            } else if (item.kind === 'polyline') {
                paintPolyline(ctx, item.points, item.basicLength, item.color);
            }
        }

        for (const item of this.scene) {
            if (item.kind !== 'element') {
                continue;
            }
            const selected = selectedSet.has(item.id);
            const hover = this.overlay.hoverId === item.id;
            if (selected || hover) {
                paintSelectionFrame(ctx, elementBBox(item.treeNode, item.basicLength), hover && !selected);
            }
        }

        for (const item of this.scene) {
            if (item.kind === 'element') {
                paintElement(
                    ctx,
                    item.treeNode,
                    item.basicLength,
                    item.textOpts.fontSize,
                    TiaTheme.ink,
                    item.pinInviewer
                );
            }
        }

        for (const assist of this.overlay.assistPoints) {
            const hot = isHotAssist(assist, this.overlay.hotAssist);
            paintAssistRect(ctx, assist.x + assist.width / 2, assist.y + assist.height / 2, host.basicLength, hot);
        }

        if (this.overlay.ghost) {
            paintGhost(ctx, this.overlay.ghost, host.basicLength, host.fontSize);
        }
        if (this.overlay.wirePoints) {
            paintWirePreview(ctx, this.overlay.wirePoints, host.basicLength);
        }
        const m = this.overlay.marquee;
        if (m) {
            paintMarquee(ctx, m.x0, m.y0, m.x1, m.y1);
        }
        ctx.restore();
        this.rebuildHitTargets(host.basicLength);
    }
}

function isHotAssist(assist: MiniRectOpts, hot?: MiniRectOpts | null): boolean {
    if (!hot) {
        return false;
    }
    const a = assist.id || assist.parentId;
    const b = hot.id || hot.parentId;
    return a === b && assist.direction === hot.direction && assist.pinIndex === hot.pinIndex;
}
