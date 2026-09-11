



import { deepClone } from '@/app/common/objects';
import { generateUuid } from '@/app/common/uuid';
import { Data, TreeNode, TreeNodeObj } from '@/app/lad/class/index';
import { getAncestorArray, ifFBFU } from '@/app/lad/controller/calculate';
import Lad from '@/app/lad/index';
import { saveCache } from '@/app/lad/service/saveCache';
import scrollFun_ from '@/app/lad/service/scrollFun';
import { throwNotifyInfoHandle } from '@/app/lad/service/throwNotifyInfoHandle';
import { deleteElement, mergeNode } from '@/app/lad/service/transformData';
import { updateCanvas } from '@/app/lad/service/updateCanvas';

export function deleteArr(id: string[], _this: Lad, ifSaveCache: boolean): void {
    let cache;
    if (ifSaveCache) {
        cache = deepClone(_this.data);
    }
    let changed = false;
    for (const o of id) {
        let res = false;
        res = deleteElement(o, _this.data, false);
        if (res) {
            changed = true;
        }
    }
    if (changed) {
        updateCanvas({
            _this: _this,
            id: _this.data.rootId,

        });
    }
    scrollFun_.scrollFun();
    if (ifSaveCache) {
        saveCache({
            type: 'programSegmentParam',
            changeData: {
                index: _this.ladData.index,
                param: {
                    data: deepClone(_this.data)
                },
                oldParam: {
                    data: cache
                }
            }
        });
    }
}


function findFblAncestorId(startId: string, linkedList: TreeNodeObj): string | undefined {
    let id: string | undefined = startId;
    while (id) {
        const node = linkedList[id];
        if (!node) {
            return undefined;
        }
        if (node.blockType === 'FBL') {
            return id;
        }
        id = node.parent;
    }
    return undefined;
}

function clearFbPinConnect(linkedList: TreeNodeObj, leftId: string): void {
    const left = linkedList[leftId];
    if (!left) {
        return;
    }
    const fbId = left.rightConnectedId;
    const pinIndex = left.connectedIndex;
    if (fbId !== undefined && pinIndex !== undefined && linkedList[fbId]?.left) {
        delete (linkedList[fbId].left as { connectId?: string }[])[pinIndex].connectId;
    } else {
        for (const node of Object.values(linkedList)) {
            const pins = node.left;
            if (!pins) {
                continue;
            }
            for (const pin of pins) {
                if (pin.connectId === leftId) {
                    delete pin.connectId;
                }
            }
        }
    }
    delete left.rightConnectedId;
    delete left.connectedIndex;
}

function fblHasPin(linkedList: TreeNodeObj, fblId: string): boolean {
    const children = linkedList[fblId]?.children ?? [];
    return children.some((cid) => linkedList[cid]?.rightConnectedId !== undefined);
}

/** When the last FB pin wire is gone, FBL becomes a normal ORB (changeFbType.cleanFBL). */
function releaseEmptyFbl(linkedList: TreeNodeObj, data: Data, fromId: string): void {
    const fblId = findFblAncestorId(fromId, linkedList);
    if (!fblId || fblHasPin(linkedList, fblId)) {
        return;
    }
    const fbl = linkedList[fblId];
    const fbId = fbl.rightConnectedId;
    fbl.blockType = 'ORB';
    delete fbl.rightConnectedId;
    if (fbId && linkedList[fbId]) {
        delete linkedList[fbId].leftConnectedId;
    }
    mergeNode(fblId, data, true);
}

/**
 * Insert an open branch after a rail (changeFbType.addOB).
 */
export function addOB(leftElementId: string, data: Data) {
    const linkedList = data.linkedList;
    const obj = linkedList[leftElementId];
    const pid = obj.parent;
    const parent = linkedList[pid as string];
    const pc = parent.children;
    if (obj.blockType === 'ANB') {
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
            parent: leftElementId,
        };
        (obj.children as string[]).push(uuid);
        OBImproveLevel(leftElementId, linkedList, data);
    } else if (pc) {
        const uuid: string = generateUuid();
        const uuidANB: string = generateUuid();
        pc.splice(pc.indexOf(leftElementId), 1, uuidANB);
        linkedList[uuidANB] = {
            blockType: 'ANB',
            location: { x: 0, y: 0 },
            width: 1,
            originalWidth: 1,
            originalHeight: 0,
            height: 1,
            parent: pid,
            children: [leftElementId, uuid]
        };
        obj.parent = uuidANB;
        linkedList[uuid] = {
            blockType: 'element',
            type: 'OB',
            location: { x: 0, y: 0 },
            width: 1,
            originalWidth: 1,
            originalHeight: 1,
            height: 1,
            varNameHeight: 0.4,
            parent: uuidANB,
        };
        OBImproveLevel(uuidANB, linkedList, data);
    }
}

/**
 * Delete a line; only the right-side horizontal line of a parallel branch can be deleted
 * @param id
 * @param _this
 */
