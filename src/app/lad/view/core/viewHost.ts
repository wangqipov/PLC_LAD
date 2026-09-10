import type { Data, LadData, TreeNode, LineLocation, FBParameter } from '@/app/lad/class/index';

export type PositionDir = 'left' | 'right' | 'up' | 'down';

/** TIA drop slot: insert while adding a symbol or dragging a wire */
export interface MiniRectOpts {
    /** Target element id passed to add / moveElements */
    id: string;
    /** Same as id; ladEvent reads e.attrs.parentId */
    parentId: string;
    direction: PositionDir;
    pinIndex?: number;
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * View-layer contract with the Lad host.
 * Does not import the Lad class, to avoid circular deps.
 */
export interface LadViewHost {
    basicLength: number;
    fontSize: number;
    lineHeight: number;
    width: number;
    height: number;
    viewer: [[number, number], [number, number]];
    viewElement: string[];
    viewLine: string[];
    viewBlueLine: string[];
    data: Data;
    ladData: LadData;
    canvas: HTMLCanvasElement | null;
    ctx: CanvasRenderingContext2D | null;
    FBPinHeight: number;
    canvasView?: unknown;
    /** Matches Lad layout fields; refreshLadLayout fills 2 / 0.5 / 1 / 1.5 when omitted */
    margin_horizontal?: number;
    margin_vertical?: number;
    fBMargin?: number;
    FBLeftHeight?: number;
    /**
     * Demo workbench sets true so drops call transformData.add / in-rung moves.
     * Leave false/undefined with Lad + ladEvent to avoid double-add.
     */
    invokeCoreOnDrop?: boolean;
}

export interface DrawElementOpts {
    treeNode: TreeNode;
    basicLength: number;
    textOpts: { fontSize: number; lineHeight: number };
    id: string;
    heightV: number;
    pinInviewer?: PinViewerRange | null;
}

export interface DrawLineOpts {
    location: LineLocation;
    basicLength: number;
    id: string;
    color?: string;
}

export interface PinViewerRange {
    left?: { start: number | undefined; end: number | undefined };
    right?: { start: number | undefined; end: number | undefined };
}

export interface SceneElement {
    kind: 'element';
    id: string;
    treeNode: TreeNode;
    basicLength: number;
    textOpts: { fontSize: number; lineHeight: number };
    pinInviewer?: PinViewerRange | null;
}

export interface SceneLine {
    kind: 'line';
    id: string;
    location: LineLocation;
    basicLength: number;
    color?: string;
}

export interface ScenePolyline {
    kind: 'polyline';
    points: [number, number][];
    basicLength: number;
    color?: string;
    layer: 'main' | 'monitor';
}

export type SceneItem = SceneElement | SceneLine | ScenePolyline;

export type HitKind = 'element' | 'pin' | 'wire' | 'assist';

export interface HitTarget {
    kind: HitKind;
    id: string;
    path: Path2D;
    /** Element bbox for marquee (CSS px, relative to current viewer) */
    bbox?: { x: number; y: number; w: number; h: number };
    pinIndex?: number;
    pinSide?: 'left' | 'right';
    direction?: 'left' | 'right' | 'up' | 'down';
    parentId?: string;
}

export type { TreeNode, LineLocation, FBParameter, Data, LadData };
