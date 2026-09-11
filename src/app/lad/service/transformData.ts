



import { deepClone } from '@/app/common/objects';
import { generateUuid } from '@/app/common/uuid';
import { ifFBFU, initFBMargin, ifEnd, delConnectId, getAncestorArray, getPublicNearstTreeNode, getPublicNearestTreeNode } from '@/app/lad/controller/calculate';
import { Data, ElementType, FBParameter, StringArr, TreeNode, TreeNodeObj } from '@/app/lad/class/index';
import { getFBOriginalHeight, initFbPin } from '@/app/lad/service/initFbPin';
import config from '../config';
import { FirmFBFU } from '@/app/common/ky/model/pouDefModel';
import { throwNotifyInfoHandle } from '@/app/lad/service/throwNotifyInfoHandle';
import { SingletonOpInfo } from 'vs/editor/browser/widget/ld/lad/plcLad/eventAndShareData/shareData';
/**
 * Set connectedId and connectedIndex when creating a parent block
 * @param obj
 * @param linkedList
 * @param id
 */
export function setConnected(obj: TreeNode, linkedList: TreeNodeObj, id: string) {
    const parent = linkedList[id];
    if (obj.rightConnectedId !== undefined && obj.connectedIndex !== undefined) {
        parent.rightConnectedId = obj.rightConnectedId;
        parent.connectedIndex = obj.connectedIndex;
        (linkedList[parent.rightConnectedId].left as FBParameter[])[parent.connectedIndex].connectId = id;
        delete obj.rightConnectedId;
        delete obj.connectedIndex;
    }
}


/**
 * add a new element
 * @param addObj whether to store undo/redo cache
 * @param data
 * @returns
 */
