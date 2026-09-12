
import Lad from '@/app/lad/index';
import { LM, TreeNodeObj, TreeNode, StringArr, FBParameter, VirtualDom, LineObj, ElementToLineMap, BlueLine, Location, Data } from '../class/index';
import { generateUuid } from '@/app/common/uuid';
import { LdCoilTypesArr } from '@/app/lad/class';
import { getFBOriginalHeight, initFbPin } from '@/app/lad/service/initFbPin';

export function ifFBU(type: string) {
    if (type === 'FB' || type === 'FU') {
        return true;
    } else {
        return false;
    }
}

/** Legacy name used by transformData / service; same check as ifFBU */
export function ifFBFU(type: string) {
    return ifFBU(type);
}

/** Spelling used in calculate.initPinOffsetY */
export function ifFFBU(type: string) {
    return ifFBU(type);
}

/** Spelling used in calculate.calculateLines */
export function iffBFU(type: string) {
    return ifFBU(type);
}

/** Spelling used in getImage */
export function ifFFBFU(type: string) {
    return ifFBU(type);
}

/**
 * Get connected elements on the right
 * @param _this
 * @param id
 */
export function getRightElements(data: Data, id: string): string[] {
    const arr: string[] = [];
    /**
     * Get the element to the right
     * @param data
     * @param id
     * @param rightArr
     */
    const getRight = (data: Data, id: string, rightArr: string[]) => {
        const linkedList = data.linkedList;
        const obj = linkedList[id];
        if (!obj) { return; }
        const pid = obj.parent;
        if (pid !== undefined) {
            const parent = linkedList[pid];
            const pc = parent.children as string[];
            const blockType = parent.blockType;
            if (blockType === 'ANB') {
                const i = pc.indexOf(id);
                if (i < pc.length - 1) {
                    // Not the last child
                    const rid = pc[i + 1];
                    const robj = linkedList[rid];
                    if (robj.blockType === 'element') {
                        rightArr.push(rid);
                    } else {
                        getLeft(data, rid, arr);
                    }
                } else {
                    // Last child: recurse to parent
                    const gid = parent.parent;
                    if (gid) {
                        getRight(data, pid, arr);
                    }
                }
            } else if (blockType === 'ORB') {
                // Recurse to parent
                const gid = parent.parent;
                if (gid) {
                    getRight(data, pid, arr);
                }
            } else if (blockType === 'FBL') {
                if (obj.rightConnectedId) {
                    rightArr.push(obj.rightConnectedId);
                }
            }
        }
    };

    /**
     * Get the leftmost element in an ANB/ORB/FBL block
     * @param data
     * @param id
     * @param rightArr
     */
    const getLeft = (data: Data, id: string, rightArr: string[]) => {
        const linkedList = data.linkedList;
        const obj = linkedList[id];
        if (!obj) { return; }
        const pc = obj.children as string[];
        const blockType = obj.blockType;
        if (blockType === 'ANB') {
            if (linkedList[pc[0]].blockType === 'element') {
                rightArr.push(pc[0]);
            } else {
                getLeft(data, pc[0], arr);
            }
        } else if (blockType === 'ORB') {
            for (const o of pc) {
                if (linkedList[o].blockType === 'element') {
                    rightArr.push(o);
                } else {
                    getLeft(data, o, arr);
                }
            }
        } else if (blockType === 'FBL') {
            for (const o of pc) {
                if (linkedList[o].blockType === 'element') {
                    rightArr.push(o);
                } else {
                    getLeft(data, o, arr);
                }
            }
        }
    };

    getRight(data, id, arr);
    return arr;
}
/**
 * Get connected elements on the left
 * @param _this
 * @param id
 */
export function getLeftElements(data: Data, id: string): string[] {
    const arr: string[] = [];
    /**
     * Get the element to the left
     * @param data
     * @param id
     * @param rightArr
     */
    const getLeft = (data: Data, id: string, rightArr: string[]) => {
        const linkedList = data.linkedList;
        const obj = linkedList[id];
        if (!obj) { return; }
        const pid = obj.parent;
        if (pid !== undefined) {
            const parent = linkedList[pid];
            const pc = parent.children as string[];
            const blockType = parent.blockType;
            if (blockType === 'ANB') {
                const i = pc.indexOf(id);
                if (i > 0) {
                    // Not the first child
                    const rid = pc[i - 1];
                    const robj = linkedList[rid];
                    if (robj.blockType === 'element') {
                        rightArr.push(rid);
                    } else {
                        getRight(data, rid, arr);
                    }
                } else {
                    // First child: recurse to parent
                    const gid = parent.parent;
                    if (gid) {
                        getLeft(data, pid, arr);
                    }
                }
            } else if (blockType === 'ORB') {
                // Recurse to parent
                const gid = parent.parent;
                if (gid) {
                    getLeft(data, pid, arr);
                }
            } else if (blockType === 'FBL') {
                const gid = parent.parent;
                if (gid) {
                    getLeft(data, pid, arr);
                }
            }
        }
    };
    /**
     * Get the rightmost child in an ANB/ORB/FBL block
     * @param data
     * @param id
     * @param rightArr
     */
    const getRight = (data: Data, id: string, rightArr: string[]) => {
        const linkedList = data.linkedList;
        const obj = linkedList[id];
        if (!obj) { return; }
        const pc = obj.children as string[];
        const blockType = obj.blockType;
        if (blockType === 'ANB') {
            if (linkedList[pc[pc.length - 1]].blockType === 'element') {
                rightArr.push(pc[pc.length - 1]);
            } else {
                getRight(data, pc[pc.length - 1], arr);
            }
        } else if (blockType === 'ORB') {
            for (const o of pc) {
                if (linkedList[o].blockType === 'element') {
                    rightArr.push(o);
                } else {
                    getRight(data, o, arr);
                }
            }
        } else if (blockType === 'FBL') {
            for (const o of pc) {
                if (linkedList[o].blockType === 'element') {
                    rightArr.push(o);
                } else {
                    getRight(data, o, arr);
                }
            }
        }
    };
    getLeft(data, id, arr);
    return arr;
}
/**
 * Get elements above
 * @param _this
 * @param id
 */
export function getUpElements(data: Data, id: string): string[] {
    const arr: string[] = [];
    /**
     * Get the element above
     * @param data
     * @param id
     * @param rightArr
     */
    const getUp = (data: Data, id: string, rightArr: string[]) => {
        const linkedList = data.linkedList;
        const obj = linkedList[id];
        if (!obj) { return; }
        const pid = obj.parent;
        if (pid !== undefined) {
            const parent = linkedList[pid];
            const pc = parent.children as string[];
            const blockType = parent.blockType;
            const setORB = () => {
                const i: number = pc.indexOf(id);
                if (i > 0) {
                    // Not the last child
                    if (linkedList[pc[i - 1]].blockType === 'element') {
                        rightArr.push(pc[i - 1]);
                    } else {
                        getDown(data, pc[i - 1], rightArr);
                    }
                } else {
                    // First child: recurse to parent
                    const gid = parent.parent;
                    if (gid) {
                        getUp(data, pid, rightArr);
                    }
                }
            };
            if (blockType === 'ANB') {
                // Recurse to parent
                const gid = parent.parent;
                if (gid) {
                    getUp(data, pid, arr);
                }

            } else if (blockType === 'ORB') {
                setORB();
            } else if (blockType === 'FBL') {
                setORB();
            }
        }
    };
    /**
     * Get the bottom-most element in an ANB/ORB/FBL block
     * @param data
     * @param id
     * @param rightArr
     */
    const getDown = (data: Data, id: string, rightArr: string[]) => {
        const linkedList = data.linkedList;
        const obj = linkedList[id];
        if (!obj) { return; }
        const pc = obj.children as string[];
        const blockType = obj.blockType;
        if (blockType === 'ANB') {
            for (const o of pc) {
                if (linkedList[o].blockType === 'element') {
                    rightArr.push(o);
                } else {
                    getDown(data, o, rightArr);
                }
            }
        } else if (blockType === 'ORB') {
            if (linkedList[pc[pc.length - 1]].blockType === 'element') {
                rightArr.push(pc[0]);
            } else {
                getDown(data, pc[pc.length - 1], rightArr);
            }
        } else if (blockType === 'FBL') {
            if (linkedList[pc[pc.length - 1]].blockType === 'element') {
                rightArr.push(pc[0]);
            } else {
                getDown(data, pc[pc.length - 1], rightArr);
            }
        }
    };
    getUp(data, id, arr);
    return arr;
}
/**
 * Get elements below
 * @param data
 * @param id
 */
export function getDownElements(data: Data, id: string): string[] {
    const arr: string[] = [];
    /**
     * Get the element above
     * @param data 
     * @param id 
     * @param rightArr 
     */
    const getDown = (data: Data, id: string, rightArr: string[]) => {
        const linkedList = data.linkedList;
        const obj = linkedList[id];
        if (!obj) { return; }
        const pid = obj.parent;
        if (pid !== undefined) {
            const parent = linkedList[pid];
            const pc = parent.children as string[];
            const blockType = parent.blockType;
            const setORB = () => {
                const i = pc.indexOf(id);
                if (i < pc.length - 1) {
                    // Not the last child
                    if (linkedList[pc[i + 1]].blockType === 'element') {
                        rightArr.push(pc[i + 1]);
                    } else {
                        getUp(data, pc[i + 1], rightArr);
                    }
                } else {
                    // First child: recurse to parent
                    const gid = parent.parent;
                    if (gid) {
                        getDown(data, pid, rightArr);
                    }
                }
            };
            if (blockType === 'ANB') {
                // Recurse to parent
                const gid = parent.parent;
                if (gid) {
                    getDown(data, pid, rightArr);
                }

            } else if (blockType === 'ORB') {
                setORB();
            } else if (blockType === 'FBL') {
                setORB();
            }
        }
    };
    /**
     * Get the bottom-most element in an ANB/ORB/FBL block
     * @param data 
     * @param id 
     * @param rightArr 
     */
    const getUp = (data: Data, id: string, rightArr: string[]) => {
        const linkedList = data.linkedList;
        const obj = linkedList[id];
        if (!obj) { return; }
        const pc = obj.children as string[];
        const blockType = obj.blockType;
        if (blockType === 'ANB') {
            for (const o of pc) {
                if (linkedList[o].blockType === 'element') {
                    rightArr.push(o);
                } else {
                    getDown(data, o, rightArr);
                }
            }
        } else if (blockType === 'ORB') {
            if (linkedList[pc[pc.length - 1]].blockType === 'element') {
                rightArr.push(pc[0]);
            } else {
                getDown(data, pc[pc.length - 1], rightArr);
            }
        } else if (blockType === 'FBL') {
            if (linkedList[pc[pc.length - 1]].blockType === 'element') {
                rightArr.push(pc[0]);
            } else {
                getDown(data, pc[pc.length - 1], rightArr);
            }
        }
    };
    getDown(data, id, arr);
    return arr;
}
/**
 * Clear variable values
 * @param _this
 * @param id
 */
