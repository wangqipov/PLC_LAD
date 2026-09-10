import type { Data, FBParameter, TreeNode, TreeNodeObj } from '@/app/lad/class/index';
import { deepClone } from '@/app/common/objects';
import { generateUuid } from '@/app/common/uuid';
import type { LadViewHost } from '@/app/lad/view/core/viewHost';
import { refreshLadLayout } from '@/app/lad/view/core/layoutRefresh';

/** Extra demo element count (elements only, excluding ANB/ORB) */
const DEMO_EXTRA_ELEMENTS = 5000;
/** Base unit: 2 series contacts + 2 parallel contacts + a coil (coil keeps the inner ORB from being last child so the right vertical closes) */
const UNIT_ELEMENT_COUNT = 5;

function element(partial: Partial<TreeNode> & { type: TreeNode['type'] }): TreeNode {
    const width = partial.width ?? 1;
    const height = partial.height ?? 1;
    return {
        blockType: 'element',
        originalWidth: width,
        originalHeight: height,
        width,
        height,
        location: { x: 0, y: 0 },
        pinOffsetY: 0.4,
        varNameHeight: 0.4,
        ...partial,
    } as TreeNode;
}

function block(
    blockType: 'ANB' | 'ORB',
    children: string[],
    parent?: string
): TreeNode {
    return {
        blockType,
        location: { x: 0, y: 0 },
        width: 0,
        height: 0,
        originalWidth: 0,
        originalHeight: 0,
        children,
        parent,
    };
}

const FB_PIN_HEIGHT = 0.6;
const FB_PIN_COUNT = 100;

function makePins(count: number, side: 'left' | 'right'): FBParameter[] {
    const pins: FBParameter[] = [];
    for (let i = 0; i < count; i++) {
        const isFirst = i === 0;
        pins.push({
            pinOffsetFirstPin: i * FB_PIN_HEIGHT,
            varNameHeight: FB_PIN_HEIGHT,
            pinY: 0,
            varName: side === 'left'
                ? (isFirst ? 'EN' : `IN${i}`)
                : (isFirst ? 'ENO' : `OUT${i}`),
        });
    }
    return pins;
}

/** Demo FB: 100 pins, 50 each side. initFbPin / initHeight size the box. */
function demoFbPins(): { left: FBParameter[]; right: FBParameter[]; inputNumber: number } {
    const perSide = Math.floor(FB_PIN_COUNT / 2);
    return {
        left: makePins(perSide, 'left'),
        right: makePins(FB_PIN_COUNT - perSide, 'right'),
        inputNumber: perSide,
    };
}

/**
 * Star-delta demo network: IEC series ANB / parallel ORB tree.
 * Coordinates are not handwritten; calculateLocation / calculateLines fill them.
 *
 *   rail — I0.0 — I0.1 —+—— ▶ (default top-right OB; add deletes it after dropping a coil)
 *                       +—— FB (100 pins) —— Q0.1
 *                       +—— Q0.2
 */
export function createSampleNetwork(): Data {
    const linkedList: TreeNodeObj = {
        root: block('ANB', ['nStart', 'nStop', 'nOrb', 'nEnd']),
        nStart: element({ type: 'NO', varName: 'I0.0', varDesc: '起动按钮', parent: 'root' }),
        nStop: element({ type: 'NC', varName: 'I0.1', varDesc: '停止按钮', parent: 'root' }),
        nOrb: block('ORB', ['nOpenAnb', 'nTonAnb', 'nDelta'], 'root'),
        nOpenAnb: block('ANB', ['nOpen'], 'nOrb'),
        nOpen: element({ type: 'OB', parent: 'nOpenAnb' }),
        nTonAnb: block('ANB', ['nTon', 'nStar'], 'nOrb'),
        nTon: element({
            type: 'FB',
            varName: 'FB1',
            width: 6,
            height: 3,
            originalWidth: 6,
            originalHeight: 3,
            parent: 'nTonAnb',
            ...demoFbPins(),
        }),
        nStar: element({ type: 'Coil', varName: 'Q0.1', varDesc: '星形接触器', parent: 'nTonAnb' }),
        nDelta: element({ type: 'Coil', varName: 'Q0.2', varDesc: '三角形接触器', parent: 'nOrb' }),
        // END after the parallel block so calculateLines does not read parent.parent on a last-child ORB of root ANB
        nEnd: element({ type: 'END', width: 1, height: 1, originalWidth: 1, originalHeight: 1, parent: 'root' }),
    };
    linkedList.root.location = { x: 3, y: 2 };

    const data: Data = {
        linkedList,
        virtualDom: {},
        lineMap: {},
        blueLineMap: {},
        widthV: 22 * 30,
        heightV: 14 * 30,
        rootId: 'root',
        elementToLineMap: {},
    };

    replicateBaseAndOrUnits(data, Math.ceil(DEMO_EXTRA_ELEMENTS / UNIT_ELEMENT_COUNT));
    // Copies hang under the root parallel ORB so ANB-in-ANB is not flattened by calculateLocation.

    try {
        refreshLadLayout({
            basicLength: 30,
            fontSize: 12,
            lineHeight: 1.2,
            width: 100,
            height: 100,
            viewer: [[0, 0], [50, 50]],
            viewElement: [],
            viewLine: [],
            viewBlueLine: [],
            data,
            ladData: {
                id: 'network-1',
                index: 0,
                show: true,
                title: '',
                notes: '',
                data,
                animateDom: null,
                animateOutDom: null,
                viewerDom: null,
            },
            canvas: null,
            ctx: null,
            FBPinHeight: 0.6,
            margin_horizontal: 2,
            margin_vertical: 0.5,
            fBMargin: 1,
            FBLeftHeight: 1.5,
        } as LadViewHost);
    } catch (err) {
        console.error('[LAD] 演示网络布局失败', err);
    }

    return data;
}