export function deleteLine(id: string, _this: Lad) {
    const lineMap = _this.data.lineMap;
    const linkedList = _this.data.linkedList;
    const line = lineMap[id];
    if (line.type === 'vertical') {
        return throwNotifyInfoHandle('禁止删除竖线', 2);
    }
    const leftElementId: string = line.left as string;
    if (leftElementId === undefined) {
        return throwNotifyInfoHandle('左侧线禁止删除', 2);
    }
    const obj = linkedList[leftElementId];
    const pid = obj.parent;
    if (pid === undefined) {
        return throwNotifyInfoHandle('无父元素，禁止删除', 2);
    }
    const parent = linkedList[pid];
    const pc = parent.children as string[];
    const rightId = line.right as string | undefined;
    const pinLine = !!(rightId && linkedList[rightId] && ifFBFU(linkedList[rightId].type as string));
    const fblId = findFblAncestorId(leftElementId, linkedList);
    if (parent.blockType === 'FBL' || pinLine) {
        clearFbPinConnect(linkedList, leftElementId);
        addOB(leftElementId, _this.data);
        releaseEmptyFbl(linkedList, _this.data, leftElementId);
    } else if (fblId && parent.blockType === 'ANB') {
        addOB(leftElementId, _this.data);
        releaseEmptyFbl(linkedList, _this.data, leftElementId);
    } else if (parent.blockType === 'ANB') {
        const gid = parent.parent;
        if (gid && linkedList[gid].blockType === 'ORB') {

        } else {
            return throwNotifyInfoHandle('无父元素，禁止删除', 2);
        }

        if (pc.indexOf(leftElementId) !== pc.length - 1) {
            return throwNotifyInfoHandle('禁止删除', 2);
        }
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
        pc.push(uuid);
        OBImproveLevel(pid, linkedList, _this.data);
    } else if (parent.blockType === 'ORB') {
        if (pc.indexOf(leftElementId) === 0) {
            return throwNotifyInfoHandle('并联第一行禁止删除', 2);
        }
        if (obj.rightConnectedId !== undefined || (obj.blockType === 'ANB' && obj.rightConnectedId !== undefined)) {
            clearFbPinConnect(linkedList, leftElementId);
        }
        addOB(leftElementId, _this.data);
        releaseEmptyFbl(linkedList, _this.data, leftElementId);
    }


    updateCanvas({
        _this: _this,
        id: _this.data.rootId
    });

}

/**
 * Raise OB level (parent block must be ANB)
 * @param OBpid : id of the OB's parent ANB block
 */
export const OBImproveLevel = (OBpid: string, linkedList: TreeNodeObj, data: Data) => {
    const ancestorArray = getAncestorArray(linkedList, OBpid);
    if (ancestorArray.length < 3) { return; }
    /**
     * Index in the ancestor array of the nearest-to-root block the OB rises to
     */
    let ancestori = undefined;
    for (let i = ancestorArray.length - 1; i > 1; i--) {
        const parId = ancestorArray[i - 1];
        const parent = linkedList[parId];
        const gid = ancestorArray[i - 2];
        const grand = linkedList[gid];
        const pc = parent.children as string[];
        const pi = pc.indexOf(OBpid);
        const gc = grand.children as string[];
        const gi = gc.indexOf(parId);
        // Found the node to modify
        if (parent.blockType === 'ORB' && grand.blockType === 'ANB') {
            if (gi !== 0) {
                // Stop when the index in the ANB block is not 0
                break;
            }
            if (pi === pc.length - 1) {
                // When deleting the last ORB block's line, adjacent OB arrows all rise one level
                ancestori = i - 2;
            }

        }
    }
    if (ancestori !== undefined) {
        /**
         * Among OBs that rise, the one with the smallest index
         */
        let cuti = undefined;
        /**
         * Grandparent id of the OB
         */
        const parId = linkedList[OBpid].parent as string;
        /**
         * Grandparent element of the OB
         */
        const parent = linkedList[parId];
        /**
         * Children of the OB's grandparent
         */
        const pc = parent.children as string[];
        /**
         * If there are OBs above this one, raise them together
         */
        for (let i = pc.length - 1; i > -1; i--) {
            const obji = linkedList[pc[i]];
            if (obji.blockType === 'ANB') {
                const objic = obji.children as string[];
                if (linkedList[objic[objic.length - 1]].type === 'OB') {
                    continue;
                } else {
                    cuti = i + 1;
                    break;
                }
            } else if (obji.blockType === 'element') {
                cuti = i + 1;
                break;
            } else {
                cuti = i + 1;
                break;
            }
        }
        
        /**
         * ANB block id the OB finally rises to
         */
        const ancId = ancestorArray[ancestori];
        /**
         * ANB block
         */
        const ancObj = linkedList[ancId];

        const newORBc = pc.splice(cuti as number);
        /**
         * Final parent ORB or FBL block id
         */
        let ggId = ancObj.parent;
        // If ANB is the root, wrap it with a new ORB root
        if (ggId === undefined || ggId === null) {
            ggId = generateUuid();
            data.rootId = ggId;
            linkedList[ggId] = {
                blockType: 'ORB',
                location: { x: ancObj.location.x, y: ancObj.location.y },
                width: 1,
                originalWidth: 1,
                originalHeight: 0,
                height: 1,
                parent: undefined,
                children: [ancId]
            };
            ancObj.parent = ggId;
        }
        const indexStart = (linkedList[ggId].children as string[]).indexOf(ancId);
        for (let i = 0; i < newORBc.length; i++) {
            const o = newORBc[i];
            linkedList[o].parent = ggId;
            (linkedList[ggId].children as string[]).splice(indexStart + i + 1, 0, o);
        }
        
        if (pc.length < 2) {
            mergeNode(parId, data);
        }
    }
};