export function clearVal(_this: Lad, id: string) {
    const obj = _this.data.linkedList[id];
    obj.pinY = undefined;
    obj.pinOffsetY = undefined;
    obj.setHigher = undefined;
    obj.setLonger = undefined;
    obj.setPinYHigher = undefined;
    if (obj.blockType === 'element') {
        initHeight(_this, id);
    } else {
        obj.originalHeight = obj.height = 0;
        obj.originalWidth = obj.width = 0;
    }
    initFBMargin(obj, _this.fBMargin);
    obj.value = undefined;
    if (ifFBFU(obj.type as string)) {
        for (const o of obj.left as FBParameter[]) {
            o.value = undefined;
        }
        for (const o of obj.right as FBParameter[]) {
            o.value = undefined;
        }
    }
    if (obj.children && obj.children.length > 0) {
        for (const o of obj.children) {
            clearVal(_this, o);
        }
    }
}
export function cleanLine(_this: Lad) {
    _this.data.lineMap = {};
}
/**
 * Build blue-line data for monitor mode
 * @param _this
 */
export function initBlueLine(_this: Lad, ifUseOldId?: boolean) {
    const obj = getAllLines(_this, ifUseOldId);
    _this.data.blueLineMap = obj.lines;
    _this.data.elementToLineMap = obj.elementToLineMap;
}
/**
 * Build pairwise connection line data
 * @param _this
 * @returns []
 */
export function getAllLines(_this: Lad, ifUseOldId?: boolean): { lines: BlueLine; elementToLineMap: ElementToLineMap } {
    const { data, margin_horizontal } = _this;
    const { linkedList, rootId } = data;
    /**
     * Get the rightmost child of the block
     * @param linkedList
     * @param id
     * @param res
     */
    const getElementRight = (linkedList: TreeNodeObj, id: string, res: (string | undefined)[]) => {
        const c = linkedList[id].children as string[];
        if (linkedList[id].blockType === 'ANB') {
            getElementRight(linkedList, c[c.length - 1], res);
        } else if (linkedList[id].blockType === 'ORB') {
            for (const o of c) {
                getElementRight(linkedList, o, res);
            }
        } else if (linkedList[id].blockType === 'element') {
            if (linkedList[id].type === 'OB' || linkedList[id].type === 'END') {
                res.push(undefined);
            } else {
                res.push(id);
            }
        }
    };
    /**
     * Get the leftmost child of the id
     * @param linkedList
     * @param id
     * @param res
     */
    const getElementLeft = (linkedList: TreeNodeObj, id: string, res: (string | undefined)[]) => {
        const c = linkedList[id].children as string[];
        if (linkedList[id].blockType === 'ANB') {
            getElementLeft(linkedList, c[0] as string, res);
        } else if (linkedList[id].blockType === 'ORB' || linkedList[id].blockType === 'FBL') {
            for (const o of c) {
                getElementLeft(linkedList, o, res);
            }
        } else if (linkedList[id].blockType === 'element') {
            if (linkedList[id].type === 'OB' || linkedList[id].type === 'END') {
                res.push(undefined);
            } else {
                res.push(id);
            }
        }
    };
    /**
     * Map element ids to line ids
     * @param leftId
     * @param rightId
     * @param elementToLineMap
     * @param id
     */
    const setElementToLineMap = (leftId: string, rightId: string, elementToLineMap: ElementToLineMap, id: string) => {
        if (elementToLineMap[leftId] === undefined) {
            elementToLineMap[leftId] = {};
        }
        if (elementToLineMap[leftId][rightId] === undefined) {
            elementToLineMap[leftId][rightId] = id;
        }
    };

    /**
     * Get the line path
     * @param leftId
     * @param rightId
     */
    const getPath = (leftId: string | undefined, rightId: string | undefined, rightIndex: number | undefined, lines: LineObj, linkedList: TreeNodeObj, ifUseOldId: boolean) => {
        if (leftId === undefined) {
            return; // 'leftId cannot be empty'
        }
        const id = generateUuid();
        if (rightId !== undefined && rightIndex !== undefined) {
            // Only FB passes rightIndex
            const robj = linkedList[rightId];
            const lobj = linkedList[leftId];

            if (linkedList[leftId].pinY === (robj.left as FBParameter[])[rightIndex].pinY) {
                // Straight line
                const x1 = lobj.location.x + lobj.width - 0.5;
                const y1 = lobj.pinY as number;
                const x2 = robj.location.x - 0.5;
                const y2 = (robj.left as FBParameter[])[rightIndex].pinY as number;
                setLinePath(leftId, rightId, lines, elementToLineMap, id, [[x1, y1], [x2, y2]], ifUseOldId);
                // lines[id] = [[x1, y1], [x2, y2]];
                // setElementToLineMap(leftId, rightId, elementToLineMap, id);
            } else {
                // Polyline
                const x1 = lobj.location.x + lobj.width - 0.5;
                const y1 = lobj.pinY as number;
                let x3 = robj.location.x;
                if (robj.parent) {
                    if (linkedList[robj.parent].blockType !== 'element') {
                        x3 -= 0.5;
                    }
                }
                const y3 = (robj.left as FBParameter[])[rightIndex].pinY as number;
                let x2 = 0;

                const lp = linkedList[lobj.parent as string];
                if (lp.blockType === 'ORB') {
                    x2 = lobj.location.x + lp.width + margin_horizontal / 2 - 0.5;
                    if (lobj.marginRight) {
                        x2 -= lobj.marginRight as number;
                    }
                } else if (lp.blockType === 'ANB') {
                    const pp = linkedList[lp.parent as string];
                    x2 = pp.location.x + pp.width + margin_horizontal / 2 - 0.5;
                    if (pp.marginRight) {
                        x2 -= pp.marginRight;
                    }
                }
                setLinePath(leftId, rightId, lines, elementToLineMap, id, [[x1, y1], [x2, y1], [x2, y3], [x3, y3]], ifUseOldId);
                // lines[id] = [[x1, y1], [x2, y1], [x2, y3], [x3, y3]];
                // setElementToLineMap(leftId, rightId, elementToLineMap, id);
            }

        } else {
            // Regular element handling
            const getP = (leftId: string, rightId: string | undefined) => {

                if (leftId === undefined && rightId !== undefined) {
                    const robj = linkedList[rightId];
                    const y1 = robj.pinY as number;
                    const x2 = robj.location.x - 0.5;
                    setLinePath('undefined', rightId, lines, elementToLineMap, id, [[1, y1], [x2, y1]], ifUseOldId);
                    // lines[id] = [[1, y1], [x2, y1]];
                    // setElementToLineMap(leftId, rightId, elementToLineMap, id);
                } else if (rightId === undefined && leftId !== undefined) {
                    const lobj = linkedList[leftId];
                    const y1 = lobj.pinY as number;
                    const x1 = lobj.location.x + lobj.width - 0.5;
                    setLinePath(leftId, 'undefined', lines, elementToLineMap, id, [[x1, y1], [x1 + 1, y1]], ifUseOldId);
                    // lines[id] = [[x1, y1], [x1 + 1, y1]];
                    // setElementToLineMap(leftId, rightId, elementToLineMap, id);
                } else if ((rightId !== undefined && leftId !== undefined)) {
                    const robj = linkedList[rightId];
                    const lobj = linkedList[leftId];
                    if (linkedList[leftId].pinY === linkedList[rightId].pinY) {
                        // Straight line
                        const x1 = lobj.location.x + lobj.width - 0.5;
                        const y1 = lobj.pinY as number;
                        const x2 = robj.location.x - 0.5;
                        setLinePath(leftId, rightId, lines, elementToLineMap, id, [[x1, y1], [x2, y1]], ifUseOldId);
                        // lines[id] = [[x1, y1], [x2, y1]];
                        // setElementToLineMap(leftId, rightId, elementToLineMap, id);
                    } else {
                        // Polyline
                        const x1 = lobj.location.x + lobj.width - 0.5;
                        const y1 = lobj.pinY as number;
                        let x3 = robj.location.x;
                        if (robj.parent) {
                            if (linkedList[robj.parent].blockType !== 'element') {
                                x3 -= 0.5;
                            }
                        }
                        const y3 = robj.pinY as number;
                        let x2 = 0;

                        const obj2: StringArr = {};
                        // Ancestor index
                        const rightArr: string[] = getAncestorArray(linkedList, rightId);
                        if (rightArr.indexOf(lobj.parent as string) === -1) {
                            // Not a common ancestor
                            const lp = linkedList[lobj.parent as string];
                            if (lp.blockType === 'ORB') {
                                x2 = lobj.location.x + lp.width + margin_horizontal / 2 - 0.5;
                                if (lobj.marginRight) {
                                    x2 -= lobj.marginRight;
                                }
                            } else if (lp.blockType === 'ANB') {
                                const pp = linkedList[lp.parent as string];
                                x2 = pp.location.x + pp.width + margin_horizontal / 2 - 0.5;
                                if (pp.marginRight) {
                                    x2 -= pp.marginRight;
                                }
                            }
                        } else {
                            const rp = linkedList[robj.parent as string];
                            if (rp.blockType === 'ORB') {
                                x2 = robj.location.x - margin_horizontal / 2 - 0.5;
                                if (robj.marginLeft) {
                                    x2 -= robj.marginLeft;
                                }
                            } else if (rp.blockType === 'ANB') {
                                const pp = linkedList[rp.parent as string];
                                x2 = pp.location.x - margin_horizontal / 2 - 0.5;
                                if (pp.marginLeft) {
                                    x2 -= pp.marginLeft;
                                }
                            }
                        }

                        setLinePath(leftId, rightId, lines, elementToLineMap, id, [[x1, y1], [x2, y1], [x2, y3], [x3, y3]], ifUseOldId);
                        // lines[id] = [[x1, y1], [x2, y1], [x2, y3], [x3, y3]];
                        // setElementToLineMap(leftId, rightId, elementToLineMap, id);
                    }
                }
            };
            getP(leftId, rightId);
        }
    };
    const setLinePath = (leftId: string, rightId: string, lines: LineObj, elementToLineMap: ElementToLineMap, id: string, path: [number, number][], ifUseOldId: boolean) => {
        const o = _this.data.elementToLineMap;

        if (ifUseOldId && o[leftId] && o[leftId][rightId]) {
            // Reuse the old id
            id = o[leftId][rightId];
        }
        lines[id] = path;
        setElementToLineMap(leftId, rightId, elementToLineMap, id);
    };
    const getLine = (linkedList: TreeNodeObj, id: string, lines: LineObj, elementToLineMap: ElementToLineMap, ifUseOldId: boolean) => {
        const c: string[] = linkedList[id].children as string[];
        if (linkedList[id].blockType === 'ANB') {
            // Walk children
            for (let i = 0; i < c.length; i++) {
                getLine(linkedList, c[i], lines, elementToLineMap, ifUseOldId);
                if (i < c.length - 1) {
                    const left: (string | undefined)[] = [];
                    getElementRight(linkedList, c[i], left);
                    const right: (string | undefined)[] = [];
                    getElementLeft(linkedList, c[i + 1], right);
                    for (const o of left) {
                        if (lines[o as string] === undefined) {
                            for (const p of right) {
                                getPath(o, p, undefined, lines, linkedList, ifUseOldId);
                            }
                        }
                    }
                }
            }
        } else if (linkedList[id].blockType === 'ORB' || linkedList[id].blockType === 'FBL') {
            for (let i = 0; i < c.length; i++) {
                getLine(linkedList, c[i], lines, elementToLineMap, ifUseOldId);
            }
        } else if (ifFBFU(linkedList[id].type as string)) {
            const fbLeft = linkedList[id].left as FBParameter[];
            for (let i = 0; i < fbLeft.length; i++) {
                if (fbLeft[i].connectId !== undefined) {
                    const left: (string | undefined)[] = [];
                    getElementRight(linkedList, fbLeft[i].connectId as string, left);
                    for (const o of left) {
                        getPath(o, id, i, lines, linkedList, ifUseOldId);
                    }
                }
            }
        }
    };
    const getEdgeLine = (_this: Lad, lines: LineObj, elementToLineMap: ElementToLineMap, ifUseOldId: boolean) => {

        const lineMap = _this.data.lineMap;
        const linkedList = _this.data.linkedList;
        if (_this.viewLine) {
            for (const o in lineMap) {
                if (lineMap[o].type === 'horizontal') {
                    if (lineMap[o].left === undefined) {
                        const id = generateUuid();
                        const right: (string | undefined)[] = [];
                        const obj = lineMap[o].location;
                        getElementLeft(linkedList, lineMap[o].right as string, right);
                        for (const o of right) {
                            if (o !== undefined && obj.end.y === linkedList[o].pinY) {
                                setLinePath(_this.data.rootId, o, lines, elementToLineMap, id, [[obj.start.x, obj.start.y], [obj.end.x, obj.end.y]], ifUseOldId);
                                // lines[id] = [[obj.start.x, obj.start.y], [obj.end.x, obj.end.y]];
                                // setElementToLineMap(_this.data.rootId, o, elementToLineMap, id);
                                break;
                            }
                        }
                    }
                    if (lineMap[o].right === undefined) {
                        const id = generateUuid();
                        const left: (string | undefined)[] = [];
                        const obj = lineMap[o].location;
                        if (lineMap[o].left !== undefined) {
                            getElementRight(linkedList, lineMap[o].left as string, left);
                        }
                        for (const o of left) {
                            if (o !== undefined && obj.end.y === linkedList[o].pinY) {
                                setLinePath(o, 'undefined', lines, elementToLineMap, id, [[obj.start.x, obj.start.y], [obj.end.x, obj.end.y]], ifUseOldId);
                                // lines[id] = [[obj.start.x, obj.start.y], [obj.end.x, obj.end.y]];
                                // setElementToLineMap(o, undefined, elementToLineMap, id);
                                break;
                            }
                        }
                    }
                }

            }
        }
    };
    const lines = {};
    const elementToLineMap = {};
    getLine(linkedList, rootId, lines, elementToLineMap, ifUseOldId ?? false);
    getEdgeLine(_this, lines, elementToLineMap, ifUseOldId ?? false);
    return { lines: lines, elementToLineMap: elementToLineMap };
}
/**
 * init virtual dom
 * @param _this 
 * 
 */
