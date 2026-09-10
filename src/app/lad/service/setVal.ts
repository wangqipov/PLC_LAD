



import { SingletonViewData } from 'lad/eventAndShareData/shareData';
import { FBParameter, JsonObj, TreeNode } from '@/app/lad/class';
import Lad from '@/app/lad/index';
import { drawBlueLine } from '@/app/lad/service/drawBlueLine';
import { getPinViewer, GetPinViewerR } from '@/app/lad/service/updateViewer';
import { CanvasView } from '@/app/lad/view/core/core';
import { updataMonitorValue } from '@/app/lad/view/monitor/monitor';
/**
 * Update variable values
 * @param pouName
 * @param watchReturnMap
 * @param _this
 */
export function setVal(pouName: string, _this: Lad) {
    /**
     * 
     * @param leftPins
     * @param watchReturnMap
     * @param startI Index of the first pin in the viewport
     * @param endI Index of the last pin in the viewport
     */

    const upperPouName = pouName.toLocaleUpperCase() + '.';
    const setV = (leftPins: FBParameter[], watchReturnMap: Map<string, any>, startI: number, endI: number) => {
        for (let i = startI; i < endI + 1; i++) {
            const pinItem = leftPins[i];
            if (pinItem.varName) {
                // Compiled variable names are uppercased; look up in uppercase
                const pinkey1 = upperPouName + pinItem.varName.toLocaleUpperCase();
                const pinkey2 = pinItem.varName.toLocaleUpperCase();
                const obj = watchReturnMap.get(pinkey1) || watchReturnMap.get(pinkey2);
                if (obj) {
                    pinItem.value = obj.value;
                    pinItem.hasBeenForced = obj.hasBeenForced;
                }
            }
        }

    };
    try {
        // Project code may swallow error logs; wrap in try/catch so errors still print
        const watchReturnMap = SingletonViewData.getInstance().watchReturnMap;

        if (watchReturnMap) {
            const { data } = _this;
            const { linkedList } = data;
            const pinInviewerMap = {};
            for (const o of _this.viewElement) {
                // Special handling for FB / FU
                if (linkedList[o].type === 'FB' || linkedList[o].type === 'FU') {
                    const leftPins = linkedList[o].left as FBParameter[];
                    const rightPins = linkedList[o].right as FBParameter[];
                    let lstartI = 0;
                    let lendI = leftPins.length - 1;
                    let rstartI = 0;
                    let rendI = rightPins.length - 1;
                    const pinInviewer = getPinViewer(linkedList[o], _this);
                    if (pinInviewer !== null) {
                        if (pinInviewer.left !== undefined && pinInviewer.left !== null && pinInviewer.left.start !== undefined && pinInviewer.left.end !== undefined) {
                            lstartI = pinInviewer.left.start;
                            lendI = pinInviewer.left.end;
                        }
                        if (pinInviewer.right !== null && pinInviewer.right !== undefined && pinInviewer.right.start !== undefined && pinInviewer.right.end !== undefined) {
                            rstartI = pinInviewer.right.start;
                            rendI = pinInviewer.right.end;
                        }
                        (pinInviewerMap as JsonObj)[o] = pinInviewer;
                    }
                    setV(leftPins, watchReturnMap, lstartI, lendI);
                    setV(rightPins, watchReturnMap, rstartI, rendI);

                } else {
                    const varName = linkedList[o].varName;
                    if (varName) {
                        // Match succeeds if either key1 or key2 hits;
                        const key1 = upperPouName + varName.toLocaleUpperCase();
                        const key2 = varName.toLocaleUpperCase();
                        const obj = watchReturnMap.get(key1) || watchReturnMap.get(key2);
                        if (obj) {
                            linkedList[o].value = obj.value;
                            linkedList[o].hasBeenForced = obj.hasBeenForced;
                        }
                    }
                }
            }
            updateV(_this, pinInviewerMap);
        }
    } catch (error) {
        console.log(error);
    }
}
/**
 * Monitor-mode update
 * @param _this
 */
export function updateV(_this: Lad, pinInviewerMap: { [key: string]: any }) {
    if (_this.canvasView) {
        _this.canvasView.removeMonitorView();
    }

    if (_this.ladData.annot) {
        return;
    }
    const linkedList = _this.data.linkedList;


    // Update values
    if (_this.viewElement) {
        const arr = [];
        for (const o of _this.viewElement) {
            const obj: { id: string; treeNode: TreeNode; pinInviewer?: GetPinViewerR } = { id: o, treeNode: linkedList[o] };
            if (pinInviewerMap[o] !== undefined || pinInviewerMap[o] !== null) {
                obj.pinInviewer = pinInviewerMap[o];
            }
            arr.push(obj);
        }
        updataMonitorValue(_this.canvasView as CanvasView, _this.basicLength, arr as any);
    }
    // Draw blue lines
    drawBlueLine(_this);
    if (_this.canvasView) {
        _this.canvasView.layers.draw();
    }
}