// Coil types
export const LdCoilTypesArr: string[] = ['Coil'];
export class FirmFBFU {
    parameters: FBParameter[] | undefined;
}
export type JsonObj = Record<string, unknown>;
export { CanvasView } from '@/app/lad/view/core/core';
export class LadData {
    id!: string;
    index!: number;
    show!: boolean;
    title!: string;
    notes!: string;
    data!: Data;
    // obj!: Lad | null;
    animateDom!: HTMLElement | null;
    animateOutDom!: HTMLDivElement | null;
    viewerDom!: HTMLDivElement | null;
    annot?: boolean;
}
export type LinePath = {
    /**
     * id:line's left element
     * value is element's right line's path
     */
    [id: string]: [number, number][][];
}
export interface Data {
    /**
     * main tree
     */
    linkedList: TreeNodeObj;
    /**
     * matrix index,used to identify whether droppoint has item and what is the item when click event is triggered
     * also used in virtual scrolling
     */
    virtualDom: VirtualDom;
    lineMap: LineMap;
    blueLineMap: BlueLine;
    widthV: number;
    heightV: number;
    rootId: string;
    elementToLineMap: ElementToLineMap;
}
export type BlueLine = {
    [k: string]: [number, number][];
}
export interface FBParameter {
    textWidth?: number;
    error?: string;
    pinY: number;
    /**
     * the id of element that been connected with pin
     */
    connectId?: string;
    pinOffsetFirstPin: number;
    varName?: string;
    /**
     * variable value
     */
    value?: string;
    /**
     * variable name block's height
     */
    varNameHeight: number;
    varHeight?: number;
    descHeight?: number;
    addrHeight?: number;
    vtid?: string;
    varDataType?: string;
    pouName?: string;
    varAddr?: string;
    varDesc?: string;
    hasBeenForced?: boolean;
    tempMonitor?: string;
    varWidth?: number;
    negation?: boolean;

}
export interface CanvasData {
    linkedList: TreeNodeObj;
    virtualDom: VirtualDom;
    lineMap: LineMap;
}
export type StringArr = {
    [K: string]: string[];
}
export type Location = {
    x: number;
    y: number;
}

/**
 * LD ladder element types. Object + as const so types can be extracted via keyof typeof.
 */
const LdContactType = {
    NO: "NO",        // normally open contact
    NC: "NC",        // normally closed contact
    P: "P",          // rising-edge contact
    N: "N",          // falling-edge contact
    NOT: "NOT",      // power-flow invert
    R_TRIG: "R_TRIG",// RLO rising-edge detect block
    F_TRIG: "F_TRIG",// RLO falling-edge detect block
    SR: "SR",        // set-dominant flip-flop
    RS: "RS",        // reset-dominant flip-flop
    TON: "TON",      // on-delay timer
    TOF: "TOF",      // off-delay timer
    TP: "TP",        // pulse timer
    TONR: "TONR",    // retentive on-delay timer
    CTU: "CTU",      // up counter
    CTD: "CTD",      // down counter
    CTUD: "CTUD",    // up/down counter
} as const;

/**
 * Coil
 */
const LdCoilType = {
  COIL: "COIL",        // normal output coil -( )-
  "N‑COIL": "N‑COIL",  // inverted output coil -(/)‑
  SET: "SET",          // set coil -(S)-
  RST: "RST",          // reset coil -(R)-
} as const;

export type ElementType = (keyof typeof LdContactType) | (keyof typeof LdCoilType) | 'OB' | 'FB' | 'END';
export interface TreeNode {
    deBug?: boolean;// breakpoint state
    /**
     * three signs that can recode if oneself has been elongated,if undefined,init param
     */
    setLonger?: boolean;
    setHigher?: boolean;
    setPinYHingher?: boolean;
    /**
     * var error message
     */
    error?: string;
    /**
     * Block type:
     *              ANB: series block (Serienbaustein),
     *              ORB: parallel block (Parallelbaustein),
     *              element: Element,
     *              FBL: left-side block of a function block (like a parallel block; its right side acts as pin interfaces), used to compute layout and draw lines
     */
    blockType: 'ANB' | 'ORB' | 'element' | 'FBL';
    /**
     * Element type: normally open contact, OB, function block FB, coil, END (coil end)
     */
    type?: ElementType;
    vtid?: string;
    varName?: string;
    /**
     * variable value
     */
    value?: string;
    /**
     * variable name block's height
     */
    varNameHeight?: number;
    /**
     * parent id,only one
     */
    parent?: string;
    /**
     * children id,multy
     */
    children?: string[];
    /**
     * record the x and y coordinates
     */
    location: Location;
    /**
     * pin's y coordinate
     */
    pinY?: number;
    /**
     * pinY's y coordinate's offset relative to the object
     */
    pinOffsetY?: number;
    marginRight?: number;
    marginLeft?: number;
    /**
     * record the block's original width without elongated
     */
    originalWidth: number;
    /**
     * record the block's original Height without elongated
     */
    originalHeight: number;
    /**
     * record the block's width with elongated
     */
    width: number;
    /**
     * record the block's height, obj.height = obj.originalHeight + obj.varNameHeight
     */
    height: number;
    lines?: string[];
    /**
     * FBL block's y coordinate's offset relative to the parent block
     */
    FBLOffsetY?: number;
    /**
     * id of the FBL block connected to the left of the FB
     */
    leftConnectedId?: string;
    /**
     * id of the FBL block connected to the left of the FBL
     */
    rightConnectedId?: string;
    /**
     * the FB block's pin index that FBL block's connected
     */
    connectedIndex?: number;
    /**
     * function block's left pins
     */
    left?: FBParameter[];
    /**
     * the string width of left pin's variable
     */
    leftWidth?: number;
    /**
     * function block's right pins
     */
    right?: FBParameter[];
    /**
     * the string width of right pin's variable
     */
    rightWidth?: number;
    /**
     * multi pins block object
     */
    FB?: FirmFBFU;
    /**
     * number of displayed left pins on the FB
     */
    inputNumber?: number;
    /**
     * variable data type
     */
    varDataType?: string;
    /**
     * file name
     */
    pouName?: string;
    /**
     * variable address
     */
    varAddr?: string;
    /**
     * variable comment
     */
    varDesc?: string;
    varHeight?: number;
    descHeight?: number;
    addrHeight?: number;
}

/**
 * Tree node map
 */
export type TreeNodeObj = {
    [K: string]: TreeNode;
}
/**
 * Line collection in monitor mode
 */
export type LineObj = {
    [leftId: string]: [number, number][];
}
export type ElementToLineMap = {
    [leftId: string]: { [rightId: string]: string };
}
/**
 * Virtual DOM node
 */
export interface VD {
    /** element ids */
    items?: string[];
    /** line ids */
    lines?: string[];
    /** blue line ids */
    bluelines?: string[];
}
/**
 * Virtual DOM template
 * {
 * y: {x: {}, x: {}},
 * y: {x: {}, x: {}}
 * }
 */
export type VirtualDom = {
    [K: number]: VirtualDomX;
}
export type VirtualDomX = {
    [K: number]: VD;
}
/**
 * Outermost layer of the line map
 */
export type LineMap = {
    [K: string]: LineMap;
}
export type LineLocation = {
    start: {
        x: number;
        y: number;
    };
    end: {
        x: number;
        y: number;
    };
}
/**
 * Line map
 */
export interface LM {
    type: 'horizontal' | 'vertical';
    /**
     * block connected on the left of the line
     */
    left?: string;
    /**
     * block connected on the right of the line
     */
    right?: string;
    /**
     * start and end position of the line
     */
    location?: LineLocation;
}