export function initVDom(_this: Lad) {
    const { data } = _this;
    const { linkedList, lineMap, blueLineMap } = data;
    _this.data.virtualDom = {};
    const virtualDom: VirtualDom = _this.data.virtualDom;

    function initObject(virtualDom: VirtualDom, x: number, y: number, type: 'lines' | 'items' | 'bluelines') {
        const yVDom = virtualDom[y] ?? (virtualDom[y] = {});
        const xVDom = yVDom[x] ?? (yVDom[x] = {});
        if (type === 'items') {
            if (xVDom.items === undefined) {
                xVDom.items = [];
            }
        } else if (type === 'lines') {
            if (xVDom.lines === undefined) {
                xVDom.lines = [];
            }
        } else if (type === 'bluelines') {
            if (xVDom.bluelines === undefined) {
                xVDom.bluelines = [];
            }
        }
    }
    // Elements
    for (const key in linkedList) {
        if (linkedList[key].blockType === 'element') {
            const l: Location = linkedList[key].location;
            const xInt = Math.floor(l.x);
            const yInt = Math.floor(l.y);
            const width: number = linkedList[key].width as number;
            const height: number = linkedList[key].height as number;
            for (let i = 0; i < width; i++) {
                for (let j = 0; j < height; j++) {
                    const x = xInt + i;
                    const y = yInt + j;
                    initObject(virtualDom, x, y, 'items');
                    (virtualDom[y][x].items as string[]).push(key);
                }
            }
        }
    }

    // Lines
    for (const key in lineMap) {
        // Expand line bounds (floor/ceil) so scroll-loaded tiles do not miss elements
        const sx: number = Math.floor(lineMap[key].location.start.x);
        const sy: number = Math.floor(lineMap[key].location.start.y);
        const ex: number = Math.ceil(lineMap[key].location.end.x);
        const ey: number = Math.ceil(lineMap[key].location.end.y);
        // If a horizontal/vertical delta is 0, use 1 so the loop still runs
        for (let i = 0; i < ((ex - sx) || 1); i++) {
            for (let j = 0; j < ((ey - sy) || 1); j++) {
                const x = sx + i;
                const y = sy + j;
                initObject(virtualDom, x, y, 'lines');
                (virtualDom[y][x].lines as string[]).push(key);
            }
        }
    }
    // Blue lines
    for (const key in blueLineMap) {

        const line = blueLineMap[key];
        for (let j = 0; j < line.length - 1; j++) {
            // Draw segment
            const o = line[j];
            const p = line[j + 1];
            // Expand line bounds (floor/ceil) so scroll-loaded tiles do not miss elements
            const sx: number = Math.floor(o[0]);
            const sy: number = Math.floor(o[1]);
            const ex: number = Math.ceil(p[0]);
            const ey: number = Math.ceil(p[1]);
            // If a horizontal/vertical delta is 0, use 1 so the loop still runs
            for (let i = 0; i < (Math.abs(ex - sx) || 1); i++) {
                const x = sx + i;
                for (let j = 0; j < (Math.abs(ey - sy) || 1); j++) {
                    const y = sy + j;
                    initObject(virtualDom, x, y, 'bluelines');
                    (virtualDom[y][x].bluelines as string[]).push(key);
                }
            }
        }


    }
}
/**
 * init paramater
 * @param _this
 * @param id
 */
export function clearPinY(_this: Lad, id: string) {
    const obj = _this.data.linkedList[id];
    obj.pinY = undefined;
    obj.pinOffsetY = undefined;
    obj.setHigher = undefined;
    obj.setLonger = undefined;
    obj.setPinYHigher = undefined;
    if (obj.blockType === 'element') {
        initHeight(_this, id);
    } else {
        obj.originalHeight = obj.height = 0;
        obj.originalWidth = obj.width = 0;
    }
    initFBMargin(obj, _this.fBMargin);
    if (obj.children && obj.children.length > 0) {
        for (const o of obj.children) {
            clearPinY(_this, o);
        }
    }
}
/**
 * Clear block height; used only when an FB is stretched
 * @param _this
 * @param id
 */
// function clearHeight(_this: Lad, id: string) {
//     const obj = _this.data.linkedList[id];
//     if (obj.blockType !== 'element') {
//         obj.originalHeight = obj.height = 0;
//         obj.originalWidth = obj.width = 0;
//     }
//     if (obj.children && obj.children.length > 0) {
//         for (const o of obj.children) {
//             clearHeight(_this, o);
//         }
//     }
// }
export function initFBMargin(obj: TreeNode, fBMargin: number) {
    if (ifFBFU(obj.type as string)) {
        if (obj.leftWidth !== undefined) {
            obj.marginLeft = obj.leftWidth;
        } else {
            obj.marginLeft = fBMargin;
        }
        if (obj.rightWidth !== undefined) {
            obj.marginRight = obj.rightWidth;
        } else {
            obj.marginRight = fBMargin;
        }
    }
}

/**
 * calculate all tree-nodes' location
 * @param _this - Lad.
 * @param id - the id of tree node to be calculated.
 */
export function calculateLocation(_this: Lad, id: string) {

    if (typeof _this.data.linkedList[id] !== 'object') {
        return console.error('数据错误，在linkedList中无此id: ' + id);
    }
    const func = calculateMap[_this.data.linkedList[id].blockType];
    if (typeof func === 'function') {
        func(_this, id);
    }
}

/**
 * a funciton that can calculate coordinates
 */