export function add(addObj: {
    type: ElementType;
    varName?: string;
    varDataType?: string;
    id: string;
    direction: 'left' | 'right' | 'up' | 'down';
    pinIndex?: number;
    width?: number;
    height?: number;
    FBobj?: FirmFBFU;
}, data: Data): any {

    let { type, id, direction, width, height, FBobj, pinIndex, varName, varDataType } = addObj;
    const linkedList = data.linkedList;
    width = width || 0;
    height = height || 0;
    const obj = linkedList[id];

    if (addCheck(linkedList, type, direction, id, obj) === false) {
        return null;
    }
    const uuid = generateUuid();
    const parId = obj.parent;

    // Handle FB pin connections separately
    if (ifFBFU(obj.type as string) && pinIndex !== undefined && pinIndex !== 0) {
        // Add an element to the left of an FB pin
        const cid = (obj.left as FBParameter[])[pinIndex].connectId;
        if (cid !== undefined) {
            const co = linkedList[cid];
            if (co.blockType === 'element') {
                add({
                    type: type,
                    id: cid,
                    direction: 'right',
                    width: width,
                    height: height,
                    FBobj: FBobj
                }, data);

            } else if (co.blockType === 'ANB') {
                add({
                    type: type,
                    id: (co.children as string[])[(co.children as string[]).length - 1],
                    direction: 'right',
                    width: width,
                    height: height,
                    FBobj: FBobj
                }, data);

            } else if (co.blockType === 'ORB') {
                add({
                    type: type,
                    id: cid,
                    direction: 'right',
                    width: width,
                    height: height,
                    FBobj: FBobj
                }, data);
            }
            // Left FB pins cannot connect to FBL; only to FBL first-level children
            return null;
        }
    }

    if (parId) {
        const parent = linkedList[parId];
        const c = parent.children as string[];
        const index = c.indexOf(id);
        const blockType = parent.blockType;
        /**
         * Handle adding a coil inside an ORB
         */
        const setORB_NO_PROPERTY = () => {
            delete linkedList[id];

            const Pid: string = generateUuid();

            linkedList[Pid] = {
                blockType: 'ANB',
                location: { x: 0, y: 0 },
                width: 1,
                originalWidth: 1,
                originalHeight: 0,
                height: height as number,
                parent: parId,
                children: [],
            };
            c.splice(index, 1, Pid);

            const uuid1 = generateUuid();
            linkedList[uuid1] = {
                blockType: 'element',
                type: 'END',
                location: { x: 0, y: 0 },
                width: 1,
                originalWidth: 1,
                originalHeight: 1,
                height: 1,
                varNameHeight: 0.4,
                parent: Pid,
            };
            linkedList[Pid].children = [uuid, uuid1];
            linkedList[uuid].parent = Pid;
        };
        linkedList[uuid] = {
            blockType: 'element',
            type: type,
            location: { x: 0, y: 0 },
            width: width,
            originalWidth: width,
            originalHeight: height,
            height: height,
            varNameHeight: 0.4,
            parent: parId,
        };
        if (varName !== undefined) {
            linkedList[uuid].varName = varName;
            if (varDataType !== null && varDataType !== undefined) {
                linkedList[uuid].varDataType = varDataType;
            }
        }
        /**
         * Handle FB separately
         */
        if (ifFBFU(type)) {
            if (FBobj !== undefined) {
                if (!(FBobj.parameters instanceof Array) || FBobj.parameters.length === 0) {
                    delete linkedList[uuid];
                    return null;// FB object is missing pin data
                }
                setFB(linkedList, uuid, FBobj, type);
            } else {
                // Pass the function block object
                return null;
            }
        }


        if (type === 'OB' && (blockType === 'ANB' || ((blockType === 'ORB' || blockType === 'FBL') && index === (c.length - 1)))) {
            /**
             * Handle OB level promotion separately
             */

            /**
             * find a outest position that OB block should been set.
             * if run this function,the node must have parent.
             */
            const OBInsert = (id: string, linkedList: TreeNodeObj, data: Data) => {
                const obj = linkedList[id];
                const parId = obj.parent as string;
                const parent = linkedList[parId as string];
                const c = parent.children as string[];
                const index = c.indexOf(id);

                if (parent.blockType === 'ANB') {
                    if (index === 0) {
                        // When the drop target is the first element, promote OB
                        const grandParent = parent.parent;
                        if (grandParent) {
                            OBInsert(parId, linkedList, data);
                        } else {
                            // Add a root node
                            const uuidORB: string = generateUuid();
                            linkedList[uuidORB] = {
                                blockType: 'ORB',
                                location: deepClone(linkedList[parId].location),
                                width: 1,
                                originalWidth: 1,
                                originalHeight: 0,
                                height: 1,
                                children: [parId, uuid]
                            };
                            setConnected(parent, linkedList, uuidORB);
                            parent.parent = uuidORB;
                            linkedList[uuid].parent = uuidORB;
                            data.rootId = uuidORB;
                        }

                    } else {
                        /**
                         * When promoting OB, take trailing elements and exclude FBs/FUs with connected pins
                         */
                        const getEle = () => {
                            for (let i = index; i < c.length; i++) {
                                if (ifFBFU(linkedList[c[i]].type as string) && linkedList[c[i]].leftConnectedId) {
                                    return i - 1;
                                }
                            }
                            return c.length - 1;
                        };

                        const last = getEle();
                        const newANBc = c.splice(index, last - index + 1);
                        const uuidANB: string = generateUuid();
                        const uuidORB: string = generateUuid();
                        if (newANBc.length > 1) {
                            linkedList[uuidANB] = {
                                blockType: 'ANB',
                                location: { x: 0, y: 0 },
                                width: 1,
                                originalWidth: 1,
                                originalHeight: 0,
                                height: 1,
                                parent: uuidORB,
                                children: newANBc
                            };
                            for (const o of newANBc) {
                                linkedList[o].parent = uuidANB;
                            }

                            linkedList[uuidORB] = {
                                blockType: 'ORB',
                                location: { x: 0, y: 0 },
                                width: 1,
                                originalWidth: 1,
                                originalHeight: 0,
                                height: 1,
                                parent: parId,
                                children: [uuidANB, uuid]
                            };
                            linkedList[uuid].parent = uuidORB;
                            c.splice(index, 0, uuidORB);
                        } else {
                            linkedList[uuidORB] = {
                                blockType: 'ORB',
                                location: { x: 0, y: 0 },
                                width: 1,
                                originalWidth: 1,
                                originalHeight: 0,
                                height: 1,
                                parent: parId,
                                children: [newANBc[0], uuid]
                            };

                            linkedList[newANBc[0]].parent = uuidORB;

                            linkedList[uuid].parent = uuidORB;
                            c.splice(index, 0, uuidORB);
                        }

                    }
                } else if (parent.blockType === 'ORB' || parent.blockType === 'FBL') {

                    if (index === (c.length - 1)) {
                        // When index is the last element
                        const grandParent = parent.parent;
                        /**
                         * Whether to promote a level; do not promote when the last ANB child is an ORB
                         * @param grandParentId
                         * @param parId
                         * @param linkedList
                         * @returns
                         */
                        const ifCanUpLevel = (grandParentId: string, parId: string, linkedList: TreeNodeObj): boolean => {
                            const grandParent = linkedList[grandParentId];
                            const par = linkedList[parId];
                            if (grandParent.blockType === 'ANB' && par.blockType === 'ORB' && (grandParent.children as string[]).indexOf(parId) === (grandParent.children as string[]).length - 1) {
                                return false;
                            }
                            return true;
                        };
                        if (grandParent && ifCanUpLevel(grandParent, parId, linkedList)) {
                            OBInsert(parId, linkedList, data);
                        } else {
                            if (parent.children) {
                                parent.children.splice(index + 1, 0, uuid)
                            }
                            linkedList[uuid].parent = parId;
                        }
                    } else {
                        // When index is not the last element
                        // const getNearest = (): string => {
                        //     let id = '';
                        //     let FBLOffsetY = undefined;
                        //     for (let i = index; i < c.length; i++) {
                        //         if (linkedList[c[i]].blockType === 'FBL') {
                        //             if (FBLOffsetY === undefined || linkedList[c[i]].FBLOffsetY < FBLOffsetY) {
                        //                 FBLOffsetY = linkedList[c[i]].FBLOffsetY;
                        //                 id = c[i];
                        //             }
                        //         }
                        //     }
                        //     return id;
                        // }
                        // if (linkedList[c[index + 1]].blockType === 'FBL') {
                        //     // When the element below the drop point is an FBL
                        //     let id = getNearest();
                        //     linkedList[id].children.unshift(uuid);
                        //     linkedList[uuid].parent = id;
                        // } else {
                        if (parent.children) {
                            parent.children.splice(index + 1, 0, uuid);
                        }
                        linkedList[uuid].parent = parId;
                        // }
                    }
                }
            }
            OBInsert(id, linkedList, data);
        } else {
            // Normal element-add flow
            if (parent.blockType === 'ANB') {
                if (direction === 'left' || direction === 'right') {
                    // Left/right
                    if (direction === 'left') {
                        if (ifEnd(type) && obj.type === 'OB') {
                            delete linkedList[id];
                            const uuid1 = generateUuid();
                            linkedList[uuid1] = {
                                blockType: 'element',
                                type: 'END',
                                location: { x: 0, y: 0 },
                                width: 1,
                                originalWidth: 1,
                                originalHeight: 1,
                                height: 1,
                                varNameHeight: 0.4,
                                parent: parId,
                            };
                            c.splice(index, 0, uuid);
                            c.splice(c.length - 1, 1, uuid1);
                        } else {
                            if (c) {
                                c.splice(index, 0, uuid);
                            }
                        }

                    } else if (direction === 'right') {

                        if (ifEnd(type) && index === (c.length - 2) && linkedList[c[c.length - 1]].type === 'OB') {
                            delete linkedList[c[c.length - 1]];
                            const uuid1 = generateUuid();
                            linkedList[uuid1] = {
                                blockType: 'element',
                                type: 'END',
                                location: { x: 0, y: 0 },
                                width: 1,
                                originalWidth: 1,
                                originalHeight: 1,
                                height: 1,
                                varNameHeight: 0.4,
                                parent: parId,
                            };
                            c.splice(index + 1, 0, uuid);
                            c.splice(c.length - 1, 1, uuid1);
                        } else {
                            if (c) {
                                c.splice(index + 1, 0, uuid);
                            }

                        }
                    }

                } else {
                    // Up/down
                    const uuidORB: string = generateUuid();
                    const idB = c.splice(index, 1, uuidORB)[0];
                    linkedList[uuidORB] = {
                        blockType: 'ORB',
                        location: { x: 0, y: 0 },
                        width: width,
                        originalWidth: width,
                        originalHeight: 0,
                        height: height,
                        parent: parId,
                        children: []
                    };
                    if (idB) {
                        linkedList[uuid].parent = uuidORB;
                        linkedList[idB].parent = uuidORB;
                    } else {
                        // idB does not exist
                        return null;
                    }

                    if (direction === 'up') {
                        linkedList[uuidORB].children = [uuid, idB];
                    } else if (direction === 'down') {
                        linkedList[uuidORB].children = [idB, uuid];
                    }

                }


            } else if (parent.blockType === 'ORB') {
                let children: string[] = [];
                if (direction === 'left' || direction === 'right') {


                    if (ifEnd(type) && obj.type === 'OB') {
                        setORB_NO_PROPERTY();
                    } else {
                        const Pid: string = generateUuid();
                        if (parent.children) {
                            parent.children.splice(index, 1, Pid);
                        }

                        if (direction === 'left') {
                            children = [uuid, id];
                        } else if (direction === 'right') {
                            children = [id, uuid];
                        }

                        linkedList[Pid] = {
                            blockType: 'ANB',
                            location: { x: 0, y: 0 },
                            width: width,
                            originalWidth: width,
                            originalHeight: 0,
                            height: height,
                            parent: parId,
                            children: children,
                        };
                        linkedList[uuid].parent = Pid;
                        linkedList[id].parent = Pid;
                        setConnected(obj, linkedList, Pid);
                    }
                } else {
                    // Up/down
                    if (direction === 'up') {
                        if (parent.children) {
                            parent.children.splice(index, 0, uuid);
                        }
                    } else if (direction === 'down') {
                        if (parent.children) {
                            parent.children.splice(index + 1, 0, uuid);
                        }
                    }
                    linkedList[uuid].parent = parId;

                }

            } else if (parent.blockType === 'FBL') {
                let children: string[] = [];
                if (direction === 'left' || direction === 'right') {
                    if (ifEnd(type) && obj.type === 'OB') {
                        setORB_NO_PROPERTY();
                    } else {
                        const Pid: string = generateUuid();
                        if (parent.children) {
                            parent.children.splice(index, 1, Pid);
                        }
                        if (direction === 'left') {
                            children = [uuid, id];
                        } else if (direction === 'right') {
                            children = [id, uuid];
                        }

                        linkedList[Pid] = {
                            blockType: 'ANB',
                            location: { x: 0, y: 0 },
                            width: width,
                            originalWidth: width,
                            originalHeight: 0,
                            height: height,
                            parent: parentId,
                            children: children,
                        };
                        setConnected(obj, linkedList, Pid);
                        if (obj.rightConnectedId !== undefined && obj.connectedIndex !== undefined) {
                            const pin = (linkedList[obj.rightConnectedId].left as FBParameter[])[obj.connectedIndex];
                            pin.connectId = Pid;
                        }
                        linkedList[uuid].parent = Pid;
                        linkedList[id].parent = Pid;
                    }

                } else {
                    // Up/down
                    if (type === 'OB') {
                        if (direction === 'up') {
                            if (parent.children) {
                                parent.children.splice(index, 0, uuid);
                            }

                        } else if (direction === 'down') {
                            if (parent.children) {
                                parent.children.splice(index + 1, 0, uuid);
                            }
                        }
                    } else {
                        const Pid: string = generateUuid();
                        if (parent.children) {
                            parent.children.splice(index, 1, Pid);
                        }

                        if (direction === 'up') {
                            children = [uuid, id];
                        } else if (direction === 'down') {
                            children = [id, uuid];
                        }

                        linkedList[Pid] = {
                            blockType: 'ORB',
                            location: { x: 0, y: 0 },
                            width: width,
                            originalWidth: width,
                            originalHeight: 0,
                            height: height,
                            parent: parentId,
                            children: children,
                        };
                        const pin = (linkedList[(linkedList[id].rightConnectedId as string)].left as FBParameter[])[linkedList[id].connectedIndex as number];
                        pin.connectId = Pid;
                        setConnected(obj, linkedList, Pid);
                        linkedList[uuid].parent = Pid;
                        linkedList[id].parent = Pid;
                    }
                }
            }
        }


        return uuid;
    }
}
/**
 * Merge FB data into linkedList
 * @param linkedList
 * @param uuid
 * @param FBobj
 * @param type
 */
