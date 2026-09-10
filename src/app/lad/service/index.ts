



import Lad from '../index';
import { TreeNode, TreeNodeObj, StringArr, ElementType, FBParameter } from '../class/index';
import { calculateLines, clearVal, ifFBFU, initVDom, calculateLocation, initBlueLine, initHeight, initPinOffsetY, initWidth, cleanLine } from '@/app/lad/controller/calculate';
import { add as addElement, connectOB as connectOBT, setVarName as setVarNameT, setVarNameParam } from '@/app/lad/service/transformData';
import { updateViewer } from '@/app/lad/service/updateViewer';
import { updateCanvas } from '@/app/lad/service/updateCanvas';
import { initCanvas } from '@/app/lad/service/initCanvas';
import { deepClone } from '@/app/common/objects';
import { initFbPin } from '@/app/lad/service/initFbPin';
import { saveCache } from '@/app/lad/service/saveCache';
import { throwNotifyInfoHandle } from '@/app/lad/service/throwNotifyInfoHandle';

// function gettree(linkedList: TreeNodeObj, rootid: string) {

//   if (linkedList[rootid].children) {
//       linkedList[rootid].tree = [];
//       for (const i of linkedList[rootid].children) {
//           linkedList[rootid].tree.push(linkedList[i]);
//           gettree(linkedList, i);
//       }
//   }
// }

/**
 * Generate fake data
 * @param _this
 * @param _this How many copies to make
 */
function setdata(_this: Fbd, times: number) {
  let { data } = _this;
  let { linkedList, lineMap } = data;
  let arr1: TreeNodeObj[] = [];
  let arr2: LineMap[] = [];
  let height1 = 15;
  for (let i = 0; i < times; i++) {
      let height = i*height1
      let map = {};
      for (let key in linkedList) {
          map[key] = generateUuid();
      }
      for (let key in lineMap) {
          map[key] = generateUuid();
      }
      let newlinkedList: TreeNodeObj = deepClone(linkedList);
      for (let key in newlinkedList) {
          newlinkedList[map[key]] = newlinkedList[key];
          delete newlinkedList[key];
          newlinkedList[map[key]].location.y += height;
          newlinkedList[map[key]].pinY += height;
          let left = newlinkedList[map[key]].left;
          for (let k in left) {
              left[k].pinY += height;
              let arr = left[k].connectLineId;
              if (arr) {
                  for (let j = 0; j < arr.length; j++) {
                      arr[j] = map[arr[j]];
                  }
              }
          }
          let right = newlinkedList[map[key]].right;
          for (let k in right) {
              right[k].pinY += height;
              let arr = right[k].connectLineId;
              if (arr) {
                  for (let j = 0; j < arr.length; j++) {
                      arr[j] = map[arr[j]];
                  }
              }
          }
      }

      let newlinkedlineMap: LineMap = deepClone(lineMap);
      for (let key in newlinkedlineMap) {
          newlinkedlineMap[map[key]] = newlinkedlineMap[key];
          delete newlinkedlineMap[key];
          for (let o of newlinkedlineMap[map[key]].path) {
              o[1] += height;
          }

          newlinkedlineMap[map[key]].leftId = map[newlinkedlineMap[map[key]].left];
          newlinkedlineMap[map[key]].rightId = map[newlinkedlineMap[map[key]].right];
      }
      arr1.push(newlinkedList);
      arr2.push(newlinkedlineMap);
  }
  for (let o of arr1) {
      for (let k in o) {
          linkedList[k] = o[k];
      }
  }
  for (let o of arr2) {
      for (let k in o) {
          lineMap[k] = o[k];
      }
  }
  console.log('linkedList',linkedList)
}

export {
    ProgramSegmentAdd,
    ProgramSegmentDelete,
    ProgramSegmentOrder,
    ProgramSegmentParam,
    isProgramSegmentAdd,
    isProgramSegmentDelete,
    isProgramSegmentOrder,
    isProgramSegmentParam,
} from '@/app/lad/class/cacheData';

export function initData(_this: Lad) {
    const { data } = _this;
    const { rootId } = data;
    try {
        clearVal(_this, rootId);
        initPinOffsetY(_this, rootId);
        initWidth(_this, rootId, 0);
        initHeight(_this, rootId);
        calculateLocation(_this, rootId);
        cleanLine(_this);
        calculateLines(_this, rootId, false);
        initBlueLine(_this);
        initVDom(_this);
        initCanvas(_this);
        updateViewer(_this);
    } catch (error) {
        console.log(error);
    }
}

// export function drawTreeNode(obj: { ctx: CanvasRenderingContext2D | null; treeNode: TreeNode; color?: string;
// side?: number; basicLength: number }) {
//   const { ctx, treeNode, color = 'black', basicLength } = obj;
//   if (treeNode['type'] === 'NORMALLY_OPEN') {
//       drawNO({ ctx: ctx, location: treeNode.location as Location, color: color, basicLength: basicLength });
//   }
// }

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
 * arrow connect
 * @param obj
 */