function setCoordinates(_this: Lad, id: string) {
    const { data, margin_horizontal, margin_vertical } = _this;
    const { linkedList } = data;
    const obj = linkedList[id];
    if (linkedList[id].parent !== undefined) {

        const parentid = obj.parent as string;
        const parentNode = linkedList[parentid];
        const pchildren = parentNode.children as string[];
        if (parentNode.blockType === 'ANB') {
            const index = pchildren.indexOf(id);
            if (index !== 0) {
                // Previous sibling
                const lastNode = linkedList[pchildren[index - 1]];
                obj.location = {
                    x: lastNode.location.x + (lastNode.width as number) + margin_horizontal,
                    y: lastNode.location.y
                };
                if (lastNode.marginRight !== undefined) {
                    obj.location.x += lastNode.marginRight;
                }
                if (obj.type === 'OB' || obj.type === 'END') {
                    obj.location.x -= margin_horizontal / 2;
                }
            } else {
                obj.location = {
                    x: parentNode.location.x,
                    y: parentNode.location.y
                };
            }
        }
        else if (parentNode.blockType === 'ORB' || parentNode.blockType === 'FBL') {
            const index = (parentNode.children as string[]).indexOf(id);

            /**
             * Whether this is the first parallel element (FBL excluded)
             * @returns
             */
            // const ifFirst = () => {
            //     for (let i = 0; i < index; i++) {
            //         if (linkedList[parentNode.children[i]].blockType !== 'FBL') {
            //             // A non-FBL block above means this is not first
            //             return false;
            //         }
            //     }
            //     // No non-FBL elements above, so this is first
            //     return true;
            // }
            if (index > 0) {

                // if (lastNode.blockType === 'FBL') {
                //     // FBL is absolutely positioned and out of document flow
                //     let lastNode2 = linkedList[(parentNode.children)[index - 2]];
                //     if ((lastNode.location.y + lastNode.height) < (lastNode2.location.y + lastNode2.height)) {
                //         lastNode = lastNode2;
                //     }
                // }
                if (obj.blockType === 'FBL') {
                    obj.location = {
                        x: parentNode.location.x,
                        y: parentNode.location.y + margin_vertical + (obj.FBLOffsetY as number)
                    };
                } else {
                    const getLastElement = (): TreeNode | undefined => {
                        // FBL is out of flow (comment above). Do not place the next
                        // parallel row from FBL's padded height or the gap under FB grows.
                        for (let i = index - 1; i > -1; i--) {
                            const prev = linkedList[(parentNode.children as string[])[i]];
                            if (prev.blockType === 'FBL') {
                                continue;
                            }
                            return prev;
                        }
                        return undefined;
                    };
                    const lastNode: TreeNode | undefined = getLastElement();
                    if (lastNode !== undefined) {
                        obj.location = {
                            x: parentNode.location.x,
                            y: lastNode.location.y + margin_vertical + lastNode.height// Previous element y plus height
                        };
                    } else {
                        obj.location = {
                            x: parentNode.location.x,
                            y: parentNode.location.y
                        };
                    }


                    // if (lastNode.blockType === 'ANB') {
                    //     obj.location.y -= 0.4;
                    // } else if (ifFFBU(lastNode.type)) {
                    //     obj.location.y += 1;
                    // }
                }
            } else {

                obj.location = {
                    x: parentNode.location.x,
                    y: parentNode.location.y
                };

            }
        }
    }
    if (obj.marginLeft !== undefined) {
        obj.location.x += obj.marginLeft;
    }
    // Set pinY
    if (ifFBU(obj.type as string)) {
        obj.pinY = obj.location.y + (obj.pinOffsetY as number);
        const left = obj.left as FBParameter[];
        const right = obj.right as FBParameter[];
        if (left.length > 0) {
            left[0].pinY = obj.pinY;
            for (const o of left) {
                o.pinY = left[0].pinY + o.pinOffsetFirstPin;
            }
        }
        if (right.length > 0) {
            right[0].pinY = obj.pinY;
            for (const o of right) {
                o.pinY = right[0].pinY + o.pinOffsetFirstPin;
            }
        }
        obj.pinY = left[0].pinY;
    } else {
        obj.pinY = obj.location.y + (obj.pinOffsetY as number);
    }

}

/**
 * add a new line in lineMap,also used as an interceptor
 */
function addLineMap(ifUseOldId: boolean, _this: Lad, obj: LM) {
    const lineMap = _this.data.lineMap;
    if (ifUseOldId) {
        for (const o in lineMap) {
            if (lineMap[o].left === obj.left && lineMap[o].right === obj.right) {
                lineMap[o] = obj;
                break;
            }
        }
    } else {
        const uuid = generateUuid();
        _this.data.lineMap[uuid] = obj;
    }

}

/**
 * get ancestor ids array
 */
export function getAncestorArray(linkedList: TreeNodeObj, id: string) {
    const arr: string[] = [id];
    function get(linkedList: TreeNodeObj, id: string, arr: string[]) {
        const pId = linkedList[id]['parent'];
        if (pId !== undefined) {
            arr.unshift(pId);
            get(linkedList, pId, arr);
        }
    }
    get(linkedList, id, arr);

    return arr;
}

/**
 * get public nearest tree node
 * @param obj
 * @returns
 */
/** Legacy spelling used by transformData */
export const getPublicNearstTreeNode = getPublicNearestTreeNode;

export function getPublicNearestTreeNode(obj: StringArr): {
    /**
     * Level of the nearest common ancestor
     */
    index: number;
    /**
     * Id of the nearest common ancestor
     */
    rootId: string;
} {

    const keys = Object.keys(obj);
    let index: number = obj[keys[0]].length - 1;
    let rootId: string = '';
    for (let i = 0; i < keys.length - 1; i++) {
        const arr = obj[keys[i]];
        const arr1 = obj[keys[i + 1]];

        if (arr.length === 1 || arr1.length === 1) {
            index = 0;
        } else {
            for (let j = 0; j < arr.length; j++) {
                if (arr[j] !== arr1[j]) {
                    if (index > j - 1) {
                        index = j - 1;
                    }
                    break;
                }
            }
        }
    }
    rootId = obj[keys[0]][index];
    return {
        index: index,
        rootId: rootId
    };
}


/**
 * when delete FBL ,delete FB's left connectId
 * @param linkedList
 * @param id
 */
export function delConnectId(linkedList: TreeNodeObj, id: string) {
    const obj = linkedList[id];
    if (obj.rightConnectedId !== undefined) {
        const con = linkedList[obj.rightConnectedId];
        if (ifFBFU(con.type as string) && obj.connectedIndex !== undefined) {
            (con.left as FBParameter[])[obj.connectedIndex].connectId = undefined;
        }
    }
}
/**
 * a funciton that can calculate coordinates
 * @param param
 * 
 */
export function calculateLines(_this: Lad, id: string, ifUseOldId: boolean) {
    const func = calculateLineMap[_this.data.linkedList[id].blockType];
    if (typeof func === 'function') {
        func(_this, id, ifUseOldId);
    }
}

/**
 * calculate tree node's width from root to leaf
 * @param _this
 * @param id
 * @param setLonger - if set block longer. if the parameter's value is 0, means don't set,other number means set current block's width
 */
export function initWidth(_this: Lad, id: string, setLonger: number) {

    const { data, margin_horizontal
        // , margin_vertical
    } = _this;
    const { linkedList
        // , virtualDom, lineMap, widthV, heightV, rootId
    } = data;
    const obj = linkedList[id];

    if (obj.blockType === 'ANB') {
        const c = obj.children as string[];
        if (!setLonger) {
            // Compute width without stretching
            // if (obj.setLonger === undefined) {
            let width = 0;
            for (let i: number = 0; i < c.length; i++) {
                const ci = linkedList[c[i]];
                initWidth(_this, c[i], 0);
                width += ci.width as number;
                if (ci.marginLeft !== undefined) {
                    width += ci.marginLeft;
                }
                if (ci.marginRight !== undefined) {
                    width += ci.marginRight;
                }
                if (i !== 0) {
                    width += margin_horizontal;
                }
            }
            if (obj.width < width) {
                obj.originalWidth = obj.width = width;
            }
            // }

        } else if (setLonger) {

            //set block longer, the rightest block's width equal to the parent block's width minus the other brothers' total width .
            if (setLonger > obj.width || setLonger === obj.width) {
                obj.width = setLonger;
                obj.setLonger = true;
                const lastNodeId = c[c.length - 1];
                const lastNode = linkedList[lastNodeId];
                // If the last child is ORB, compute its stretch width

                if (lastNode.blockType === 'ORB') {
                    let width = 0;
                    for (let i: number = 0; i < c.length - 1; i++) {
                        const ci = linkedList[c[i]];
                        width += ci.width as number;
                        if (i !== 0) {
                            width += margin_horizontal;
                        }
                        if (ci.marginLeft !== undefined) {
                            width += ci.marginLeft;
                        }
                        if (ci.marginRight !== undefined) {
                            width += ci.marginRight;
                        }
                    }
                    const lastNodewidth = obj.width - width - margin_horizontal;
                    initWidth(_this, lastNodeId, lastNodewidth);
                }
            }
        }
    } else if (obj.blockType === 'ORB' || obj.blockType === 'FBL') {
        const c = obj.children as string[];


        const getWidthest = () => {
            let widthest = 0;
            for (let i = 0; i < c.length; i++) {
                initWidth(_this, c[i], 0);
                // FBL pushes FB right, so FBL is always shorter; skip its width
                if (linkedList[c[i]].blockType !== 'FBL') {
                    let width = linkedList[c[i]].width;
                    if (linkedList[c[i]].marginLeft) {
                        width += linkedList[c[i]].marginLeft as number;
                    }
                    if (linkedList[c[i]].marginRight) {
                        width += linkedList[c[i]].marginRight as number;
                    }
                    if (widthest < width) {
                        widthest = width;
                    }
                }
            }
            return widthest;
        };
        const setWidth = () => {
            for (let i = 0; i < c.length; i++) {
                if (obj.width > linkedList[c[i]].width && (linkedList[c[i]].blockType === 'ANB' || linkedList[c[i]].blockType === 'ORB')) {
                    // Stretch children
                    initWidth(_this, c[i], obj.width);
                }
            }

            if (obj.blockType === 'FBL') {
                // FBL may push FB right or be stretched by FB
                const FBArr: string[] = getAncestorArray(linkedList, obj.rightConnectedId as string);
                const rootIndex = FBArr.indexOf(obj.parent as string);
                const arr: number[] = [0];
                // Collect widths of elements left of FB on the ancestor path
                for (let i = rootIndex; i < FBArr.length - 1; i++) {
                    const indexc = i - rootIndex;
                    const currentid = FBArr[i];
                    const obji = linkedList[currentid];
                    const blockType = obji.blockType;
                    const c = obji.children as string[];
                    const indexL = c.indexOf(FBArr[i + 1]);// Index of the FB-path child in obji.children

                    if (blockType === 'ANB') {

                        let width = 0;
                        for (let j = 0; j < indexL + 1; j++) {
                            const ci = linkedList[c[j]];
                            if (j !== indexL) {
                                width += ci.width + _this.margin_horizontal;
                            }

                            if (ci.marginLeft !== undefined) {
                                width += ci.marginLeft;
                            }
                            if (ci.marginRight !== undefined) {
                                width += ci.marginRight;
                            }
                        }
                        arr[indexc] = width - _this.margin_horizontal / 2;
                    } else if (blockType === 'ORB' || blockType === 'FBL') {
                        if (indexc > 0) {
                            arr[indexc] = arr[indexc - 1];
                        }
                    }
                }
                const totalWidth = arr[arr.length - 1];// Distance from FB to the shared parent x
                const FBobj = linkedList[FBArr[FBArr.length - 1]];
                const objWidth = obj.width + _this.fBMargin + _this.margin_horizontal;// Distance from FBL's rightmost line to the shared parent x

                if (totalWidth < objWidth) {
                    // FBL stretches elements to the left of FB
                    const offset = objWidth - totalWidth;
                    (FBobj.marginLeft as number) += offset;
                    const objFBfather = linkedList[FBArr[FBArr.length - 2]];
                    initWidth(_this, FBArr[FBArr.length - 2], objFBfather.width + offset);
                    initWidth(_this, _this.data.rootId, 0);
                }
            }
        };
        if (!setLonger) {
            const widthest = getWidthest();
            // if (obj.setLonger === undefined) {
            // First-time init
            if (widthest > obj.width) {
                obj.setLonger = true;
                obj.width = obj.originalWidth = widthest;
                setWidth();
            }
            // } else {
            // // Later width updates
            // if (widthest > obj.width) {
            //     obj.width = obj.originalWidth = widthest;
            //     setWidth();
            // }
            // }
        } else if (setLonger) {
            if (setLonger > obj.width || setLonger === obj.width) {
                obj.width = setLonger;
                obj.setLonger = true;
                for (let i = 0; i < c.length; i++) {
                    if (['element', 'FBL'].indexOf(linkedList[c[i]].blockType) === -1) {

                        if (linkedList[c[i]].width < obj.width) {

                            linkedList[c[i]].width = obj.width;
                            if (linkedList[c[i]].blockType === 'ANB') {
                                initWidth(_this, c[i], setLonger);
                            }
                        }
                    }
                }
            }
        }
    }
}