export function setFB(linkedList: TreeNodeObj, uuid: string, FBobj: FirmFBFU, type: string) {
    const FBpinHeight = config.FBpinHeight;
    const fBMargin = config.fBMargin;
    linkedList[uuid].FB = deepClone(FBobj);
    initFBMargin(linkedList[uuid], fBMargin);
    const param: FBParameter[] = <FBParameter[]>FBobj.parameters;
    const left: FBParameter[] = linkedList[uuid].left = [];
    const right: FBParameter[] = linkedList[uuid].right = [];
    for (const o of param) {
        const obj: FBParameter = deepClone(o);
        obj.varNameHeight = FBpinHeight;
        if (o.useType === 'VAR_INPUT') {
            obj.pinOffsetFirstPin = left.length * FBpinHeight;
            left.push(obj);
        } else if (o.useType === 'VAR_OUTPUT') {
            obj.pinOffsetFirstPin = right.length * FBpinHeight;
            right.push(obj);
        } else if (o.useType === 'VAR_IN_OUT') {
            const obj1 = deepClone(o);
            obj1.varNameHeight = FBpinHeight;
            obj.pinOffsetFirstPin = left.length * FBpinHeight;
            obj1.pinOffsetFirstPin = right.length * FBpinHeight;
            left.push(obj);
            right.push(obj1);
        }
    }
    // if (type === 'FU') {
    //  let obj: FBParameter = {
    //      dataType: FBobj.returnType,
    //      desc: 'Output',
    //      name: '',
    //      useType: VAR_USE_TYPE.VAR_OUTPUT,
    //      varNameHeight: FBpinHeight,
    //      pinOffsetFirstPin: right.length * FBpinHeight
    //  }
    //  right.push(obj);
    // }

    const l1 = FBobj.name.length + 1;
    let l2 = 1;
    let l3 = 1;

    for (const o of left) {
        if (l2 < o.name.length) {
            l2 = o.name.length;
        }
    }
    for (const o of right) {
        if (l3 < o.name.length) {
            l3 = o.name.length;
        }
    }
    const l4 = l2 + l3 + 1;
    const length = l4 > l1 ? l4 : l1;
    linkedList[uuid].width = linkedList[uuid].originalWidth = length * config.fontWidth + 2 * config.pinLength;
    linkedList[uuid].varNameHeight = 0.4;
    if (FBobj.paraLessCount !== undefined && FBobj.isAlterable === true) {
        linkedList[uuid].inputNumber = FBobj.paraLessCount + 1;
    } else {
        linkedList[uuid].inputNumber = (linkedList[uuid].left as FBParameter[]).length;
    }
    linkedList[uuid].originalHeight = getFBOriginalHeight(linkedList[uuid]);
    linkedList[uuid].height = linkedList[uuid].originalHeight + (linkedList[uuid].varNameHeight as number);

}

/**
 * judge if the FB block is at the bottom
 */
const ifFBAtBottom = (targetArr: string[], linkedList: TreeNodeObj, index: number): boolean => {

    for (let i = index + 1; i < targetArr.length; i++) {
        const obj = linkedList[targetArr[i]];
        if (obj.blockType === 'ORB') {
            const c = obj.children as string[];
            const index = c.indexOf(targetArr[i + 1]);
            if (index < (c.length - 1)) {
                for (let i = index + 1; i < c.length; i++) {
                    if (linkedList[c[i]].blockType !== 'FBL') {
                        // FBL does not count; others do
                        return false;
                    }
                }
            }
        }
    }
    return true;
};
/**
 * When an AND block has multiple FBs and another already has a left pin connected, temporarily forbid connecting pins on other FBs
 */
function ifMutifyFB(linkedList: TreeNodeObj, targetId: string) {
    const p = linkedList[linkedList[targetId].parent as string];
    const c = p.children as string[];
    if (p.blockType === 'ANB') {
        for (const o of c) {
            const fb = linkedList[o];
            if (o !== targetId && fb.type === 'FB' && fb.leftConnectedId !== undefined) {
                // Temporarily forbid two series FBs from connecting pins at once
                return false;
            }
        }
    }
    return true;
}
function checkRequirement(OBparent: TreeNode, left: FBParameter[], pinIndex: number, targetArr: string[], linkedList: TreeNodeObj, targetId: string) {
    if (
        OBparent.blockType === 'ANB' &&
        left[pinIndex].dataType === 'BOOL' &&
        left[pinIndex].connectId === undefined
    ) {
        for (let i = 0; i < targetArr.length; i++) {
            const o = targetArr[i];
            // FB chain must be the first child of every ANB; the FB itself need not be first
            if (linkedList[o].blockType === 'ANB' && !ifFBFU(linkedList[targetArr[i + 1]].type as string) && (linkedList[o].children as string[]).indexOf(targetArr[i + 1]) > 0) {
                return false;
            }
            if (linkedList[o].blockType === 'FBL' && linkedList[o].rightConnectedId === targetId) {
                // If an ancestor is FBL, the FB parent must be a direct child of that FBL, otherwise wiring is forbidden
                if (OBparent.parent !== o) {
                    return false;
                }
            }
        }
        return true;
    }
    return false;
}
// OB is not inside FBL; it is in parallel with the FB or its parent
// The arrow must be immediately below the FB
// From the OB parent up to the FB, every block must be OB or FBL
const ifCanConnect_FB = (targetIndex: number, c: string[], left: FBParameter[], pinIndex: number, differenceValue: number, linkedList: TreeNodeObj): boolean => {
    // Cannot connect if the pin index is smaller than the lowest already-connected pin
    let lastconnect = -1;
    for (let i = 0; i < left.length; i++) {
        if (left[i].connectId) {
            lastconnect = i;
        }
    }
    if ((pinIndex as number) < (lastconnect + 1)) {
        return false;
    }

    for (let i = 1; i < differenceValue; i++) {
        const o = linkedList[c[targetIndex + i]];
        // Cannot connect if the block above is not an OB
        if (o.blockType === 'ANB') {
            const children = o.children as string[];
            if (linkedList[children[children.length - 1]].type !== 'OB') {
                return false;
            }
        } else if (o.blockType === 'element') {
            return false;
        }
        // Cannot be an ORB; skip this check
    }
    return true;
};
/**
 * Return false if the OB connecting to this FB would cross other blocks
 * @returns
 */
const ifTargetInCorrectSite = (pinIndex: number, left: FBParameter[], linkedList: TreeNodeObj, OBpid: string): boolean => {
    let connectIdDown = undefined;
    let connectIdUp = undefined;
    let downCorrect = false;
    let upCorrect = false;

    for (let i = pinIndex + 1; i < left.length; i++) {
        if (left[i].connectId) {
            // connectId data is always inside an FBL block
            connectIdDown = left[i].connectId;
            break;
        }
    }
    if (connectIdDown) {
        const parentid = linkedList[connectIdDown].parent as string;
        const c = linkedList[parentid].children as string[];
        if (c.indexOf(connectIdDown) > c.indexOf(OBpid)) {
            downCorrect = true;
        }
    } else {
        downCorrect = true;
    }

    for (let i = pinIndex - 1; i > 0; i--) {
        if (left[i].connectId) {
            // connectId data is always inside an FBL block
            connectIdUp = left[i].connectId;
            break;
        }
    }
    if (connectIdUp) {
        const parentid = linkedList[connectIdUp].parent as string;
        const c = linkedList[parentid].children as string[];
        if (c.indexOf(connectIdUp) < c.indexOf(OBpid)) {
            upCorrect = true;
        }
    } else {
        upCorrect = true;
    }

    return (downCorrect && upCorrect);
};
/**
 * Check whether connection is allowed; if so, connect and generate data
 */