export function connectCOB(obj: COBobj, _this: Lad, ifSaveCache: boolean) {
    let cache;
    if (ifSaveCache) {
        cache = deepClone(_this.data);
    }
    const finish = connectOBT(obj, _this.data);
    if (finish) {
        updateCanvas({ _this: _this });
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
}



interface setVarNameP extends setVarNameParam {
    _this: Lad;
}
/**
 * 
 * @param id Block
 * @param dir FB left or right side
 * @param fbIndex Index of the variable on the FB left pins
 * @param width Max text width on the FB left or right (dir), in px
 * @param val Variable name
 * @param vid Variable id, optional
 * @param varNameHeight Combined height of variable + comment + address
 * @param varHeight Variable-name height
 * @param varAddr Variable address
 * @param varDesc Variable comment
 * @param varDataType Variable data type
 * @param pouName Variable file name
 * @param jumpId Jump id
 * @param jumpName Jump name
 * @param jumpIndex Index of the FB left child pin to jump to
 * @param _this Lad instance
 */
export function setVarName(param: setVarNameP, ifSaveCache: boolean) {
    let cache;
    if (ifSaveCache) {
        cache = deepClone(param._this.data);
    }
    const param1: { [k: string]: any } = {};
    let k: (keyof setVarNameP);
    for (k in param) {
        if (k !== '_this') {
            param1[k] = param[k];
        }
    }
    param1.data = param._this.data;
    setVarNameT(param1 as setVarNameParam);
    updateCanvas({
        _this: param._this,
        id: param._this.data.rootId,
    });
    if (ifSaveCache) {
        saveCache({
            type: 'programSegmentParam',
            changeData: {
                index: param._this.ladData.index,
                param: {
                    data: deepClone(param._this.data)
                },
                oldParam: {
                    data: cache
                }
            }
        });
    }
}


export function setTempMonitor(lad: TreeNode | FBParameter, str: String) {
    Lad.tempMonitor = string;
}

/**
 * Set connectedId and connectedIndex when creating a parent block
 * @param obj
 * @param linkedList
 * @param Pid
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
 * @param addObj
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
    FBobj?: FirmFBU;
}, _this: Lad, ifSaveCache: boolean): any {

    let cache;
    if (ifSaveCache) {
        cache = deepClone(_this.data);
    }

    const uuid = addElement(addObj, _this.data);
    if (uuid) {
        updateCanvas({
            _this: _this,
            id: uuid,
            // type: 'add'
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
        return uuid;
    }


}


/**
 * copy a tree through a couple of ids
 * @param linkedList
 * @param obj
 * @param rootIndex
 * @returns
 */
export function getNodeFromIds(linkedList: TreeNodeObj, obj: StringArr, rootIndex: number): TreeNodeObj {
    // Collect nodes from the nearest common tree node down to related leaves, then drop serial/parallel blocks that have only one child
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
// Initialize properties
export const initNode = (node: TreeNode) => {
    if (ifFBFU(node.type as string)) {
        for (const o of node.left as FBParameter[]) {
            delete o.connectId;
        }
    }
    if (node.blockType === 'FBL') {
        node.blockType = 'ORB';
    }
    delete node.leftConnectedId;
    delete node.rightConnectedId;
    delete node.connectedIndex;
};
/**
 * Update keys in TreeNodeObj
 * @param node
 * @param map
 */
export function updateKey(node: TreeNodeObj, map: { [x: string]: string }) {
    const arr = Object.keys(node);
    for (const key of arr) {//old key
        const mk = map[key];//new key
        if (mk) {
            if (ifFBFU(node[key].type as string)) {
                // Handle FB
                if (node[key].leftConnectedId !== undefined) {
                    if (map[node[key].leftConnectedId as string] === undefined) {
                        // FBL was not copied; clear all FB pins
                        node[key].leftConnectedId = undefined;
                        for (const o of node[key].left as FBParameter[]) {
                            if (o.connectId !== undefined) {
                                o.connectId = undefined;
                            }
                        }
                    } else {
                        // Both FBL and FB were copied
                        node[key].leftConnectedId = map[node[key].leftConnectedId as string];
                        for (const o of node[key].left as FBParameter[]) {
                            if (o.connectId !== undefined) {
                                o.connectId = map[o.connectId];
                            }
                        }
                    }
                }
            }
            if (node[key].blockType === 'FBL') {
                // Handle FBL
                if (map[node[key].rightConnectedId as string] !== undefined) {
                    node[key].rightConnectedId = map[node[key].rightConnectedId as string];
                    // Both FBL and FB were copied
                    const c = node[key].children as string[];
                    for (const o of c) {
                        if (node[o].rightConnectedId !== undefined) {
                            node[o].rightConnectedId = map[node[o].rightConnectedId as string];
                        }
                    }
                } else {
                    // FB was not copied; clear pin connections
                    node[key].blockType = 'ORB';
                    node[key].rightConnectedId = undefined;
                    const c = node[key].children;
                    if (c) {
                        for (const o of c) {
                            if (node[o].rightConnectedId !== undefined) {
                                node[o].rightConnectedId = undefined;
                            }
                        }
                    }

                }
            }
            const obj: TreeNode = node[mk] = deepClone(node[key]);
            const p = obj.parent;
            const c = obj.children;

            if (p) {
                if (map[p]) {
                    obj.parent = map[p];
                }
            }
            if (c) {
                for (let i = 0; i < c.length; i++) {
                    if (map[c[i]]) {
                        c.splice(i, 1, map[c[i]]);
                    }
                }
            }
            delete node[key];
        }
    }
}


/**
 * Get pairwise connections among all elements
 * @param _this
 * @returns[]
 */
export function getAllLine(_this: Lad) {
    const { data } = _this;
    const { linkedList, rootId } = data;

    const getElementRight = (linkedList: TreeNodeObj, id: string, res: string[]) => {
        const c = linkedList[id].children as string[];
        if (linkedList[id].blockType === 'ANB') {
            if (linkedList[c[c.length - 1]].blockType === 'element') {
                res.push(c[c.length - 1]);
            } else {
                getElementRight(linkedList, c[c.length - 1], res);
            }
        } else if (linkedList[id].blockType === 'ORB') {
            for (const o of c) {
                getElementRight(linkedList, o, res);
            }
        } else if (linkedList[id].blockType === 'element') {
            res.push(id);
        }
    };
    const getElementLeft = (linkedList: TreeNodeObj, id: string, res: string[]) => {
        const c = linkedList[id].children as string[];
        if (linkedList[id].blockType === 'ANB') {
            if (linkedList[c[0]].blockType === 'element') {
                res.push(c[0]);
            } else {
                getElementLeft(linkedList, c[0], res);
            }
        } else if (linkedList[id].blockType === 'ORB' || linkedList[id].blockType === 'FBL') {
            for (const o of c) {
                getElementLeft(linkedList, o, res);
            }
        } else {
            res.push(id);
        }
    };
    const getLine = (linkedList: TreeNodeObj, id: string, lines: { left: string; right: string; index?: number }[]) => {
        const c = linkedList[id].children as string[];
        if (linkedList[id].blockType === 'ANB') {
            for (let i = 0; i < c.length; i++) {
                getLine(linkedList, c[i], lines);
                if (i < c.length - 1) {
                    const left: string[] = [];
                    getElementRight(linkedList, c[i], left);
                    const right: string[] = [];
                    getElementLeft(linkedList, c[i + 1], right);
                    for (const o of left) {
                        for (const p of right) {
                            lines.push({
                                left: o,
                                right: p
                            });
                        }
                    }
                }
            }
        } else if (linkedList[id].blockType === 'ORB' || linkedList[id].blockType === 'FBL') {
            for (let i = 0; i < c.length; i++) {
                getLine(linkedList, c[i], lines);
            }
        } else if (ifFBFU(linkedList[id].type as string)) {
            const fbLeft = linkedList[id].left as FBParameter[];
            for (let i = 0; i < fbLeft.length; i++) {
                if (fbLeft[i].connectId !== undefined) {
                    const left: string[] = [];
                    getElementRight(linkedList, fbLeft[i].connectId as string, left);
                    for (const o of left) {
                        lines.push({
                            left: o,
                            right: id,
                            index: i
                        });
                    }
                }
            }
        }
    };
    const lines: { left: string; right: string; index?: number }[] = [];
    getLine(linkedList, rootId, lines);
    return lines;
}

/**
 * Add or remove FB left pins
 */
export function FBEditLeftPin(type: 'add' | 'del', id: string, _this: Lad, ifSaveCache: boolean) {
    let cache;
    if (ifSaveCache) {
        cache = deepClone(_this.data);
    }
    const obj = _this.data.linkedList[id];
    if (type === 'add') {
        if ((obj.left as FBParameter[]).length > (obj.inputNumber as number)) {
            (obj.inputNumber as number)++;
        }
    } else if (obj.FB && obj.FB.paraLessCount) {
        const pin = (obj.left as FBParameter[])[(obj.inputNumber as number) - 1];
        if (pin.connectId || pin.varName || pin.varName === '0' || pin.varAddr === '0') {
            return throwNotifyInfoHandle('连线或绑定变量的引脚禁止删除', 1);
        }
        if ((obj.inputNumber as number) > (obj.FB.paraLessCount + 1)) {
            (obj.inputNumber as number)--;
        }
    }
    initFbPin(obj);
    updateCanvas({ _this: _this });
    if (_this.canvasView) {
        _this.canvasView.selectedNodeById(id, true);
    }
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