export const ifEnd = (type: string) => {
    if (ifCoil(type) || type === 'jump' || type === 'return') {
        return true;
    } else {
        return false;
    }
};
export const ifCoil = (type: string): boolean => {
    if (LdCoilTypesArr.includes(type)) {
        return true;
    } else {
        return false;
    }

};
/**
 * 
 * @param _this
 * @param id
 * @param setLonger
 */
export function initHeight(_this: Lad, id: string, setLonger?: number) {
    const obj = _this.data.linkedList[id];
    InitHeightClass[obj.blockType](_this, id, obj, setLonger);
}
class InitHeightClass {
    static ANB(_this: Lad, id: string, obj: TreeNode, setLonger?: number) {
        const { linkedList } = _this.data;
        const c = obj.children as string[];
        if (!setLonger) {
            // if (!obj.setHigher) {

            let height_max: number = 0;
            // let offset: number = 0;
            let pinOffsetY_max = 0;

            for (let i: number = 0; i < c.length; i++) {
                initHeight(_this, c[i]);
            }

            // ANB height is max child height plus max varNameHeight
            for (let i: number = 0; i < c.length; i++) {
                let height1 = linkedList[c[i]].height;
                if (linkedList[c[i]].pinOffsetY !== undefined) {
                    const pinOffsetY = linkedList[c[i]].pinOffsetY as number;// Max text height
                    height1 -= pinOffsetY;
                    if (pinOffsetY_max < pinOffsetY) {
                        pinOffsetY_max = pinOffsetY;
                    }
                }
                if (height_max < height1) {
                    height_max = height1;
                }
            }
            const height = height_max + pinOffsetY_max;

            if (height > obj.height) {
                // Recalc: a taller child may expand ANB
                obj.originalHeight = obj.height = height;
            }
            //}
        } else if (obj.height < setLonger) {
            obj.setHigher = true;
            obj.height = setLonger;

            // for (let i: number = 0; i < c.length; i++) {
            //     initHeight(_this, c[i], setLonger);
            // }
        }
    }
    static ORB(_this: Lad, id: string, obj: TreeNode, setLonger?: number) {
        const { data, margin_vertical } = _this;
        const { linkedList } = data;
        const c = obj.children as string[];

        if (!setLonger) {
            // if (!obj.setHigher) {
            let height = 0;
            for (let i = 0; i < c.length; i++) {
                initHeight(_this, c[i]);
                const obji = linkedList[c[i]];
                if (obji.blockType === 'FBL') {
                    // FBL is out of flow: only expand ORB if the pin-branch extends below.
                    const height1 = (obji.FBLOffsetY as number) + obji.height;
                    if (height1 > height) {
                        height = height1;
                    }
                } else {
                    if (i !== 0) {
                        height += margin_vertical;
                    }
                    height += obji.height;
                }
            }
            if (height > obj.height) {
                obj.originalHeight = obj.height = height;
            }

            // }
        } else if (obj.height < setLonger) {
            obj.setHigher = true;
            obj.height = setLonger;
        }
    }
    static FBL(_this: Lad, id: string, obj: TreeNode, setLonger?: number) {
        // Handle FB and FBL together; skip FB in element
        const { data, margin_vertical } = _this;
        const { linkedList } = data;
        const c = obj.children as string[];
        const fbid = obj.rightConnectedId as string;
        const fb = linkedList[fbid];
        const left = fb.left as FBParameter[];
        const pid = obj.parent as string;
        /**
         * Downward offset of FBL and FB relative to FBL's parent; take the max
         * rightConnectedId is the FB id linked to this FBL
         * @returns
         */
        const getleft10offset = (FBLid: string, FBId: string) => {
            void FBLid;
            // Same FB ancestor walk as initWidth FBL (not FBLArr: objLast would be the FBL and ifFBFU never fires).
            const FBArr: string[] = getAncestorArray(linkedList, FBId);
            const rootIndex = FBArr.indexOf(pid);// Index of FBL's parent in the ancestor list (nearest common ancestor)
            const arr: { beforeHeight: number; baseheight: number; maxheight: number }[] = [];
            if (rootIndex < 0) {
                return { FBLYheight: 0, FBheight: 0 };
            }

            // Heights of blocks on the FB ancestor path
            for (let i = rootIndex; i < FBArr.length - 1; i++) {
                const currentid = FBArr[i];
                const obj = linkedList[currentid];
                const blockType = obj.blockType;
                const c = obj.children as string[];
                /**
                 * FB-path node
                 */
                const objLast = linkedList[FBArr[i + 1]];
                /**
                 * Index of the FB-path child among this node's children
                 */
                const indexLast = c.indexOf(FBArr[i + 1]);
                /**
                 * Depth of this FB-path level from the nearest common ancestor
                 */
                const indexc = i - rootIndex;

                arr[indexc] = {
                    beforeHeight: 0, // Max height from root y to the bottom of elements left of FB
                    baseheight: 0,// Height from root y to the FB-path block
                    maxheight: 0// Max height from root y to the path block
                };

                if (blockType === 'ANB') {
                    if (indexc > 0) {
                        arr[indexc].beforeHeight = arr[indexc - 1].beforeHeight;
                        arr[indexc].maxheight = arr[indexc - 1].beforeHeight;
                    }
                    let height = 0;
                    let height1 = 0;// Default 1 when nothing is in front
                    let height2 = 0;
                    for (let j = 0; j < c.length; j++) {
                        height = linkedList[c[j]].height;
                        if (j < indexLast) {
                            // Before the end index, take max height
                            if (height > height1) {
                                height1 = height;
                            }
                        }
                        if (height > height2) {
                            // Max height among all children
                            height2 = height;
                        }
                    }
                    if (indexLast === 0 && ifFBFU(objLast.type as string)) {
                        // If nothing precedes FB, default height is 1; baseheight skips that default
                        height1 += _this.FBLeftHeight + (linkedList[c[0]].pinOffsetY as number);
                    }
                    arr[indexc].beforeHeight += height1;
                    arr[indexc].maxheight += height2;

                    if (indexc > 0) {
                        arr[indexc].baseheight = arr[indexc - 1].baseheight;
                    }
                } else if (blockType === 'ORB' || blockType === 'FBL') {
                    if (indexc > 0) {
                        arr[indexc].beforeHeight = arr[indexc - 1].baseheight;
                        arr[indexc].maxheight = arr[indexc - 1].baseheight;
                    }
                    let hb = 0;
                    let hmax = 0;

                    for (let j = 0; j < c.length; j++) {
                        //calcate beforeHeight
                        if (j < indexLast) {
                            if (linkedList[c[j]].blockType === 'FBL') {
                                const h = (linkedList[c[j]].FBLOffsetY as number) + linkedList[c[j]].height;
                                if (hb < h) {
                                    hb = h + margin_vertical + 0.5;
                                }
                            } else {
                                hb += linkedList[c[j]].height + margin_vertical;
                            }
                        }

                        //calcate maxheight
                        if (linkedList[c[j]].blockType === 'FBL') {
                            const h = (linkedList[c[j]].FBLOffsetY as number) + linkedList[c[j]].height;
                            if (hmax < h) {
                                hmax = h;
                            }
                        } else {
                            hmax += linkedList[c[j]].height;
                        }
                        if (j !== 0) {
                            hmax += margin_vertical;
                        }
                    }
                    arr[indexc].beforeHeight += hb;
                    arr[indexc].maxheight += hmax;
                    // First child above FBL is FB
                    if (ifFBFU(objLast.type as string)) {

                        // If nothing precedes FB, default height is 1; baseheight skips that default
                        arr[indexc].baseheight = arr[indexc].beforeHeight;
                        arr[indexc].beforeHeight += _this.FBLeftHeight + (linkedList[c[0]].pinOffsetY as number);
                    } else {
                        arr[indexc].baseheight = arr[indexc].beforeHeight;
                    }
                }
            }

            const res = {
                /**
                 * Y distance from above FBL to the common parent
                 */
                FBLYheight: 0,
                /**
                 * Leaf is FB; height from FB to the common parent y
                 */
                FBheight: 0
            };
            for (const o of arr) {
                if (res.FBLYheight < o.beforeHeight) {
                    res.FBLYheight = o.beforeHeight;
                }
            }

            res.FBheight = arr.length ? arr[arr.length - 1].baseheight : 0;
            return res;
        };
        if (!setLonger) {
            // let fbLeftHeight = 0;
            //FBL block's parent be an ORB block,and there mast have a FB block on the top of FBL block.

            obj.height = 0;
            if (!obj.setHigher) {
                obj.setHigher = true;

                /**
                 * Pin height of an FBL child from the top
                 */
                const getSonOffset = (index: number, c: string[]) => {
                    let h = 0;
                    // Sum heights of elements before the last
                    for (let i = 0; i < index; i++) {
                        if (linkedList[c[i]].blockType === 'FBL') {
                            // let h1 = linkedList[c[i]].FBLOffsetY + linkedList[c[i]].height + _this.margin_vertical + 0.5;
                            // if (h < h1) {
                            //   h = h1;
                            // }
                        } else {
                            h += linkedList[c[i]].height;
                            h += _this.margin_vertical;
                            // if (i > 0) {
                            //   let lastNode = linkedList[c[i - 1]];
                            //   if (lastNode.blockType === 'ANB') {
                            //     h -= 0.4;
                            //   } else if (ifFBFU(lastNode.type)) {
                            //     h += 1;
                            //   }
                            // }
                        }
                    }
                    // Last element adds pinOffsetY only
                    h += linkedList[c[index]].pinOffsetY as number;
                    return h;
                };
                // Nested FB inside FBL affects layout
                initFbPin(fb);
                initPinOffsetY(_this, obj.parent as string);

                const res = getleft10offset(id, obj.rightConnectedId as string);

                obj.FBLOffsetY = res.FBLYheight;
                // Y from FBL to FB's first pin (0.5 is the first pin's offset from the top)
                let offset = obj.FBLOffsetY + 0.5 - res.FBheight - (fb.pinOffsetY as number);

                for (let i = 0; i < c.length; i++) {
                    initHeight(_this, c[i]);
                    // Initial pin position
                    if (linkedList[c[i]].connectedIndex !== undefined) {

                        // FB pin index connected to this FBL child
                        const pinIndex = linkedList[c[i]].connectedIndex as number;
                        // Height from FBL y to the child pin
                        const FBLSon = getSonOffset(i, c);
                        // Distance from FBL child pin to FB's first pin
                        const offsetPin0 = offset + FBLSon;
                        // Extra offset of the FBL pin vs the FB pin
                        const offsetD = offsetPin0 - left[pinIndex].pinOffsetFirstPin;

                        if (i === 0) {
                            // First branch: move FBL (out of flow). Stretching height here
                            // is treated as in-flow and opens a large gap under the FB.
                            const dy = left[pinIndex].pinOffsetFirstPin - offsetPin0;
                            obj.FBLOffsetY += dy;
                            offset += dy;
                        } else if (offsetPin0 > left[pinIndex].pinOffsetFirstPin) {
                            for (let j = pinIndex; j < left.length; j++) {
                                left[j].pinOffsetFirstPin += offsetD;
                            }
                        } else {
                            linkedList[c[i]].height += left[pinIndex].pinOffsetFirstPin - offsetPin0;
                            initPinOffsetY(_this, c[i], (linkedList[c[i]].pinOffsetY as number) + (left[pinIndex].pinOffsetFirstPin - offsetPin0));
                        }
                    }
                }
                // Sum once after pin-align. initPinOffsetY may re-enter initHeight(root)
                // and the else-pass would double obj.height if we accumulate in the loop.
                let fblH = 0;
                for (let i = 0; i < c.length; i++) {
                    if (linkedList[c[i]].blockType === 'FBL') {
                        const height1 = (linkedList[c[i]].FBLOffsetY as number) + linkedList[c[i]].height;
                        if (height1 > fblH) {
                            fblH = height1;
                        }
                    } else {
                        fblH += linkedList[c[i]].height;
                    }
                    if (i !== 0) {
                        fblH += margin_vertical;
                    }
                }
                obj.height = fblH;
                obj.originalHeight = obj.height;
                // Recalc overall height after FBL stretches FB
                const fboriginalheight = getFBOriginalHeight(fb);
                if (fb.originalHeight < fboriginalheight) {
                    fb.originalHeight = fboriginalheight;
                }
                if (fb.pinOffsetY !== undefined) {
                    initPinOffsetY(_this, fbid);
                }

                if (fb.height < fboriginalheight + (fb.varNameHeight as number) + 1) {
                    initHeight(_this, fbid, fboriginalheight + (fb.varNameHeight as number) + 1);
                    initHeight(_this, _this.data.rootId);
                }
            } else {
                // Keep FBLOffsetY from the first pass (includes first-branch alignment).
                obj.height = 0;
                for (let i = 0; i < c.length; i++) {
                    const ciId = c[i];
                    const ciObj = linkedList[ciId];
                    initHeight(_this, ciId);

                    if (ciObj.blockType === 'FBL') {
                        const height1 = (ciObj.FBLOffsetY as number) + ciObj.height;
                        if (height1 > obj.height) {
                            obj.height = height1;
                            if (i !== 0) {
                                obj.height += margin_vertical;
                            }
                        }
                    } else {
                        obj.height += ciObj.height as number;
                        if (i !== 0) {
                            obj.height += margin_vertical;
                        }
                    }

                }
            }
        } else if (obj.height < setLonger) {
            obj.setHigher = true;
            obj.height = setLonger;
        }

    }
    static element(_this: Lad, id: string, obj: TreeNode, setLonger?: number) {
        if (ifFBFU(obj.type as string)) {
            // If no FBL on the left, compute independently; otherwise compute inside FBL.
            // No FBL

            if (!setLonger) {
                if (!obj.setHigher) {
                    // Init FB height and pins
                    initFbPin(obj);
                }
            } else if (obj.height < setLonger) {

                obj.setHigher = true;
                obj.height = setLonger;
            }
        } else {

            if (!setLonger) {
                if (!obj.setHigher) {
                    obj.setHigher = true;
                    obj.height = obj.originalHeight + (obj.varNameHeight as number);
                }
            } else if (obj.height < setLonger) {
                obj.setHigher = true;
                obj.height = setLonger;
            }
        }
    }
}