const checkAndConnectOB = (obj: COBobj, linkedList: TreeNodeObj, OBpid: string, left: FBParameter[], targetArr: string[], differenceValue: number, target: TreeNode, targetIndex: number, c: string[], OBArr: string[], OBindex: number, rootId: string): boolean => {
    const { OBId: OBid, targetId } = obj;
    const pinIndex = obj.pinIndex as number;
    const OBparent = linkedList[OBpid];
    const grandId = OBparent.parent as string;
    const grandParent = linkedList[grandId];


    // Arrow parent must be ANB; otherwise it is treated as non-boolean data
    if (checkRequirement(OBparent, left, pinIndex, targetArr, linkedList, targetId) && ifMutifyFB(linkedList, targetId)) {
        /**
         * After wiring, if the arrow is already in fbl1, fill in the connected pin
         * parent: parent of the OB
         */
        const handelTreeNode = (parent: TreeNode, fb1Id: string) => {
            const OBpc = parent.children as string[];
            if (OBpc.length === 2) {
                // Two children: remaining element is promoted after deleting OB
                const obj = linkedList[OBpc[0]];// Remaining element after the ANB is cleared by the connection
                const grandfatherc = linkedList[fb1Id].children as string[];
                const index = grandfatherc.indexOf(obj.parent as string);

                grandfatherc.splice(index, 1, OBpc[0]);
                obj.parent = fb1Id;
                obj.connectedIndex = pinIndex;
                obj.rightConnectedId = targetId;
                left[pinIndex].connectId = OBpc[0];
                delete linkedList[OBpid];
            } else {
                parent.parent = fb1Id;
                parent.connectedIndex = pinIndex;
                parent.rightConnectedId = targetId;
                left[pinIndex].connectId = OBpid;
                OBpc.splice(-1);
            }
            delete linkedList[OBid];
        };
        // OB is inside FBL
        if (grandParent.blockType === 'FBL' && grandParent.rightConnectedId === targetId) {

            if (ifTargetInCorrectSite(pinIndex, left, linkedList, OBpid)) {
                // Create the connection
                handelTreeNode(OBparent, grandId);
                return true;// end
            }
        } else {

            if (ifCanConnect_FB(targetIndex, c, left, pinIndex, differenceValue, linkedList)) {
                let FBL = undefined;
                // let FBLi = undefined;
                let FBLid = undefined;

                /**
                 * Check whether an FBL already exists
                 */
                if (target.leftConnectedId !== undefined) {
                    FBL = linkedList[target.leftConnectedId];
                    FBLid = target.leftConnectedId;
                    const obj3: StringArr = {};
                    obj3[OBid] = OBArr;
                    // const FBLArr: string[] = obj3[FBLid] = getAncestorArray(linkedList, FBLid);
                    // Shared ancestor level index and id
                    // const { index } = getPublicNearestTreeNode(obj3); // , rootId was removed

                    // const father = linkedList[FBLArr[index]];
                    // FBLi = father.children.indexOf(FBLArr[index + 1]);


                    //if has FBL block
                    const FBLchildren = FBL.children as string[];
                    // let connectedIndex = undefined;
                    // // Find the last connection index in FBL
                    // for (let o of FBLchildren) {
                    //   if (linkedList[o].connectedIndex !== undefined) {
                    //     connectedIndex = linkedList[o].connectedIndex;
                    //   }
                    // }


                    // if (connectedIndex < pinIndex) {
                    // Insert all blocks from below FBL to the connecting arrow (except other FBLs) into the FBL
                    // const newANBc = c.splice(FBLi + 1, OBindex - FBLi);
                    const newANBc: string[] = [];
                    // let leng = OBindex + 1;
                    // for (let i = FBLi + 1; i < leng; i++) {
                    //   if (linkedList[c[i]].blockType !== 'FBL') {
                    //     newANBc.push(c.splice(i, 1)[0]);
                    //     i--;
                    //     leng--;
                    //   }
                    // }
                    newANBc.push(c.splice(OBindex, 1)[0]);
                    for (let i = 0; i < newANBc.length; i++) {
                        FBLchildren.push(newANBc[i]);
                        linkedList[newANBc[i]].parent = FBLid;
                        if (i === newANBc.length - 1) {
                            handelTreeNode(OBparent, FBLid);
                        }
                    }
                    // Root children that were moved into the FBL

                    return true;// end
                    // }

                } else {
                    //if hasn't FBL block,create a FBL
                    let FBLpid = rootId;// Parent id of the new FBL
                    let FBindex1 = 0;
                    const pobj = linkedList[target.parent as string];
                    if (pobj.blockType === 'ORB' || pobj.blockType === 'FBL') {
                        FBLpid = target.parent as string;
                        FBindex1 = (linkedList[FBLpid].children as string[]).indexOf(targetId) + 1;
                    } else if (pobj.blockType === 'ANB') {
                        FBLpid = pobj.parent as string;
                        FBindex1 = (linkedList[FBLpid].children as string[]).indexOf(target.parent as string) + 1;
                    }
                    const uuid: string = generateUuid();
                    linkedList[uuid] = {
                        blockType: 'FBL',
                        location: { x: 0, y: 0 },
                        width: 1,
                        originalWidth: 1,
                        originalHeight: 0,
                        height: 1,
                        parent: FBLpid,
                        rightConnectedId: targetId,// FBL-to-FB connection id
                        children: []
                    };
                    linkedList[targetId].leftConnectedId = uuid;// FB-to-FBL connection id
                    const arr = linkedList[uuid].children as string[];
                    // const newANBc = c.splice(targetIndex + 1, OBindex - targetIndex);
                    const newANBc = c.splice(OBindex, 1);
                    for (let i = 0; i < newANBc.length; i++) {
                        arr.push(newANBc[i]);
                        linkedList[newANBc[i]].parent = uuid;
                        if (newANBc[i] === OBpid) {
                            handelTreeNode(OBparent, uuid);
                        }
                    }

                    // Insert the FBL into the root node
                    (linkedList[FBLpid].children as string[]).splice(FBindex1, 0, uuid);
                    return true;// end
                }
            }
        }
    }
    return false;// end
};

/**
 * Check whether every ancestor is the first child of its ANB
 * @param index
 * @param targetArr
 * @param linkedList
 * @returns
 */
function ifFirst(index: number, targetArr: string[], linkedList: TreeNodeObj) {
    for (let i = index; i < targetArr.length - 1; i++) {
        const obj = linkedList[targetArr[i]];
        if (obj.blockType === 'ANB' && (obj.children as string[]).indexOf(targetArr[i + 1]) > 0) {
            return false;
        }
    }
    return true;
}
function ifOBorEND(i: number, c: string[], linkedList: TreeNodeObj): boolean {
    const obj = linkedList[c[i]];
    if (obj.blockType === 'ANB') {
        const type = linkedList[(obj.children as string[])[(obj.children as string[]).length - 1]].type;
        if (type === 'OB' || type === 'END') {
            return true;
        }
    } else if (obj.type === 'OB') {
        return true;
    }
    return false;
}
/**
 * Wiring check when an FBL exists;
 * return true means wiring is allowed
 */
function checkFBL(OBindex: number, targetIndex: number, c: string[], linkedList: TreeNodeObj, targetArr: string[], index: number, direction: 'left' | 'right'): boolean {
    // Search ORB from bottom to top until the first closed FB (keep searching for open FBs)
    for (let i = OBindex - 1; i > targetIndex; i--) {
        if (linkedList[c[i]].blockType === 'FBL') {
            const fbId = linkedList[c[i]].rightConnectedId as string;
            let children = [];
            for (let j = index + 1; j < targetArr.length; j++) {
                if (linkedList[targetArr[j]].blockType === 'ANB') {
                    children = linkedList[targetArr[j]].children as string[];
                    if (children.includes(fbId) &&
                        (children.indexOf(targetArr[j + 1]) > children.indexOf(fbId as string) || (children.indexOf(targetArr[j + 1]) === children.indexOf(fbId as string) && direction === 'right'))) {
                        return true;
                    }
                }
            }
            // If the FB is at the outermost level, it must be closed
            if (c.includes(fbId as string)) {
                return false;
            }
            // If the FB is inside an ANB, validate
            if (linkedList[linkedList[fbId as string].parent as string].blockType === 'ANB') {
                const c = linkedList[linkedList[fbId as string].parent as string].children as string[];
                const type = linkedList[c[c.length - 1]].type;
                if (!(type === 'OB' || type === 'END')) {
                    // Closed: stop searching
                    return false;
                }
            }
        }
    }
    return false;
}
/**
 * 
 * @param linkedList
 * @param OBpid
 * @param rootId
 * @param index level of the nearest common ancestor
 * @param targetArr ancestry of the drop-target element
 * @param direction
 * @param OBindex
 * @param targetIndex
 * @returns
 */
