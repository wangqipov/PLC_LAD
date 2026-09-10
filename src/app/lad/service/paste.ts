



import { deepClone } from '@/app/common/objects';
import { generateUuid } from '@/app/common/uuid';
import { TreeNodeObj, StringArr, TreeNode, Data } from '@/app/lad/class/index';
import { getAncestorArray, getPublicNearstTreeNode, ifCoil } from '@/app/lad/controller/calculate';
import type Lad from '@/app/lad/index';
import { initNode, updateKey, setConnected } from '@/app/lad/service/index';
import { saveCache } from '@/app/lad/service/saveCache';
import { throwNotifyInfoHandle } from '@/app/lad/service/throwNotifyInfoHandle';
import { mergeNode } from '@/app/lad/service/transformData';
import { updateCanvas } from '@/app/lad/service/updateCanvas';

/**
 * copy a tree through a couple of ids
 * @param linkedList
 * @param obj
 * @param rootIndex
 * @returns
 */
export function getNodeFromIds(linkedList: TreeNodeObj, obj: StringArr, rootIndex: number): TreeNodeObj {
    // Collect nodes from the nearest common parent down to related leaves, then drop serial/parallel blocks that have only one child
    const res: TreeNodeObj = {};
    const keys = Object.keys(obj);// Copied element id array
    for (const o of keys) {
        const arr: string[] = obj[o];
        // Copy from the nearest common parent in each element's ancestor array
        for (let i = rootIndex; i < arr.length; i++) {
            if (res[arr[i]] === undefined) {
                // Copy the node
                res[arr[i]] = deepClone(linkedList[arr[i]]);
                initNode(res[arr[i]]);
                // Rebuild children
                if (res[arr[i]].children !== undefined) {
                    const c: string[] = [];
                    // Walk each ancestor array and put related children into children
                    for (const p of keys) {
                        if ((obj[p].length > (i + 1)) && arr[i] === obj[p][i] && c.indexOf(obj[p][i + 1]) === -1) {
                            c.push(obj[p][i + 1]);
                        }
                    }
                    res[arr[i]].children = c;
                }
            }
        }
    }
    return res;
}

export function copy(paste: string[], _this: Lad): {
    'node': TreeNodeObj;
    'rootId': string;
} | null {
    let rootIndex: number = 0;// Level index of the copied nearest common node in the full tree
    let node: TreeNodeObj = {};
    let rootId: string = '';
    const linkedList = _this.data.linkedList;
    for (const o of paste) {
        if (ifCoil(linkedList[o].type as string) || linkedList[o].type === 'jump' || linkedList[o].type === 'return' || linkedList[o].type === 'OB') {
            throwNotifyInfoHandle('禁止复制线圈、jump、return', 2);
            return null;
        }
        if (linkedList[o].type === 'OB') {
            throwNotifyInfoHandle('禁止复制箭头', 2);
            return null;
        }
        if (linkedList[o].type === 'FB' && linkedList[o].leftConnectedId !== undefined) {
            if (paste.length > 1) {
                throwNotifyInfoHandle('已连子引脚的功能块只可以单独复制', 2);
                return null;
            }
        }
    }
    if (paste.length > 1) {
        const obj: StringArr = {};
        for (const o of paste) {
            obj[o] = getAncestorArray(linkedList, o);
        }
        const obj1: {
            index: number;
            rootId: string;
        } = getPublicNearstTreeNode(obj);
        rootIndex = obj1.index;
        rootId = obj1.rootId;
        node = getNodeFromIds(linkedList, obj, rootIndex);
    } else {
        const key: string = paste[0] as string;
        const obj: TreeNode = deepClone(linkedList[key]);
        initNode(obj);
        node = { [key]: obj };
        rootId = paste[0];
    }
    return {
        'node': node,
        'rootId': rootId
    };
}



export function paste(paste: {
    'node': TreeNodeObj;
    'rootId': string;
}, id: string, direction: 'left' | 'right', _this: Lad, ifSaveCache: boolean): void {
    try {
        if (paste === null) {
            return;
        }
        let cache;
        if (ifSaveCache) {
            cache = deepClone(_this.data);
        }
        const node = deepClone(paste.node);
        let rootId = paste.rootId;
        const linkedList = _this.data.linkedList;
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
            return;
        }
        if ((linkedList[id].type === 'OB' || ifCoil(linkedList[id].type as string)) && direction === 'right') {
            throwNotifyInfoHandle('OB和线圈右侧禁止粘贴', 2);
            return;
        }
        const map: { [x: string]: string } = {};// Map from old ids to new ids
        const obj = linkedList[id];
        for (const o in node) {
            map[o] = generateUuid();
        }
        updateKey(node, map);
        rootId = map[rootId];
        let pid = linkedList[id].parent as string;
        const parent = linkedList[pid];
        let index = (parent.children as string[]).indexOf(id);
        let newParent = parent;
        if (parent.blockType !== 'ANB') {
            const Pid: string = generateUuid();
            let c = [];
            if (parent.children) {
                parent.children.splice(index, 1, Pid);
            }
            c = [id];
            linkedList[Pid] = {
                blockType: 'ANB',
                location: { x: 0, y: 0 },
                width: 0,
                originalWidth: 0,
                originalHeight: 0,
                height: 0,
                parent: pid,
                children: c
            };
            setConnected(obj, linkedList, Pid);
            linkedList[id].parent = Pid;
            newParent = linkedList[Pid];
            index = 0;
            pid = Pid;
        }
        // If the copied root has the same type as the parent, merge into the parent
        if (node[rootId].blockType === newParent.blockType) {
            const pc = newParent.children as string[];
            const children = node[rootId].children as string[];
            for (const o of children) {
                node[o].parent = pid;
            }
            if (direction === 'left') {
                pc.splice(index, 0, ...children);
            } else {
                pc.splice(index + 1, 0, ...children);
            }
            delete node[rootId];
        } else {
            node[rootId].parent = pid;
            if (newParent.children) {
                if (direction === 'left') {
                    newParent.children.splice(index, 0, rootId);
                } else {
                    newParent.children.splice(index + 1, 0, rootId);
                }
            }
        }
        for (const o in node) {
            _this.data.linkedList[o] = node[o];
        }
        // With only one remaining child, the parent block is removed and the child rises
        for (const o in node) {
            mergeNode(o, _this.data);
        }
        updateCanvas({
            _this: _this,
            id: _this.data.rootId
        });
        if (ifSaveCache) {
            saveCache({
                type: 'programSegmentParam',
                changeData: {
                    index: _this.ladData.index,
                    param: {
                        data: cache
                    },
                    oldParam: {
                        data: deepClone(_this.data)
                    }
                }
            });
        }
    } catch (e) {
        console.error(e);
    }
}








/**
 * Copy a data snapshot when copying a function block
 * @param data
 * @returns
 */
export function copyAll(data: Data) {
    const res: Data = {
        linkedList: {},
        virtualDom: {},
        lineMap: {},
        blueLineMap: {},
        widthV: 0,
        heightV: 0,
        rootId: '',
        elementToLineMap: {}
    };
    res.linkedList = deepClone(data.linkedList);
    res.heightV = data.heightV;
    res.widthV = data.widthV;
    const node = res.linkedList;
    const map: { [x: string]: string } = {};// Map from old ids to new ids
    for (const o in node) {
        map[o] = generateUuid();
    }
    updateKey(node, map);
    res.rootId = map[data.rootId];
    return res;
}