/**
 * Compute pin offset relative to y
 * @param _this
 * @param id
 * @param setLonger
 */
export function initPinOffsetY(_this: Lad, id: string, setLonger?: number) {
    const { data } = _this;
    const { linkedList
        // , virtualDom, lineMap, widthV, heightV, rootId
    } = data;
    const obj = linkedList[id];

    if (obj.blockType === 'ANB') {
        const c = obj.children as string[];
        if (!setLonger) {

            if (!obj.setPinYHigher) {
                if (c.length > 0) {
                    let pinOffsetY: number = 0;
                    for (let i: number = 0; i < c.length; i++) {
                        initPinOffsetY(_this, c[i]);
                        const pinOffsetY1 = linkedList[c[i]].pinOffsetY as number;
                        if (pinOffsetY < pinOffsetY1) {
                            pinOffsetY = pinOffsetY1;
                        }
                    }
                    for (let i: number = 0; i < c.length; i++) {
                        if ((linkedList[c[i]].pinOffsetY as number) < pinOffsetY) {
                            initPinOffsetY(_this, c[i], pinOffsetY);
                        }
                    }
                    obj.pinOffsetY = pinOffsetY;
                }
            }
        } else if ((obj.pinOffsetY as number) < setLonger) {

            obj.setPinYHigher = true;
            initHeight(_this, id);
            initHeight(_this, id, obj.height + setLonger - (obj.pinOffsetY as number));
            initHeight(_this, _this.data.rootId);// After stretching height, re-init parent height
            obj.pinOffsetY = setLonger;
            for (let i: number = 0; i < c.length; i++) {
                initPinOffsetY(_this, c[i], setLonger);
            }
        }

    } else if (obj.blockType === 'ORB' || obj.blockType === 'FBL') {
        const c = obj.children as string[];
        if (!setLonger) {
            if (!obj.setPinYHigher) {
                if (c.length > 0) {
                    for (let i: number = 0; i < c.length; i++) {
                        initPinOffsetY(_this, c[i]);
                    }
                    obj.pinOffsetY = (linkedList[c[0]].pinOffsetY as number);
                }
            }
        } else if ((obj.pinOffsetY as number) < setLonger) {
            obj.setPinYHigher = true;
            initHeight(_this, id);
            initHeight(_this, id, obj.height + setLonger - (obj.pinOffsetY as number));
            initHeight(_this, _this.data.rootId);// After stretching height, re-init parent height
            obj.pinOffsetY = setLonger;
            initPinOffsetY(_this, c[0], setLonger);
        }
    } else if (obj.blockType === 'element') {

        if (!setLonger) {
            if (!obj.setPinYHigher) {
                if (ifFFBU(obj.type as string)) {
                    obj.pinOffsetY = 1 + (obj.varNameHeight as number);
                } else {
                    obj.pinOffsetY = (obj.varNameHeight as number);
                }
            }
        } else if ((obj.pinOffsetY as number) < setLonger) {
            obj.setPinYHigher = true;
            initHeight(_this, id);
            initHeight(_this, id, obj.height + setLonger - (obj.pinOffsetY as number));
            initHeight(_this, _this.data.rootId);// After stretching height, re-init parent height
            obj.pinOffsetY = setLonger;
        }
    }
}
/**
 * when add element, we should confirm if the block should be set longer.
 * after add element ,run this function.
 * @param _this
 * @param id
 */
export function updateWidth(_this: Lad, id: string, setLonger: number) {
    const { data, margin_horizontal } = _this;
    const { linkedList } = data;
    const obj = linkedList[id];
    if (obj.parent !== undefined) {
        const parent = linkedList[obj.parent];

        if (parent.blockType === 'ANB') {
            const c = parent.children as string[];
            parent.width = 0;
            for (let i: number = 0; i < c.length; i++) {

                parent.width += linkedList[c[i]].width as number;
                if (i !== 0) {
                    parent.width += margin_horizontal;
                }
            }


            if (parent.parent !== undefined) {
                //if own width less than father's width,use father's width
                if (parent.width < (linkedList[parent.parent as string].width as number)) {
                    parent.width = linkedList[parent.parent as string].width;
                }
                if ((parent.width as number) > (linkedList[parent.parent as string].width as number)) {
                    updateWidth(_this, obj.parent as string, parent.width as number);
                }
            }
        } else if (parent.blockType === 'ORB') {

            if (setLonger) {
                parent.width = setLonger;
                const c = parent.children as string[];
                for (let i = 0; i < c.length; i++) {
                    const po: TreeNode = linkedList[c[i]] as TreeNode;
                    if (c[i] !== id && po.blockType !== 'element' && po.width as number < setLonger) {
                        po.width = setLonger;
                        initWidth(_this, c[i], setLonger);
                    }
                }
                if (parent.parent !== undefined) {
                    updateWidth(_this, obj.parent as string, 0);
                }
            }
        }
    }
}

/**
 * every type of block has different calculate function,we use blockType property for the key to get the function;
 * we calculate width and height when add or delete element;
 * calculate from leaves to root use less time than from root to leaves.
 */