function ifCanConnect_common(linkedList: TreeNodeObj, OBpid: string, rootId: string, index: number, targetArr: string[], direction: 'left' | 'right', OBindex: number, targetIndex: number, c: string[]) {
    const OBparent = linkedList[OBpid];
    let can = true;// whether wiring is allowed
    // 1. Check arrow position; connectable when the arrow parent is ANB
    if (!(OBparent.blockType === 'ANB' && OBparent.parent === rootId)) {
        can = false;
    }
    // 2. Check target position
    // If the arrow and target are not adjacent, all blocks between them must be arrows
    if (linkedList[rootId].blockType === 'ORB' && OBindex > (targetIndex + 1)) {
        let allOb = true;
        for (let i = targetIndex + 1; i < OBindex + 1; i++) {
            if (!ifOBorEND(i, c, linkedList)) {
                allOb = false;
            }
        }
        if (!allOb && !checkFBL(OBindex, targetIndex, c, linkedList, targetArr, index, direction)) {
            can = false;
        }
    }

    for (let i = index + 1; i < targetArr.length - 1; i++) {
        const obji = linkedList[targetArr[i]];
        const objic = obji.children as string[];
        const sonId = targetArr[i + 1];
        // const son = linkedList[sonId];
        const index1 = objic.indexOf(sonId);
        if (obji.blockType === 'ANB') {

            if (direction === 'left' && ifFirst(index, targetArr, linkedList)) {
                can = false;
                break;
            }
            // // First-level ANB may be at any position; descendants must be on the sides
            // if (i > index + 2 && son.blockType === 'ORB' && index > 0 && index < objic.length - 1) {

            // }
        }
        else if (obji.blockType === 'ORB') {
            if (OBindex < targetIndex) {
                if (index !== 0) {
                    can = false;
                    break;
                }
            } else {
                /**
                 * Find the last non-FBL element in an ORB
                 * @param objic
                 * @param linkedList
                 * @returns
                 */
                const findLastNotFBL = (objic: string[], linkedList: TreeNodeObj): number => {
                    for (let i = objic.length - 1; i > -1; i--) {
                        if (linkedList[objic[i]].blockType !== 'FBL') {
                            return i;
                        }
                    }
                    // The first child of an ORB is never FBL
                    return 0;
                };
                const lastIndex = findLastNotFBL(objic, linkedList);
                if (lastIndex !== (objic.length - 1)) {
                    can = false;
                    break;
                }
                // In an ORB, only the bottom-most target may be wired
                if (index1 !== (objic.length - 1)) {
                    can = false;
                    break;
                }
            }
        }
    }

    /**
     * Walk from leaf to parent; forbid wiring for nodes in the middle of an ANB (except the leftmost block adjacent to the relevant region)
     */

    if (!isANBfirstchild(targetArr, linkedList, index)) {
        for (let i = targetArr.length - 3; i > index; i--) {
            const obj = linkedList[targetArr[i]];
            if (obj.blockType === 'ORB' && linkedList[targetArr[i + 1]].blockType === 'ANB') {
                const anbi = (linkedList[targetArr[i]].children as string[]).indexOf(targetArr[i + 1]);
                if (!((anbi === 0 && direction === 'left') || (anbi === ((linkedList[targetArr[i]].children as string[]).length - 1) && direction === 'right'))) {
                    // When not adjacent: node is in ANB and not leftmost/rightmost; this is its index in targetArr
                    can = false;
                }
            }
        }
    }
    /**
     * Check whether the current chain is the first child of every ancestor ANB
     */
    function isANBfirstchild(targetArr: string[], linkedList: TreeNodeObj, index: number) {
        let obj;
        // Loop must stop at targetArr.length - 2: only check ANB blocks, not element positions. Using length - 1 would include the leaf and interfere
        for (let i = index; i < targetArr.length - 2; i++) {
            obj = linkedList[targetArr[i]];
            if (obj.blockType === 'ANB' && (obj.children as string[]).indexOf(targetArr[i + 1]) !== 0) {
                return false;
            }
        }
        return true;
    }
    return can;
}

function connectLine(linkedList: TreeNodeObj, OBpid: string, id2: string, targetArr: string[], index: number, OBindex: number, targetIndex: number, targetId: string, c: string[], target: TreeNode, direction: 'left' | 'right', data: Data, OBId: string) {

    // Right-side wiring: only connect sibling elements whose shared grandparent is a parallel block
    const OBparent = linkedList[OBpid];
    /**
     * target object one level below the shared parent
     */
    const targetAncestor = linkedList[id2];
    /**
     * children of that object
     */
    const tAc = targetAncestor.children as string[];
    /**
     * Id of the element being added
     */
    let operateId: string | undefined = undefined;
    let operateBlock: TreeNode;
    let oc: string[] = [];
    let targetC2Index: number | undefined = undefined;
    /**
     * Get the closing node
     * @returns
     */
    const getoperateId = (): number => {
        const index1 = targetArr.length - 2;
        for (let i = index; i < targetArr.length - 1; i++) {
            const o = targetArr[i];
            // Series (ANB), and the next-level block is not the first child
            if (linkedList[o].blockType === 'ANB' && (linkedList[o].children as string[]).indexOf(targetArr[i + 1]) !== 0) {
                return i;
            }
        }
        // Default: second-to-last block
        return index1;
    };

    const operateIndex = getoperateId();
    operateId = targetArr[operateIndex];// Id of the block that needs to be closed
    operateBlock = linkedList[operateId];
    oc = operateBlock.children as string[];
    /**
     * Next-level id of the block that needs to be closed
     */
    targetC2Index = oc.indexOf(targetArr[operateIndex + 1]);


    const setORB = () => {
        if (OBindex > targetIndex) {
            const newANBc = c.splice(targetIndex + 1, OBindex - targetIndex);
            for (let i = 0; i < newANBc.length; i++) {
                (operateBlock.children as string[]).push(newANBc[i]);
                linkedList[newANBc[i]].parent = operateId;
            }
        } else {
            const newANBc = c.splice(OBindex, targetIndex - OBindex);
            for (let i = newANBc.length - 1; i > -1; i--) {
                (operateBlock.children as string[]).unshift(newANBc[i]);
                linkedList[newANBc[i]].parent = operateId;
            }
        }
        deleteOB();
    };
    const FBLGetORB = () => {
        // Closing block is FBL
        // target's parent is FBL
        const uuidORB: string = generateUuid();
        linkedList[uuidORB] = {
            blockType: 'ORB',
            location: { x: 0, y: 0 },
            width: 1,
            originalWidth: 1,
            originalHeight: 0,
            height: 1,
            parent: operateId,
            children: [targetId]
        };
        setConnected(target, linkedList, uuidORB);
        oc.splice(targetC2Index as number, 1, uuidORB);
        target.parent = uuidORB;
        operateId = uuidORB;
        operateBlock = linkedList[uuidORB];
    };
    const setFBL = () => {
        FBLGetORB();
        if (OBindex > targetIndex) {
            const newANBc = c.splice(targetIndex + 1, OBindex - targetIndex);
            for (let i = 0; i < newANBc.length; i++) {
                (operateBlock.children as string[]).push(newANBc[i]);
                linkedList[newANBc[i]].parent = operateId;
            }
        } else {
            const newANBc = c.splice(OBindex, targetIndex - OBindex);
            for (let i = newANBc.length - 1; i > -1; i--) {
                (operateBlock.children as string[]).unshift(newANBc[i]);
                linkedList[newANBc[i]].parent = operateId;
            }
        }
        deleteOB();
    };
    const targetGetORB = () => {
        const uuidORB: string = generateUuid();
        linkedList[uuidORB] = {
            blockType: 'ORB',
            location: { x: 0, y: 0 },
            width: 1,
            originalWidth: 1,
            originalHeight: 0,
            height: 1,
            parent: id2,
            children: [operateId as string]
        };
        setConnected(operateBlock, linkedList, uuidORB);
        operateBlock.parent = uuidORB;
        tAc.splice(0, 1, uuidORB);
        operateId = uuidORB;
        operateBlock = linkedList[uuidORB];
    };
    const setORBAndANB = () => {
        if (tAc !== undefined) {
            // Create a new ORB and ANB
            let newANBc: string[] = [];
            if (direction === 'left') {
                newANBc = oc.splice(0, targetC2Index);
            } else if (direction === 'right') {
                newANBc = oc.splice(0, (targetC2Index as number) + 1);
            }

            const uuidANB: string = generateUuid();
            const uuidORB: string = generateUuid();
            linkedList[uuidORB] = {
                blockType: 'ORB',
                location: { x: 0, y: 0 },
                width: 1,
                originalWidth: 1,
                originalHeight: 0,
                height: 1,
                parent: operateId,
                children: []
            };
            if (newANBc.length > 1) {
                linkedList[uuidANB] = {
                    blockType: 'ANB',
                    location: { x: 0, y: 0 },
                    width: 1,
                    originalWidth: 1,
                    originalHeight: 0,
                    height: 1,
                    parent: uuidORB,
                    children: newANBc
                };
                for (const o of newANBc) {
                    linkedList[o].parent = uuidANB;
                }
                linkedList[uuidORB].children = [uuidANB];
                setConnected(linkedList[newANBc[0]], linkedList, uuidORB);
            } else if (newANBc.length === 1) {
                linkedList[newANBc[0]].parent = uuidORB;
                linkedList[uuidORB].children = newANBc;
            }


            if (OBindex > targetIndex) {
                const arr = c.splice(targetIndex + 1, OBindex - targetIndex);
                for (let i = 0; i < arr.length; i++) {
                    (linkedList[uuidORB].children as string[]).push(arr[i]);
                    linkedList[arr[i]].parent = uuidORB;
                }
            } else {
                const arr = c.splice(OBindex, targetIndex - OBindex);
                for (let i = arr.length - 1; i > -1; i--) {
                    (linkedList[uuidORB].children as string[]).unshift(arr[i]);
                    linkedList[arr[i]].parent = uuidORB;
                }
            }
            oc.unshift(uuidORB);
            deleteOB();
            mergeNode(uuidORB, data);
            // for (let o of newANBc) {
            //  mergeNode(o, data);
            // }

        }

    }
    const deleteOB = () => {
        deleteElement(OBId, data, true);
    };
    // If the arrow is below the drop target, it must be at the bottom of the parallel group, and first or last in the inner series

    if (OBindex > targetIndex) {
        if (direction === 'left') {
            if (targetAncestor.blockType !== 'element' && targetC2Index !== 0) {
                if (targetC2Index === 1 && operateBlock.blockType === 'ORB') {
                    // If the parallel block is already an ORB, do not create a new ORB
                    // Merge all blocks below target and above the arrow
                    setORB();
                } else if (targetC2Index === 1 && operateBlock.blockType === 'FBL') {
                    setFBL();
                } else {
                    // Create a new ORB and ANB
                    setORBAndANB();
                }
            } else if (targetAncestor.blockType === 'element') {
                delete linkedList[OBId];
                const OBc = OBparent.children as string[];
                OBc.splice(OBc.indexOf(OBId), 1);
            }
        } else if (direction === 'right') {

            if (targetAncestor.blockType !== 'element') {

                // If the parallel block is already an ORB, do not create a new ORB
                // Merge all blocks below target and above the arrow
                if (operateBlock.blockType === 'ORB') {
                    setORB();
                } else if (operateBlock.blockType === 'FBL') {
                    setFBL();
                } else if (operateBlock.blockType === 'ANB') {
                    // Create a new ORB and ANB
                    setORBAndANB();
                }


            } else if (targetAncestor.blockType === 'element') {
                delete linkedList[OBId];
                const OBc = OBparent.children as string[];
                OBc.splice(OBc.indexOf(OBId), 1);
            }
        }
    } else {
        // If the arrow is above the drop target, it must be the first in the parallel group, and first or last in the inner series

        if (direction === 'left') {
            if (targetAncestor.blockType !== 'element' && targetC2Index !== 0) {
                if (targetC2Index === 1) {
                    // If the parallel block is already an ORB, do not create a new ORB
                    // Merge all blocks below target and above the arrow
                    if (operateBlock.blockType === 'ORB') {
                        setORB();
                    } else if (operateBlock.blockType === 'element') {
                        targetGetORB();
                        setORB();
                    } else {
                        // Create a new ORB and ANB
                        setORBAndANB();
                    }

                } else {
                    // Create a new ORB and ANB
                    setORBAndANB();

                }
            } else if (targetAncestor.blockType === 'element') {
                deleteOB();
            }
        } else if (direction === 'right') {
            if (targetAncestor.blockType !== 'element') {

                if (targetC2Index === 0 && operateBlock.blockType === 'ORB') {
                    // If the parallel block is already an ORB, do not create a new ORB
                    // Merge all blocks below target and above the arrow
                    setORB();
                } else {
                    // Create a new ORB and ANB
                    setORBAndANB();

                }
            } else if (targetAncestor.blockType === 'element') {
                deleteOB();
            }
        }
    }
    if (linkedList[OBpid]) {
        // When the OB parent has only one other element besides OB, merge up to the grandparent (delete the single-child block)
        mergeNode(OBpid, data);
    }

    // Clear referenced external properties to release closure refs and avoid leaks

}
interface COBobj {
    /**
     * Arrow id
     */
    OBId: string;
    /**
     * Connection id
     */
    targetId: string;
    /**
     * Connection direction
     */
    direction: 'left' | 'right';
    /**
     * Connected pin index
     */
    pinIndex?: number;
}
/**
 * connect arrow
 * @param obj
 * @param data
 * @param ifSaveCache whether to store undo/redo cache
 * @returns
 */
