



import { FirmFBFU } from '@/app/lad/class/index';
import { deepClone } from '@/app/common/objects';
import { Data, FBParameter, TreeNode, TreeNodeObj } from '@/app/lad/class/index';
import Lad from '@/app/lad/index';
import { addOB } from '@/app/lad/service/delete';
import { saveCache } from '@/app/lad/service/saveCache';
import { mergeNode, setFB } from '@/app/lad/service/transformData';
import { updateCanvas } from '@/app/lad/service/updateCanvas';
/**
 * change function block's type
 * @param FBobj
 * @param _this
 * @param id: FB id
 */
export function changeFbType(FBobj: FirmFBFU, _this: Lad, id: string, ifSaveCache: boolean) {
    let cache;
    if (ifSaveCache) {
        cache = deepClone(_this.data);
    }
    changeFbTypeData(FBobj, _this.data, id);
    updateCanvas({
        _this: _this,
        id: id,
    });
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

export function changeFbTypeData(FBobj: FirmFBFU, data: Data, id: string) {
    const linkedList = data.linkedList;
    const obj = linkedList[id];
    if (obj.type) {
        const oldData = deepClone(obj);
        setFB(linkedList, id, FBobj, obj.type);
        if (obj.leftConnectedId !== undefined && obj.leftConnectedId !== null) {
            setOldConnection(oldData, obj, id, linkedList, data);
        }
    }
}
/**
 * Fill in connection and variable data
 */
function setOldConnection(oldData: TreeNode, newData: TreeNode, FBid: string, linkedList: TreeNodeObj, data: Data) {
    forEachPins(oldData, newData, FBid, linkedList, data, 'left');
    forEachPins(oldData, newData, FBid, linkedList, data, 'right');
}
/**
 * Initialize FB pins
 */
function forEachPins(oldData: TreeNode, newData: TreeNode, FBid: string, linkedList: TreeNodeObj, data: Data, dir: 'left' | 'right') {
    const newDirObj = newData[dir] as FBParameter[];
    const oldDirObj = oldData[dir] as FBParameter[];
    for (let i = 0; i < newDirObj.length; i++) {
        // Old data has a matching index
        if (oldDirObj[i]) {
            const connectId = oldDirObj[i].connectId;
            if (connectId) {
                // Has a wire but no variable; copy old pin connection and variable to the new pin
                if (newDirObj[i].dataType === 'BOOL') {
                    mergePin(oldData, newData, i, dir);
                } else {
                    // Has a wire but no variable; delete the wire if old/new FB types do not match
                    deleteConnect(linkedList, connectId, data);
                }
            } else if (oldDirObj[i].varName !== undefined && oldDirObj[i].varName !== null) {
                // No wire, but has a variable
                mergePin(oldData, newData, i, dir);
            }
        }
    }
    // Remove leftover old connections
    if (newDirObj.length < oldDirObj.length) {
        for (let i = newDirObj.length; i < oldDirObj.length; i++) {
            if (oldDirObj[i].connectId !== undefined) {
                deleteConnect(linkedList, oldDirObj[i].connectId as string, data);
            }
        }
    }
    // Convert FBL to ORB when none of its pins connect to an FB
    if (dir === 'left' && !ifHasConnectedFB(FBid, linkedList) && linkedList[FBid].leftConnectedId !== undefined) {
        cleanFBL(linkedList, data, linkedList[FBid].leftConnectedId as string);
        linkedList[FBid].leftConnectedId = undefined;
    }
}
/**
 * Check whether the FBL is connected to an FB
 * @returns
 */
function ifHasConnectedFB(FBid: string, linkedList: TreeNodeObj) {
    const FBLid = linkedList[FBid].leftConnectedId;
    if (FBLid) {
        const FBLobj = linkedList[FBLid];
        if (FBLobj.children) {
            for (const o of FBLobj.children) {
                if (linkedList[o].rightConnectedId !== undefined) {
                    return true;
                }
            }
        }
    }
    return false;
}
/**
 * Merge FB pin data
 * @param oldData Old FB object
 * @param newData New FB object
 * @param i
 * @param dir
 */
function mergePin(oldData: TreeNode, newData: TreeNode, i: number, dir: 'left' | 'right') {
    // Merge if the pin already has old data
    const newDirObj = newData[dir] as FBParameter[];
    const oldDirObj = oldData[dir] as FBParameter[];
    const newobj: FBParameter = newDirObj[i];// One FB pin
    newDirObj[i] = oldDirObj[i];
    // Merge new FB pin data into the old data
    Object.assign(newDirObj[i], newobj);
    // for (const k in newobj) {
    //     newDirObj[i][k] = newobj[k];
    // }
}
/**
 * Delete FBL pin connection data
 * @param linkedList
 * @param id
 */
function deleteConnect(linkedList: TreeNodeObj, id: string, data: Data) {
    linkedList[id].rightConnectedId = undefined;
    linkedList[id].connectedIndex = undefined;
    addOB(id, data);
}
/**
 * Convert FBL to ORB
 * @param linkedList
 * @param data
 * @param id FBL id
 */
function cleanFBL(linkedList: TreeNodeObj, data: Data, id: string) {
   
    const block = linkedList[id];
    // Convert the FBL block to an ORB block
    block.blockType = 'ORB';
    block.rightConnectedId = undefined;
    if (block.children) {
        for (const o of block.children) {
            if (linkedList[o].rightConnectedId !== undefined && linkedList[o].rightConnectedId !== null) {
                linkedList[o].rightConnectedId = undefined;
            }
            if (linkedList[o].connectedIndex !== undefined && linkedList[o].connectedIndex !== null) {
                linkedList[o].connectedIndex = undefined;
            }
        }
        mergeNode(id, data, true);
    }
    
}