const calculateMap: {
    [key in string]: (_this: Lad, id: string) => void
} = {
    ANB: (_this: Lad, id: string) => {

        const { data } = _this;
        const { linkedList } = data;
        const obj = linkedList[id];
        const c = obj.children as string[];
        setCoordinates(_this, id);

        for (let i: number = 0; i < c.length; i++) {
            calculateLocation(_this, c[i]);
        }
    },
    ORB: (_this: Lad, id: string) => {

        const { data } = _this;
        const { linkedList } = data;
        const obj = linkedList[id];
        const c = obj.children as string[];
        setCoordinates(_this, id);

        for (let i = 0; i < c.length; i++) {
            calculateLocation(_this, c[i]);
        }
    },
    FBL: (_this: Lad, id: string) => {

        const { data } = _this;
        const { linkedList } = data;
        const obj = linkedList[id];
        const c = obj.children as string[];
        setCoordinates(_this, id);

        for (let i = 0; i < c.length; i++) {
            calculateLocation(_this, c[i]);
        }
    },
    element: (_this: Lad, id: string) => {
        setCoordinates(_this, id);
    }
};

/**
 * every type of block has different calculate function,we use blockType property for the key to get the function
 */
const calculateLineMap: {
    [key in string]: any
} = {
    ANB: (_this: Lad, id: string, ifUseOldId: boolean) => {
        const { data, margin_horizontal } = _this;
        const { linkedList } = data;
        const node = linkedList[id];
        const children = node.children as string[];
        /**
         * Y of the connection pin
         */
        const pinY: number = node.pinY as number;
        // let length = 0;
        /**
         * Loop: build line objects on the left of each child
         */
        for (let i = 0; i < children.length; i++) {
            // Width already drawn inside the block

            let left: string | undefined = undefined;
            const right: string = children[i];
            let startX: number;
            let endX: number;
            if (i !== 0 && linkedList[children[i]].type !== 'END') {
                left = children[i - 1];
                let variable2 = -0.5;
                if (['ORB', 'FBL'].indexOf(linkedList[children[i]].blockType) > -1) {
                    /**
                     * because OR's top item has left and right horizontally line,
                     * we should remove the line at this position,to avoid repeat lines.
                     */
                    variable2 -= margin_horizontal / 2;
                }

                startX = linkedList[left].location.x + linkedList[left].originalWidth - 0.5;
                if (linkedList[left].blockType === 'ORB') {
                    startX += (_this.margin_horizontal / 2);
                }
                endX = linkedList[children[i]].location.x + variable2;

                if (startX !== endX) {
                    addLineMap(ifUseOldId, _this, {
                        type: 'horizontal',
                        left: left,
                        right: right,
                        location: {
                            start: {
                                x: startX,
                                y: pinY
                            },
                            end: {
                                x: endX,
                                y: pinY
                            }
                        }
                    });
                }

            } else if (i === 0 && linkedList[children[0]].blockType === 'element') {
                left = getLRElement('left', linkedList, id);
                const obj: LM = {
                    type: 'horizontal',
                    left: left,
                    right: children[0],
                    location: {
                        start: {
                            x: node.location.x - margin_horizontal / 2 - 0.5,
                            y: pinY
                        },
                        end: {
                            x: node.location.x - 0.5,
                            y: pinY
                        }
                    }
                };
                const marginLeft = linkedList[children[0]].marginLeft;
                if (marginLeft) {
                    obj.location.end.x += marginLeft;
                }
                addLineMap(ifUseOldId, _this, obj);
            }


            calculateLines(_this, children[i], ifUseOldId);

        }

        //draw the rightest line
        const lastnode = linkedList[children[children.length - 1]] as TreeNode;
        if (lastnode.blockType === 'element' && lastnode.type !== 'OB' && lastnode.type !== 'END' && !ifEnd(lastnode.type as string)) {
            const right = getLRElement('right', linkedList, id);
            addLineMap(ifUseOldId, _this, {
                type: 'horizontal',
                left: id,
                right: right,
                location: {
                    start: {
                        x: lastnode.location.x + (lastnode.width as number) - 0.5,
                        y: pinY
                    },
                    end: {
                        x: node.location.x + (node.width as number) + margin_horizontal / 2 - 0.5,
                        y: pinY
                    }
                }
            });
        }
    },
    ORB: (_this: Lad, id: string, ifUseOldId: boolean) => {
        ORBandFBLLine(_this, id, ifUseOldId);
    },
    FBL: (_this: Lad, id: string, ifUseOldId: boolean) => {
        ORBandFBLLine(_this, id, ifUseOldId);
    },
    element: (_this: Lad, id: string, ifUseOldId: boolean) => {
        const { data, margin_horizontal } = _this;
        const { linkedList } = data;
        const node = linkedList[id];

        if (iffBFU(node.type as string)) {

            const left = node.left as FBParameter[];
            for (const o of left) {
                if (o.connectId !== undefined) {
                    const obj = linkedList[o.connectId];

                    addLineMap(ifUseOldId, _this, {
                        type: 'horizontal',
                        left: o.connectId,
                        right: id,
                        location: {
                            start: {
                                x: obj.location.x + obj.width + margin_horizontal / 2 - 0.5,
                                y: obj.pinY as number
                            },
                            end: {
                                x: node.location.x - 1 / 4,
                                y: obj.pinY as number
                            }
                        }
                    });
                }
            }
        }
    }
};
/**
 * Get the left or right neighbor
 * @param dir left or right
 * @param _this
 * @param id
 */