export function connectOB(obj: COBobj, data: Data): boolean {
    const { OBId, targetId, direction, pinIndex } = obj;
    if (OBId === targetId) {
        return false;
    }
    const linkedList = data.linkedList;
    const ob = linkedList[OBId];
    const OBpid = ob.parent;

    const obj2: StringArr = {};
    /**
     * Ancestry of OBId
     */
    const OBArr: string[] = obj2[OBId] = getAncestorArray(linkedList, OBId);
    /**
     * Ancestry of targetId
     */
    const targetArr: string[] = obj2[targetId] = getAncestorArray(linkedList, targetId);
    // Shared ancestor level index and id
    const { index, rootId } = getPublicNearestTreeNode(obj2);
    const root = linkedList[rootId];
    const target = linkedList[targetId];
    const left = <FBParameter[]>target.left;
    /**
     * OB's first-level block under the nearest common ancestor
     */
    const id1 = OBArr[index + 1];
    /**
     * Drop target's first-level block under the nearest common ancestor
     */
    const id2 = targetArr[index + 1];
    const c = root.children as string[];
    /**
     * OB index in the outermost parallel block
     */
    const OBindex = c.indexOf(id1);
    /**
     * target index in the outermost parallel block
     */
    const targetIndex = c.indexOf(id2);
    const differenceValue = OBindex - targetIndex;// index difference

    // When the connection target is a function block
    if (ifFBFU(target.type as string) && pinIndex && direction === 'left') {

        if (root.blockType === 'ORB' || root.blockType === 'FBL') {

            // First left pin cannot be connected; nearest common ancestor must be a parallel block; arrow-to-root depth must be 3; FB must be at the bottom of the diagram; must connect a left pin

            if (
                pinIndex !== 0 &&
                ifFBAtBottom(targetArr, linkedList, index)
            ) {
                if (checkAndConnectOB(obj, linkedList, OBpid as string, left, targetArr, differenceValue, target, targetIndex, c, OBArr, OBindex, rootId)) {
                    return true;
                }
            }
        }

    } else {
        // When connecting a non-function-block
        if (ifCanConnect_common(linkedList, OBpid as string, rootId, index, targetArr, direction, OBindex, targetIndex, c)) {
            connectLine(linkedList, OBpid as string, id2, targetArr, index, OBindex, targetIndex, targetId, c, target, direction, data, OBId);
            return true;
        }
    }




    return false;
}
/**
 * Check whether wiring is allowed
 * @param obj
 * @param data
 * @param ifSaveCache
 * @returns
 */
export function ifCanConnectOB(obj: COBobj, data: Data): boolean {

    const { OBId, targetId, direction, pinIndex } = obj;
    if (OBId === targetId) {
        return false;
    }
    const linkedList = data.linkedList;
    const ob = linkedList[OBId];
    const OBpid = ob.parent;
    const obj2: StringArr = {};
    // Get tree indexes of the FB and the arrow
    const OBArr: string[] = obj2[OBId] = getAncestorArray(linkedList, OBId);
    const targetArr: string[] = obj2[targetId] = getAncestorArray(linkedList, targetId);
    // Shared ancestor level index and id
    const { index, rootId } = getPublicNearestTreeNode(obj2);
    const root = linkedList[rootId];
    const target = linkedList[targetId];
    const left = <FBParameter[]>target.left;
    const OBparent = linkedList[OBpid as string];
    const grandId = OBparent.parent;
    const grandParent = linkedList[grandId as string];
    /**
     * OB's first-level block under the nearest common ancestor
     */
    const id1 = OBArr[index + 1];
    /**
     * Drop target's first-level block under the nearest common ancestor
     */
    const id2 = targetArr[index + 1];
    const c = root.children as string[];
    /**
     * OB index in the outermost parallel block
     */
    const OBindex = c.indexOf(id1);
    /**
     * target index in the outermost parallel block
     */
    const targetIndex = c.indexOf(id2);
    const differenceValue = OBindex - targetIndex;// index difference

    // When the connection target is a function block
    if (ifFBFU(target.type as string) && pinIndex && direction === 'left') {

        /**
         * Check whether connection is allowed; if so, connect and generate data
         */
        const checkOB = (obj: COBobj): boolean => {
            const targetId = obj.targetId;
            const pinIndex = obj.pinIndex as number;

            // Arrow parent must be ANB; otherwise it is treated as non-boolean data
            if (checkRequirement(OBparent, left, pinIndex, targetArr, linkedList, targetId) && ifMutifyFB(linkedList, targetId)) {

                // OB is inside FBL
                if (grandParent.blockType === 'FBL' && grandParent.rightConnectedId === targetId) {


                    if (ifTargetInCorrectSite(pinIndex, left, linkedList, OBpid as string)) {
                        return true;// end
                    }


                } else {
                    if (ifCanConnect_FB(targetIndex, c, left, pinIndex, differenceValue, linkedList)) {
                        return true;// end
                    }
                }
                return false;// end
            }
        };
        if (root.blockType === 'ORB' || root.blockType === 'FBL') {

            // First left pin cannot be connected; nearest common ancestor must be a parallel block; arrow-to-root depth must be 3; FB must be at the bottom of the diagram; must connect a left pin

            if (pinIndex !== 0 && ifFBAtBottom(targetArr, linkedList, index) && checkOB(obj)) {
                return true;
            }
        }

    } else {
        // When connecting a non-function-block
        if (ifCanConnect_common(linkedList, OBpid as string, rootId, index, targetArr, direction, OBindex, targetIndex, c)) {
            return true;
        }
    }
    return false;
}
/**
 * a function that can merge tree nodes
 * @param parentObj
 * @param pid
 * @param linkedList
 * @param rootId
 */