/**
 * Base series/parallel unit:
 *   NO — NC —+—— NO —— ( )
 *            +—— NO
 * Coil must follow the parallel block: if ORB is the last ANB child in or-and-or, calculateLines skips the right vertical.
 */
function createBaseAndOrUnit(): { linkedList: TreeNodeObj; rootId: string } {
    return {
        rootId: 'uAnb',
        linkedList: {
            uAnb: block('ANB', ['uNo', 'uNc', 'uOrb', 'uCoil']),
            uNo: element({ type: 'NO', parent: 'uAnb' }),
            uNc: element({ type: 'NC', parent: 'uAnb' }),
            uOrb: block('ORB', ['uP0', 'uP1'], 'uAnb'),
            uP0: element({ type: 'NO', parent: 'uOrb' }),
            uP1: element({ type: 'NO', parent: 'uOrb' }),
            uCoil: element({ type: 'Coil', parent: 'uAnb' }),
        },
    };
}

/**
 * Loop-copy the base series/parallel unit.
 * Legal tree: root ANB → bulk ORB (parallel rungs) → each rung is ANB (series + inner parallel).
 * ANB must not be a child of ANB, or layout flattens into one row.
 */
function remapFragmentIds(fragment: TreeNodeObj, map: { [x: string]: string }): void {
    const keys = Object.keys(fragment);
    for (const key of keys) {
        const mk = map[key];
        if (!mk) {
            continue;
        }
        const obj: TreeNode = fragment[mk] = deepClone(fragment[key]);
        if (obj.parent && map[obj.parent]) {
            obj.parent = map[obj.parent];
        }
        if (obj.children) {
            obj.children = obj.children.map((id) => map[id] ?? id);
        }
        delete fragment[key];
    }
}

function replicateBaseAndOrUnits(data: Data, copies: number): void {
    const { linkedList } = data;
    const root = linkedList[data.rootId];
    const rootChildren = root.children as string[];
    const endId = rootChildren[rootChildren.length - 1];
    const origIds = rootChildren.slice(0, -1);

    const origAnbId = generateUuid();
    const bulkOrbId = generateUuid();
    const origCloseId = generateUuid();
    for (const id of origIds) {
        linkedList[id].parent = origAnbId;
    }
    // Hidden END after the star-delta ORB so it is not the last ANB child (or-and-or would drop the right vertical)
    linkedList[origCloseId] = element({
        type: 'END',
        width: 1,
        height: 1,
        originalWidth: 1,
        originalHeight: 1,
        parent: origAnbId,
    });
    linkedList[origAnbId] = block('ANB', [...origIds, origCloseId], bulkOrbId);

    const { linkedList: template, rootId: templateRoot } = createBaseAndOrUnit();
    const rungIds: string[] = [origAnbId];
    for (let i = 0; i < copies; i++) {
        const fragment = deepClone(template);
        const map: { [x: string]: string } = {};
        for (const key of Object.keys(fragment)) {
            map[key] = generateUuid();
        }
        remapFragmentIds(fragment, map);
        const newRoot = map[templateRoot];
        fragment[newRoot].parent = bulkOrbId;
        fragment[map.uNo].varName = `U${i}.0`;
        fragment[map.uNc].varName = `U${i}.1`;
        fragment[map.uP0].varName = `U${i}.2`;
        fragment[map.uP1].varName = `U${i}.3`;
        fragment[map.uCoil].varName = `Q${i}.0`;
        for (const id of Object.keys(fragment)) {
            linkedList[id] = fragment[id];
        }
        rungIds.push(newRoot);
    }

    linkedList[bulkOrbId] = block('ORB', rungIds, data.rootId);
    root.children = [bulkOrbId, endId];
}
