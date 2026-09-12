import type { Data, FBParameter, TreeNode, TreeNodeObj } from '@/app/lad/class/index';
import { deepClone } from '@/app/common/objects';
import { generateUuid } from '@/app/common/uuid';
import type { LadViewHost } from '@/app/lad/view/core/viewHost';
import { refreshLadLayout } from '@/app/lad/view/core/layoutRefresh';

/** Extra demo element count (elements only, excluding ANB/ORB) */
const DEMO_EXTRA_ELEMENTS = 5000;
/** Nested base unit element count; copies = floor(5000 / this) so the extra total stays ≤ 5000 */
const UNIT_ELEMENT_COUNT = 15;

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
            dataType: 'BOOL',
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
 * Contacts sit on the open-branch rail so connectOB can wire the arrow to an FB left pin
 * (checkRequirement: the FB's ancestor chain must be the first child of every ANB).
 *
 *   rail —+—— I0.0 — I0.1 — ▶
 *         +—— FB (100 pins) —— Q0.1
 *         +—— Q0.2
 */
export function createSampleNetwork(): Data {
    const linkedList: TreeNodeObj = {
        root: block('ANB', ['nOrb', 'nEnd']),
        nOrb: block('ORB', ['nOpenAnb', 'nTonAnb', 'nDelta'], 'root'),
        nOpenAnb: block('ANB', ['nStart', 'nStop', 'nOpen'], 'nOrb'),
        nStart: element({ type: 'NO', varName: 'I0.0', varDesc: 'Start button', parent: 'nOpenAnb' }),
        nStop: element({ type: 'NC', varName: 'I0.1', varDesc: 'Stop button', parent: 'nOpenAnb' }),
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
        nStar: element({ type: 'Coil', varName: 'Q0.1', varDesc: 'Star contactor', parent: 'nTonAnb' }),
        nDelta: element({ type: 'Coil', varName: 'Q0.2', varDesc: 'Delta contactor', parent: 'nOrb' }),
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

    replicateBaseAndOrUnits(data, Math.floor(DEMO_EXTRA_ELEMENTS / UNIT_ELEMENT_COUNT));
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
        console.error('[LAD] sample network layout failed', err);
    }

    return data;
}

/**
 * Nested series/parallel unit (ANB never a child of ANB; each ORB is followed by a sibling).
 *
 *   NO — NC —+—— NO —+—— NO —— NO
 *            |       +—— NC
 *            +—— NO —+——+—— NO — NC —— P
 *            |       |  +—— NO
 *            +—— NC — NO
 *            — NO — ( )
 */
function createBaseAndOrUnit(): { linkedList: TreeNodeObj; rootId: string } {
    return {
        rootId: 'uAnb',
        linkedList: {
            uAnb: block('ANB', ['uA', 'uB', 'uOrb0', 'uC', 'uCoil']),
            uA: element({ type: 'NO', parent: 'uAnb' }),
            uB: element({ type: 'NC', parent: 'uAnb' }),
            uOrb0: block('ORB', ['uL0', 'uL1', 'uL2'], 'uAnb'),

            uL0: block('ANB', ['uL0a', 'uL0Orb', 'uL0b'], 'uOrb0'),
            uL0a: element({ type: 'NO', parent: 'uL0' }),
            uL0Orb: block('ORB', ['uL0p0', 'uL0p1'], 'uL0'),
            uL0p0: element({ type: 'NO', parent: 'uL0Orb' }),
            uL0p1: element({ type: 'NC', parent: 'uL0Orb' }),
            uL0b: element({ type: 'NO', parent: 'uL0' }),

            uL1: block('ANB', ['uL1a', 'uL1Orb', 'uL1c'], 'uOrb0'),
            uL1a: element({ type: 'NO', parent: 'uL1' }),
            uL1Orb: block('ORB', ['uL1p0', 'uL1p1'], 'uL1'),
            uL1p0: block('ANB', ['uL1n0', 'uL1n1'], 'uL1Orb'),
            uL1n0: element({ type: 'NO', parent: 'uL1p0' }),
            uL1n1: element({ type: 'NC', parent: 'uL1p0' }),
            uL1p1: element({ type: 'NO', parent: 'uL1Orb' }),
            uL1c: element({ type: 'P', parent: 'uL1' }),

            uL2: block('ANB', ['uL2a', 'uL2b'], 'uOrb0'),
            uL2a: element({ type: 'NC', parent: 'uL2' }),
            uL2b: element({ type: 'NO', parent: 'uL2' }),

            uC: element({ type: 'NO', parent: 'uAnb' }),
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
        let ei = 0;
        for (const id of Object.keys(fragment)) {
            const node = fragment[id];
            if (node.blockType !== 'element' || node.type === 'END' || node.type === 'OB') {
                continue;
            }
            node.varName = node.type === 'Coil' || node.type === 'SET' || node.type === 'RST'
                ? `Q${i}.${ei}`
                : `U${i}.${ei}`;
            ei += 1;
        }
        for (const id of Object.keys(fragment)) {
            linkedList[id] = fragment[id];
        }
        rungIds.push(newRoot);
    }

    linkedList[bulkOrbId] = block('ORB', rungIds, data.rootId);
    root.children = [bulkOrbId, endId];
}