export function mergeNode(pid: string, data: Data, ifSaveCache?: boolean) {
    // If parent and grandparent have the same type, delete the parent and merge children into the grandparent
    const { linkedList, rootId } = data;
    const parentObj = linkedList[pid];
    if (parentObj === undefined) { return; }
    const c = parentObj.children;
    const grandfatherId = parentObj.parent;

    let grandfather: TreeNode;
    if (grandfatherId) {
        grandfather = linkedList[grandfatherId];
    } else {
        return;
    }

    if (
        c !== undefined &&
        (
            parentObj.blockType !== 'FBL' ||
            (parentObj.blockType === 'FBL' && c.length === 0)
        ) &&
        pid !== rootId
    ) {


        const pindex: number = (grandfather.children as string[]).indexOf(pid);


        if (c.length === 0) {
            if (parentObj.parent && linkedList[parentObj.parent].blockType === 'FBL') {
                // If connected to an FB, remove FB connection params
                delConnectId(linkedList, pid);
            }
            if (parentObj.blockType === 'FBL') {
                linkedList[parentObj.rightConnectedId as string].leftConnectedId = undefined;
            }
            delete linkedList[pid];
            (grandfather.children as string[]).splice(pindex, 1);
            if (grandfatherId) {
                delOB(linkedList, grandfatherId, data);
            }
        } else {
            // Take remaining elements
            if (c.length === 1) {
                const id1 = c[0];
                // Copy FBL connection params
                if (parentObj.parent && linkedList[parentObj.parent].blockType === 'FBL' && parentObj.rightConnectedId !== undefined) {
                    linkedList[id1].rightConnectedId = parentObj.rightConnectedId;
                    linkedList[id1].connectedIndex = parentObj.connectedIndex;
                    (linkedList[linkedList[id1].rightConnectedId as string].left as FBParameter[])[linkedList[id1].connectedIndex as number].connectId = id1;
                }
                // Delete the parent block
                delete linkedList[pid];

                // Merge remaining element into the grandparent
                linkedList[id1].parent = grandfatherId;
                (grandfather.children as string[]).splice(pindex, 1, id1);
                // If remaining block has the same blockType as the grandparent, merge into the grandparent
                if (linkedList[id1].blockType === grandfather.blockType && grandfather.blockType !== 'FBL') {
                    const id1c: string[] = linkedList[id1].children as string[];
                    if (id1c.length) {
                        for (let i = 0; i < id1c.length; i++) {
                            linkedList[id1c[i]].parent = grandfatherId;
                        }
                    }
                    const gc = grandfather.children as string[];
                    gc.splice(pindex, 1, ...id1c);
                    // If connected to an FB, remove FB connection params
                    delConnectId(linkedList, id1);
                    // Delete the original remaining-element block
                    delete linkedList[id1];
                }
                if (grandfatherId) {
                    delOB(linkedList, grandfatherId, data);
                }
            } else if (parentObj.blockType === grandfather.blockType && grandfather.blockType !== 'FBL') {

                if (c.length) {
                    for (let i = 0; i < c.length; i++) {
                        linkedList[c[i]].parent = grandfatherId;
                    }
                }
                const gc = grandfather.children as string[];
                gc.splice(pindex, 1, ...c);
                // Delete the remaining-element block
                delete linkedList[pid];
                // If two arrows are in series, delete one
                if (grandfather.blockType === 'ANB') {
                    if (gc.length > 1) {
                        if (linkedList[gc[gc.length - 1]].type === 'OB' && linkedList[gc[gc.length - 2]].type === 'OB') {
                            delete linkedList[gc[gc.length - 1]];
                            gc.splice(gc.length - 1, 1);
                        }
                    }
                }
                if (grandfatherId) {
                    delOB(linkedList, grandfatherId, data);
                }
            }
        }
    } else {
        if (linkedList[pid]) {
            delOB(linkedList, pid, data);
        }
    }

    if (grandfatherId !== undefined && grandfather.parent !== undefined) {
        mergeNode(grandfatherId, data);
    }
}



export function deleteElement(id: string, data: Data, force: boolean, ifSaveCache?: boolean): boolean {

    const linkedList = data.linkedList;
    if (linkedList[id] === undefined) {
        return false;
    }
    const rootId = data.rootId;
    const obj = linkedList[id];
    const pid = obj.parent;
    const parent = linkedList[pid as string];
    const c = parent.children as string[];

    const ifCanDelete = (obj: TreeNode) => {
        if (obj.type === 'OB') {
            if (pid === rootId &&
                (
                    (parent.blockType === 'ORB' && c.length === 1) ||
                    (parent.blockType === 'ANB' && c.indexOf(id) === c.length - 1)
                )
            ) {
                return false;
            }
            if (parent.blockType === 'ANB' && c.length > 1) {
                if (c.indexOf(id) < c.length - 1) {
                    return true;
                }
                let OBnum = 0;
                for (const o of parent.children as string[]) {
                    if (linkedList[o].type === 'OB') {
                        OBnum++;
                    }
                }
                if (OBnum > 1) {
                    return true;
                } else {
                    return false;
                }

            }
        }
        return true;
    };
    // Validate when not force-deleting
    if (force !== true) {
        if (!ifCanDelete(obj)) {
            return false;
        }
    }

    const index: number = parent.children ? parent.children.indexOf(id) as number : 0;
    if (ifEnd(obj.type as string)) {
        // Coil
        const pid = obj.parent;
        const p = linkedList[pid as string];
        const c = p.children as string[];

        if (c.indexOf(id) === (c.length - 2) && linkedList[c[c.length - 1]].type === 'END') {
            const uuid: string = generateUuid();
            linkedList[uuid] = {
                blockType: 'element',
                type: 'OB',
                location: { x: 0, y: 0 },
                width: 1,
                originalWidth: 1,
                originalHeight: 1,
                height: 1,
                varNameHeight: 0.4,
                parent: pid,
            };
            delete linkedList[c[c.length - 1]];
            c.splice(c.length - 1, 1, uuid);
        }
    }
    // Remove from children
    if (c) {
        c.splice(index, 1);
    }
    if (ifFBFU(obj.type as string)) {
        const fblid = obj.leftConnectedId;
        const rid = obj.rightConnectedId;
        if (rid !== undefined) {
            delete (linkedList[rid].left as FBParameter[])[obj.connectedIndex as number].connectId;
        }
        if (fblid !== undefined) {
            const fbl = linkedList[fblid];
            const fblc = fbl.children as string[];

            const arr: string[] = [];
            for (let i = 0; i < fblc.length; i++) {
                const fblcid = fblc[i];
                const fblco = linkedList[fblcid];
                if (fblco.blockType !== 'FBL') {
                    delete fblco.rightConnectedId;
                    delete fblco.connectedIndex;
                }






                if (fblco.blockType === 'ANB' && linkedList[(fblco.children as string[])][(fblco.children as string[]).length - 1].type !== 'OB') {
                    const uuid: string = generateUuid();
                    (fblco.children as string[]).push(uuid);
                    linkedList[uuid] = {
                        blockType: 'element',
                        type: 'OB',
                        location: { x: 0, y: 0 },
                        width: 1,
                        originalWidth: 1,
                        originalHeight: 1,
                        height: 1,
                        varNameHeight: 0.4,
                        parent: fblcid,
                    };
                    fblco.parent = fbl.parent;
                    arr.push(fblcid);
                } else if ((fblco.blockType === 'element' && fblco.type !== 'OB') || fblco.blockType === 'ORB') {
                    const uuid: string = generateUuid();
                    const uuidANB: string = generateUuid();
                    linkedList[uuidANB] = {
                        blockType: 'ANB',
                        location: { x: 0, y: 0 },
                        width: 1,
                        originalWidth: 1,
                        originalHeight: 0,
                        height: 1,
                        parent: fbl.parent,
                        children: [fblcid, uuid]
                    };
                    fblco.parent = uuidANB;
                    linkedList[uuid] = {
                        blockType: 'element',
                        type: 'OB',
                        location: { x: 0, y: 0 },
                        width: 1,
                        originalWidth: 1,
                        originalHeight: 1,
                        height: 1,
                        varNameHeight: 0.4,
                        parent: fblcid,
                    };
                    arr.push(uuidANB)
                } else {
                    fblco.parent = fbl.parent;
                    arr.push(fblcid);
                }


            }
            // Promote FB pin elements up one level
            const fblp = linkedList[fbl.parent as string];

            const pc = fblp.children as string[];

            const ancestorArr = getAncestorArray(linkedList, id);
            /**
             * Index of the sibling parent of FB and FBL; dismantled FBL contents are placed immediately below this FB
             */
            let insertIndex = 0;
            for (let i = 0; i < ancestorArr.length; i++) {
                if (ancestorArr[i] === fbl.parent) {
                    insertIndex = pc.indexOf(ancestorArr[i + 1]);
                }
            }
            // Delete FBL
            pc.splice(pc.indexOf(fblcid), 1);
            // Place dismantled FBL contents below the FB
            pc.splice(insertIndex + 1, 0, ...arr);
            delete linkedList[fblcid];

        }

    }
    delConnectId(linkedList, id);

    // Delete the main element
    delete linkedList[id];
    // When a coil is present, replace the arrow with END
    if (c.length > 1 && linkedList[c[c.length - 1]].type === 'OB' && ifEnd(linkedList[c[c.length - 2]].type as string)) {
        delete linkedList[c[c.length - 1]];
        const uuid1 = generateUuid();
        linkedList[uuid1] = {
            blockType: 'element',
            type: 'END',
            location: { x: 0, y: 0 },
            width: 1,
            originalWidth: 1,
            originalHeight: 1,
            height: 1,
            varNameHeight: 0.4,
            parent: pid,
        };
        c.splice(c.length - 1, 1, uuid1);
    }

    // When only one element remains, deleting it removes the parent and promotes the leftover element
    mergeNode(pid as string, data);

    return true;
}
function delOB(linkedList: TreeNodeObj, pid: string, data: Data) {

    // Clean up extra arrows
    try {
        const parentObj = linkedList[pid];
        if (parentObj === undefined) {
            return;
        }

        const c = parentObj.children;
        if (c !== undefined && parentObj.blockType === 'ANB') {
            for (let i = 0; i < c.length; i++) {
                if (linkedList[c[i]].type === 'OB' && i !== (c.length - 1)) {
                    deleteElement(c[i], data, true);
                    i--;
                }
            }
        }
        if (parentObj.parent) {
            delOB(linkedList, parentObj.parent, data);
        }
    } catch (error) {
        console.error(error);
    }

}