function getLRElement(dir: 'left' | 'right', linkedList: TreeNodeObj, id: string): string | undefined {
    const obj = linkedList[id];
    const pid = obj.parent;
    if (pid) {
        const p = linkedList[pid];
        const c = p.children as string[];

        if (dir === 'left') {
            if (p.blockType === 'ANB') {
                if (c.indexOf(id) === 0) {
                    if (p.parent) {
                        return getLRElement(dir, linkedList, pid);
                    } else {
                        return undefined;
                    }
                } else {
                    return c[c.indexOf(id) - 1];
                }
            } else if (p.blockType === 'ORB' || p.blockType === 'FBL') {
                if (p.parent) {
                    return getLRElement(dir, linkedList, pid);
                } else {
                    return undefined;
                }
            } else {
                return undefined;
            }
        } else {
            if (p.blockType === 'ANB') {
                if (c.indexOf(id) === c.length - 1) {
                    if (p.parent) {
                        return getLRElement(dir, linkedList, pid);
                    } else {
                        return undefined;
                    }
                } else {
                    return c[c.indexOf(id) + 1];
                }
            } else if (p.blockType === 'ORB') {
                if (p.parent) {
                    return getLRElement(dir, linkedList, pid);
                } else {
                    return undefined;
                }
            } else if (p.blockType === 'FBL') {
                if (obj.rightConnectedId) {
                    return obj.rightConnectedId;
                } else {
                    if (p.parent) {
                        return getLRElement(dir, linkedList, pid);
                    } else {
                        return undefined;
                    }
                }
            } else {
                return undefined;
            }
        }
    } else {
        return undefined;
    }
}
function ORBandFBLLine(_this: Lad, id: string, ifUseOldId: boolean) {

    const { data, margin_horizontal
        // ,margin_vertical
    } = _this;
    const { linkedList
        // ,virtualDom,lineMap,widthV,heightV,rootId
    } = data;
    const node = linkedList[id];
    const children = node.children as string[];
    const isOrAndOr_ = isOrAndOr(linkedList, id);
    // Count ORB children that are not FBL and not open-circuit
    const getNumOfORB = (children: string[]) => {

        /**
         * check if add
         * @param obj
         * @returns
         */
        const check = (obj: TreeNode): boolean => {
            let res = true;
            const c = obj.children as string[];
            if (obj.blockType === 'FBL') {
                res = false;
            } else if (obj.blockType === 'ANB') {
                res = check(linkedList[c[c.length - 1]]);
            } else if (obj.blockType === 'ORB') {
                res = false;
                // True if any child matches
                for (const o of c) {
                    const r = check(linkedList[o]);
                    if (r === true) {
                        res = true;
                        break;
                    }
                }
            } else if (obj.type === 'OB') {
                res = false;
            }
            else if (obj.type === 'END' || ifEnd(obj.type as string)) {
                res = false;
            }
            return res;
        };
        let num = 0;
        for (let i = 0; i < children.length; i++) {
            if (check(linkedList[children[i]])) {
                num++;
            }
        }
        return num;
    };
    const numOfORB = getNumOfORB(children);
    /**
     * recurrent dealing forefathers linked list
     * check if forefathers' data structure is or-and-or
     */
    function isOrAndOr(linkedList: TreeNodeObj, id: string): boolean {

        const pId = linkedList[id]['parent'];

        if (pId !== undefined) {
            const parent = linkedList[pId];
            let grandParent: TreeNode | undefined = undefined;
            if (parent.parent !== undefined) {
                grandParent = linkedList[parent.parent];
            }

            if (
                (['ORB', 'FBL'].indexOf(linkedList[id].blockType) > -1) &&
                parent.blockType === 'ANB' &&
                grandParent !== undefined &&
                ['ORB', 'FBL'].indexOf(grandParent.blockType) > -1
            ) {
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    }
    /**
     * in the or-and-or structure, we get the last children OR's connecting pin's Y-coordinate,to draw the highest generation OR's vertical line.
     * @param _this
     * @param id - notice: only receive OR's id
     * @param dir leftmost or rightmost element
     */
    function getShuntEndY(_this: Lad, id: string, dir: 'left' | 'right'): number {
        const linkedList = _this.data.linkedList;
        const node = linkedList[id];

        function get_lastItem(node: TreeNode, dir: 'left' | 'right'): TreeNode | undefined {
            const children = node.children as string[] | undefined;
            if (!children) {
                return undefined;
            }
            const l = children.length;
            let lastItem = undefined;
            if (dir === 'right') {
                if (['ORB', 'FBL'].indexOf(node.blockType) > -1) {
                    for (let i = l - 1; i > -1; i--) {
                        const o = linkedList[children[i]];
                        if (o.blockType === 'FBL') {// FBL has no connection line
                            continue;
                        }
                        if (o.blockType === 'element') {
                            if (o.type === 'OB' || o.type === 'END' || ifEnd(o.type as string)) {

                            } else {

                                lastItem = o;
                                break;
                            }

                        } else {
                            lastItem = get_lastItem(o, dir);
                            if (lastItem !== undefined) {
                                break;
                            }
                        }
                    }
                } else if (node.blockType === 'ANB') {

                    const o = linkedList[children[children.length - 1]];

                    if (o.blockType === 'element') {
                        if (o.type !== 'OB' && o.type !== 'END' && !ifEnd(o.type as string)) {
                            lastItem = o;
                        } else {
                            lastItem = get_lastItem(o, dir);
                        }
                    } else {
                        lastItem = get_lastItem(o, dir);
                    }
                } else if (node.blockType === 'element') {
                    lastItem = node;
                }
                return lastItem;
            }
            lastItem = linkedList[children[l - 1]];
            return lastItem;
        }



        const lastItem = get_lastItem(node, dir);
        if (lastItem !== undefined) {

            return lastItem.pinY as number;

        } else {

        }



        return 0;

    }
    /**
     * in the or-and-or structure, we get the first children OR's connecting pin's Y-coordinate,to draw the highest generation OR's vertical line.
     * @param _this
     * @param id - notice: only receive OR's id
     * @param dir leftmost or rightmost element
     */
    function getShuntStartY(_this: Lad, id: string, dir: 'right'): number {
        const linkedList = _this.data.linkedList;
        const node = linkedList[id];

        function get_firstItem(node: TreeNode, dir: 'right'): TreeNode | undefined {
            const children = node.children as string[] | undefined;
            if (!children) {
                return undefined;
            }
            const l = children.length;
            let lastItem = undefined;
            if (dir === 'right') {
                if (['ORB', 'FBL'].indexOf(node.blockType) > -1) {
                    for (let i = 0; i < l; i++) {
                        const o = linkedList[children[i]];
                        if (o.blockType === 'FBL') {// FBL has no connection line
                            continue;
                        }
                        if (o.blockType === 'element') {
                            if (o.type === 'OB' || o.type === 'END' || ifEnd(o.type as string)) {
                                continue;// Skip connecting
                            } else {

                                lastItem = o;
                                break;
                            }

                        } else {
                            lastItem = get_firstItem(o, dir);
                            if (lastItem !== undefined) {
                                break;
                            }
                        }
                    }
                } else if (node.blockType === 'ANB') {

                    const o = linkedList[children[children.length - 1]];

                    if (o.blockType === 'element') {
                        if (o.type !== 'OB' && o.type !== 'END' && !ifEnd(o.type as string)) {
                            lastItem = o;
                        }
                    } else {
                        lastItem = get_firstItem(o, dir);
                    }
                } else if (node.blockType === 'element') {
                    lastItem = node;
                }
            }
            return lastItem;
        }
        const lastItem = get_firstItem(node, dir);
        if (lastItem !== undefined) {
            return lastItem.pinY as number;
        }
        return 0;
    }
    /**
     * draw vertical lines
     */
    // Element id to the left of the left vertical line
    let left: string | undefined = undefined;
    // Element id to the right of the right vertical line
    let right: string | undefined = undefined;
    const ifDrawRightVerticalLine = (node: TreeNode): boolean => {
        const pid = node.parent;
        if (pid) {
            //
            //
            //
            //
            return ifDrawRightVerticalLine(linkedList[pid]);
        }
        return true;
    };
    if (node.parent !== undefined) {
        const parent = linkedList[node.parent as string];
        const pc = parent.children as string[];

        // If parent is series and two parallels are adjacent, merge vertical lines
        //if the data is in structure 'or-and-or',the children's OR's vertical line will be deleted and merged into grandfather's vertical line.

        const index = pc.indexOf(id);
        left = getLRElement('left', linkedList, id);
        right = id;

        //draw left vertical line
        //sibling elements need to use longer line
        //left block is OR
        if (index !== 0) {
            const rightY = getShuntEndY(_this, id, 'left');
            if (['ORB', 'FBL'].indexOf(linkedList[pc[index - 1]].blockType) > -1) {
                const leftY = getShuntEndY(_this, pc[index - 1], 'right');

                if (leftY < rightY || leftY === rightY) {
                    //self block is longer
                    //set self left vertical line
                    addLineMap(ifUseOldId, _this, {
                        type: 'vertical',
                        left: left,
                        right: right,
                        location: {
                            start: {
                                x: node.location.x - margin_horizontal / 2 - 0.5,
                                y: node.pinY as number,
                            },
                            end: {
                                x: node.location.x - margin_horizontal / 2 - 0.5,
                                y: rightY,
                            },
                        },
                    });
                }
            } else {
                //set left vertical line
                addLineMap(ifUseOldId, _this, {
                    type: 'vertical',
                    left: left,
                    right: right,
                    location: {
                        start: {
                            x: node.location.x - margin_horizontal / 2 - 0.5,
                            y: node.pinY as number,
                        },
                        end: {
                            x: node.location.x - margin_horizontal / 2 - 0.5,
                            y: linkedList[children[children.length - 1]].pinY as number,
                        },
                    },
                });
            }

        } else {

            if (!isOrAndOr_ || (isOrAndOr_ && (linkedList[parent.parent as string].children as string[]).indexOf(node.parent) !== 0)) {
                //set left vertical line
                addLineMap(ifUseOldId, _this, {
                    type: 'vertical',
                    left: left,
                    right: right,
                    location: {
                        start: {
                            x: node.location.x - margin_horizontal / 2 - 0.5,
                            y: node.pinY as number,
                        },
                        end: {
                            x: node.location.x - margin_horizontal / 2 - 0.5,
                            y: linkedList[children[children.length - 1]].pinY as number,
                        },
                    },
                });
            }
        }

        //draw node's right vertical line,
        //sibling elements need to use longer line
        //right block is OR
        //FBL do not draw right vertical line

        if (node.blockType === 'ORB' && ifDrawRightVerticalLine(node) && numOfORB > 1) {
            // Draw the right vertical line when ORB has more than one child
            left = id;
            //the last item
            right = getLRElement('left', linkedList, id);
            const sratrY = getShuntStartY(_this, id, 'right');
            const endY = getShuntEndY(_this, id, 'right');

            if (index !== (pc.length - 1)) {
                //if right block is longer,don't draw self right line

                if (linkedList[pc[index + 1]].blockType === 'ORB') {

                    const rightY = getShuntEndY(_this, pc[index + 1], 'left');

                    if ((parent.blockType === 'ANB' && endY > rightY) || parent.blockType === 'FBL') {

                        //self block is longer
                        //set right vertical line
                        addLineMap(ifUseOldId, _this, {
                            type: 'vertical',
                            left: left,
                            right: right,
                            location: {
                                start: {
                                    x: node.location.x + node.width + margin_horizontal / 2 - 0.5,
                                    y: sratrY,
                                },
                                end: {
                                    x: node.location.x + node.width + margin_horizontal / 2 - 0.5,
                                    y: endY,
                                },
                            },
                        });
                    }

                } else {
                    //set right vertical line
                    addLineMap(ifUseOldId, _this, {
                        type: 'vertical',
                        left: left,
                        right: right,
                        location: {
                            start: {
                                x: node.location.x + node.width + margin_horizontal / 2 - 0.5,
                                y: sratrY,
                            },
                            end: {
                                x: node.location.x + node.width + margin_horizontal / 2 - 0.5,
                                y: endY,
                            },
                        },
                    });
                }
            } else {
                if (numOfORB > 1) {
                    //if node is or-and-or type, the parent isn't FBL and is the last item of and block, do not draw,
                    const xCoor = node.location.x + (node.width as number) + margin_horizontal / 2 - 0.5;
                    if (!isOrAndOr) {
                        //set right vertical line
                        addLineMap(ifUseOldId, _this, {
                            type: 'vertical',
                            left: left,
                            right: right,
                            location: {
                                start: {
                                    x: xCoor,
                                    y: sratrY,
                                },
                                end: {
                                    x: xCoor,
                                    y: endY,
                                },
                            },
                        });
                    } else {
                        const grandPa = linkedList[parent.parent as string];
                        if (grandPa.blockType === 'FBL' || getNumOfORB(grandPa.children as string[]) < 2) {

                            //set right vertical line

                            addLineMap(ifUseOldId, _this, {
                                type: 'vertical',
                                left: left,
                                right: right,
                                location: {
                                    start: {
                                        x: node.location.x + node.width + margin_horizontal / 2 - 0.5,
                                        y: sratrY,
                                    },
                                    end: {
                                        x: node.location.x + node.width + margin_horizontal / 2 - 0.5,
                                        y: endY,
                                    },
                                },
                            });
                        }
                    }
                }
            }
        }
    } else {
        if (node.blockType === 'ORB' && ifDrawRightVerticalLine(node) && numOfORB > 1) {
            // Draw the right vertical line when ORB has more than one child
            const sratrY = getShuntStartY(_this, id, 'right');
            const endY = getShuntEndY(_this, id, 'right');

            addLineMap(ifUseOldId, _this, {
                type: 'vertical',
                left: id,
                location: {
                    start: {
                        x: node.location.x + node.width + margin_horizontal / 2 - 0.5,
                        y: sratrY,
                    },
                    end: {
                        x: node.location.x + node.width + margin_horizontal / 2 - 0.5,
                        y: endY,
                    }
                }
            });
        }
    }

    /**
     * loop draw horizontal lines
     */
    //if the children data is in structure 'or-and-or' ,the parent's OR's vertical line will be deleted and merged into leafNode's vertical line.
    for (let i = 0; i < children.length; i++) {
        //parallel block's children's left connected block is the parallel block.
        let left: string | undefined = undefined;
        const right: string | undefined = children[i];

        /**
         * only draw the top parent block's line,
         * the first son's block don't draw left ,
         * the last son's block don't right line,
         * to avoid repeat lines.
         */

        /**
         * loop draw the left side horizontal lines
         */
        if (linkedList[children[i]].blockType === 'element') {
            const obj = linkedList[children[i]];
            left = getLRElement('left', linkedList, children[i]);
            let sx = obj.location.x - margin_horizontal / 2 - 0.5;
            if (obj.marginLeft) {
                sx -= obj.marginLeft;
            }
            addLineMap(ifUseOldId, _this, {
                type: 'horizontal',
                left: left,
                right: right,
                location: {
                    start: {
                        x: sx,
                        y: obj.pinY as number
                    },
                    end: {
                        x: obj.location.x - 0.5,
                        y: obj.pinY as number
                    }
                }
            });
        }

        /**
         * loop drawing the right side horizontal lines
         */
        const ci: TreeNode = linkedList[children[i]];
        if (ci.blockType === 'element' && ci.type !== 'OB' && ci.type !== 'END' && !ifEnd(ci.type as string)) {
            
            /**
             * draw right horizontal lines
             */

            left = children[i];
            addLineMap(ifUseOldId, _this, {
                type: 'horizontal',
                left: left,
                right: getLRElement('right', linkedList, children[children.length - 1]),
                location: {
                    start: {
                        x: ci.location.x + ci.width - 0.5,
                        y: linkedList[children[i]].pinY as number
                    },
                    end: {
                        x: node.location.x + node.width + margin_horizontal / 2 - 0.5,
                        y: linkedList[children[i]].pinY as number
                    }
                }
            });
        }
        calculateLines(_this, children[i], ifUseOldId);
    }
}