/**
 * 
 * @param id block
 * @param dir FB left or right
 * @param fbIndex left-pin index of the variable on the FB
 * @param width max text width on the FB left or right (dir), in px
 * @param val variable name
 * @param vid variable id, optional
 * @param varNameHeight combined height of variable + comment + address
 * @param varHeight variable-name height
 * @param varAddr variable address
 * @param varDesc variable comment
 * @param varDataType variable data type
 * @param pouName POU file name
 * @param jumpId jump id
 * @param jumpName jump name
 * @param jumpIndex index of the FB left sub-pin to jump to
 * @param _this Lad object
 */
export interface setVarNameParam {
    id: string;
    dir?: 'left' | 'right';
    fbIndex?: number;
    width?: number;
    val: string;
    vid?: string;
    varNameHeight: number;
    varHeight?: number;
    varAddr?: string;
    varDesc?: string;
    varDataType?: string;
    pouName?: string;
    data?: Data;
    jumpId?: string;
    jumpName?: string;
    jumpIndex?: number;
}
export function setPinWidth(width: number, dir: 'left' | 'right', obj: TreeNode, fbIndex: number) {
    let basicLength;
    if (SingletonOpInfo && SingletonOpInfo.instance && SingletonOpInfo.instance.getBasicLength()) {
        basicLength = SingletonOpInfo.instance.getBasicLength();
    } else {
        basicLength = config.basicLength;
    }
    const wordWidth = width / basicLength;
    let maxWidth = 0.1;
    if (dir === 'left') {
        const lobj = obj.left as FBParameter[];
        lobj[fbIndex].textWidth = wordWidth;
        for (const o of lobj) {
            if (o.textWidth && o.textWidth > maxWidth) {
                maxWidth = o.textWidth;
            }
        }
        (obj.marginLeft as number) += (maxWidth - (obj.leftWidth as number));
        obj.leftWidth = maxWidth;
    } else {
        const robj = obj.right as FBParameter[];
        robj[fbIndex].textWidth = wordWidth;
        for (const o of robj) {
            if (o.textWidth && o.textWidth > maxWidth) {
                maxWidth = o.textWidth;
            }
        }
        (obj.marginRight as number) += (maxWidth - (obj.rightWidth as number));
        obj.rightWidth = maxWidth;
    }
}
export function setVarName(
    param: setVarNameParam
) {
    const { id, dir, fbIndex, val, varNameHeight, data, width, varHeight } = param;
    const obj = (data as Data).linkedList[id];
    if (dir !== undefined && fbIndex !== undefined) {
        // Update FB pin variable
        if (width !== undefined) {
            setPinWidth(width, dir, obj, fbIndex);
        }
        const pinObj = (obj[dir] as FBParameter[])[fbIndex];
        pinObj.varName = val;
        pinObj.varNameHeight = varNameHeight < 0.6 ? 0.6 : varNameHeight;
        if (varHeight !== undefined && varHeight !== null) {
            (obj[dir] as FBParameter[])[fbIndex].varHeight = varHeight < 0.6 ? 0.6 : varHeight;
        }

        if (val) {
            pinObj.varName = val;
            pinObj.varDesc = param.varDesc;
            pinObj.varAddr = param.varAddr;
            pinObj.varDataType = param.varDataType;
        } else {
            pinObj.varName = val;
            // When there is no variable, clear address and comment
            pinObj.varDesc = undefined;
            pinObj.varAddr = undefined;
            pinObj.varDataType = undefined;
        }
        pinObj.pouName = param.pouName;
        initFbPin(obj);
    } else {
        if (val) {
            setVarNameOtherData(obj, {
                varName: val,
                varDesc: param.varDesc,
                varAddr: param.varAddr,
                varDataType: param.varDataType,
                jumpId: param.jumpId,
                jumpName: param.jumpName,
                jumpIndex: param.jumpIndex,
            });
        } else {
            // When there is no variable, clear address and comment
            setVarNameOtherData(obj, {
                varName: undefined,
                varDesc: undefined,
                varAddr: undefined,
                varDataType: undefined,
                jumpId: undefined,
                jumpName: undefined,
                jumpIndex: undefined,
            });
        }
        obj.pouName = param.pouName;
        obj.varNameHeight = varNameHeight;
        obj.varHeight = param.varHeight;
    }

    // grammarMakerProblems({ [id]: obj }, function (error: any, res: string) {
    //     if (error === null) {
    //         obj.error = res;
    //         updateCanvas({
    //             _this: _this,
    //             id: _this.data.rootId,
    //         });
    //     }
    // }, undefined);
}

function setVarNameOtherData(
    target: TreeNode,
    data: {
        varName: string | undefined;
        varDesc: string | undefined;
        varAddr: string | undefined;
        varDataType: string | undefined;
        jumpId: string | undefined;
        jumpName: string | undefined;
        jumpIndex: number | undefined;
    }
) {
    const obj: { [k: string]: any } = data;
    const target1: { [k: string]: any } = target;
    for (const key of Object.keys(obj)) {
        target1[key] = obj[key];
    }
}

/**
 * add function rule check
 */
export const addCheck = (linkedList: TreeNodeObj, type: ElementType, direction: 'left' | 'right' | 'up' | 'down', id: string, obj: TreeNode) => {
    const objLength = Object.keys(linkedList).length;
    if (objLength === 1501) {
        throwNotifyInfoHandle('当前程序段剩余可放置500元素', 1);
    }
    if (objLength === 1801) {
        throwNotifyInfoHandle('当前程序段剩余可放置200元素', 1);
    }
    if (objLength === 1901) {
        throwNotifyInfoHandle('当前程序段剩余可放置100元素', 1);
    }
    if (objLength === 2001) {
        throwNotifyInfoHandle('当前程序段元素数量已到最大值', 1);
        return false;
    }
    if (type === 'OB') {
        // Validate
        if (direction === 'left' || direction === 'right' || direction === 'up') {
            // Forbid wiring
            return false;
        }
    }
    if (ifEnd(type)) {
        // Validate
        if (obj.type !== 'OB') {
            throwNotifyInfoHandle('线圈、jump、return只能放置到箭头处', 2);
            return false;
        }
        if (direction !== 'left') {
            // Forbid wiring
            return false;
        }
    }
    if (ifEnd(obj.type as string) && type !== 'OB') {
        if (direction === 'down') {
            // Coils cannot be paralleled with non-OB elements
            return false;
        }
    }
    if (direction === 'down' && ifFBFU(obj.type as string) && obj.leftConnectedId) {
        // FBs with connected pins cannot have elements paralleled
        return false;
    }
    if (!type || !id) { return false; }// Missing required fields
    
    return true;
};
