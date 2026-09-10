



import { deepClone } from '@/app/common/objects';
import { SingletonOpInfo } from 'lad/eventAndShareData/shareData';
import { ifFBFU } from '@/app/lad/controller/calculate';
import Lad from '@/app/lad/index';
import { cleanViewer } from '@/app/lad/service/cleanViewer';
import { drawBlueLine } from '@/app/lad/service/drawBlueLine';
import { VirtualDomX, VD, LineLocation, TreeNode, FBParameter } from '../class/index';
import { ifCanConnectOB } from '@/app/lad/service/transformData';

type JsonObj = Record<string, unknown>;

/**
 * 
 * @param viewer Viewport corners in virtual DOM: top-left and bottom-right [[x,y],[x,y]],
 * @param _this
 */
export function updateViewer(_this: Lad, isScroll?: boolean) {
    const oldSelectArr = getOldSelectNode();
    getViewElement(_this);
    drawViewer(_this, isScroll);
    drawCanvas(_this);
    beforeUpdateSelectNode(_this, oldSelectArr);
};

// Reselect nodes
function beforeUpdateSelectNode(_this: Lad, oldSelectArr: string[]) {
    if (_this.canvasView) {
        _this.canvasView.selectedNodeById(oldSelectArr, true);
    }
}

// Get current selection
function getOldSelectNode() {
    return SingletonOpInfo.instance.getOperationalInfo().selectedIds;
}
export function drawCanvas(_this: Lad) {
    if (_this.canvasView) {
        _this.canvasView.layers.draw();
    }
}

export interface GetPinViewerR {
    left?: {
        start: number | undefined;
        end: number | undefined;
    };
    right?: {
        start: number | undefined;
        end: number | undefined;
    };
}
/**
 * Get FB pins that are in the viewport
 */
export const getPinViewer = (obj: TreeNode, _this: Lad): GetPinViewerR | null => {


    const getIndex = (left: FBParameter[], dir: 'left' | 'right') => {
        /**
         * If FB pin count exceeds maxlength, load only viewport pins; otherwise load all
         */
        const maxlength = 100;
        let startIndex: number | undefined = undefined;
        let endIndex: number | undefined = undefined;

        let leftIndex: number | undefined = undefined;
        /**
         * Rough search for pin positions in the viewport
         * precision: search step (stride)
         */
        const foreachObj = (precision: number) => {
            if (_this.viewer[0][1] < obj.location.y) {
                leftIndex = 0;
            } else {
                /**
                 * Approximate height of each pin
                 */
                let baseHeight = _this.FBPinHeight;
                if (SingletonOpInfo.instance.getMode() === 'monitor') {
                    baseHeight = _this.FBPinHeight + 0.5;
                }
                /**
                 * Assume one row per pin height; roughly estimate viewport index
                 */
                const index = Math.floor((_this.viewer[0][1] - obj.location.y) / baseHeight);

                let index1 = left.length - 1;
                if (index1 > index) {
                    index1 = index;
                    // Fast path when every pin occupies one row
                    for (let i = index1; i < left.length; i += precision) {
                        if (left[i].pinY as number < _this.viewer[1][1]) {
                            leftIndex = i;
                            break;
                        }
                    }
                }

                // If a pin is taller than one row, index is too low; search upward
                if (leftIndex === undefined) {

                    for (let i = index1; i > -1; i -= precision) {
                        const item = left[i];
                        if (item && (item.pinY as number) > _this.viewer[0][1]) {
                            leftIndex = i;
                            break;
                        }
                    }
                    if (leftIndex === undefined && precision > 1) {
                        // If not found, search again with higher precision
                        foreachObj(Math.floor(precision / 2));
                        if (leftIndex === undefined) {
                            console.log('屏幕中无引脚');
                        }
                    }
                }
            }
        };
        /**
         * Number of left-side pins to show
         */
        let showlength = left.length;
        if (dir === 'left' && obj.inputNumber !== undefined && obj.inputNumber !== null) {
            // When pin display is limited
            showlength = obj.inputNumber;
        } else if (obj.FB && obj.FB.paraLessCount) {
            showlength = obj.FB.paraLessCount + 1;
        }

        if (showlength > maxlength) {
            foreachObj(1);
            // If still not found, return 0 and render one pin; must not return null
            if (leftIndex === undefined) {
                return {
                    start: 0,
                    end: 0
                };
            }
        }
        // Precise search for pins in the viewport
        if (leftIndex !== undefined) {
            // Walk down to the last pin in the viewport

            for (let i = leftIndex; i < showlength; i++) {
                if (left[i].pinY as number < (_this.viewer[1][1] + 1)) {
                    endIndex = i;
                } else {
                    break;
                }
            }
            // Walk up to the first pin in the viewport
            for (let i = leftIndex; i > -1; i--) {
                if (left[i].pinY as number > (_this.viewer[0][1] - 1)) {
                    startIndex = i;
                } else {
                    break;
                }
            }
            return {
                start: startIndex,
                end: endIndex
            };
        };
        // Returning null means render all pins
        return null;
    };
    const left = obj.left;
    const right = obj.right;
    const leftObj = getIndex(left as FBParameter[], 'left');
    const rightObj = getIndex(right as FBParameter[], 'right');
    let pinInviewer: GetPinViewerR | null = null;

    if (leftObj !== null) {
        if (pinInviewer === null) {
            pinInviewer = {};
        }
        pinInviewer['left'] = leftObj;
    }
    if (rightObj !== null) {
        if (pinInviewer === null) {
            pinInviewer = {};
        }
        pinInviewer['right'] = rightObj;
    }
    return pinInviewer;
};
/**
 * Draw elements
 * @param _this
 */
export function drawViewer(_this: Lad, isScroll?: boolean) {
    cleanViewer(_this, isScroll);
    const linkedList = _this.data.linkedList;
    const lineMap = _this.data.lineMap;
    const leftTopY = _this.viewer[0][1];
    const leftTopX = _this.viewer[0][0];
    // Draw black lines
    if (_this.viewLine) {
        for (const o of _this.viewLine) {
            const loc = (lineMap as Record<string, { location?: LineLocation }>)[o]?.location;
            if (!loc) {
                continue;
            }
            const obj: LineLocation = deepClone(loc);
            obj.start.x -= leftTopX;
            obj.start.y -= leftTopY;
            obj.end.x -= leftTopX;
            obj.end.y -= leftTopY;
            if (_this.canvasView) {
                _this.canvasView.drawLine({ location: obj, basicLength: _this.basicLength, id: o });
            }
        }
    }
    if (!_this.ladData.annot) {// Not in code-comment mode
        // Draw blue lines
        drawBlueLine(_this);
    }
    // Draw elements
    if (_this.viewElement) {
        let pinInviewer: GetPinViewerR | null = null;
        for (const o of _this.viewElement) {
            const obj: TreeNode = deepClone(linkedList[o]);

            if (ifFBFU(obj.type as string)) {
                pinInviewer = getPinViewer(obj, _this);
                // Convert to coordinates relative to the viewport
                for (const o of obj.left as FBParameter[]) {
                    (o.pinY as number) -= leftTopY;
                }
                for (const o of obj.right as FBParameter[]) {
                    (o.pinY as number) -= leftTopY;
                }
            }
            obj.location.x -= leftTopX;
            (obj.pinY as number) -= leftTopY;
            obj.location.y -= leftTopY;
            if (obj.type === 'END') { continue; }
            if (_this.canvasView) {
                _this.canvasView.drawElement({
                    treeNode: obj,
                    basicLength: _this.basicLength,
                    textOpts: { fontSize: _this.fontSize, lineHeight: _this.lineHeight },
                    id: o,
                    heightV: _this.data.heightV,
                    pinInviewer: pinInviewer
                });
            }
        }
    }

    // Redraw hint boxes while scrolling
    if (SingletonOpInfo.instance.getState() === 'dragLine' && _this.canvasView && _this.canvasView.DragLine) {
        const arrow = _this.canvasView.DragLine.getCurrentTargetNode();
        // Recalculate hint points when scrolling during a wire drag
        if (arrow && arrow.attrs.type === 'OB' && arrow.attrs.id && linkedList[arrow.attrs.id] !== undefined) {
            const obId = arrow.attrs.id;
            const dirs = ['left', 'right'];
            _this.canvasView.showAssistPoint('LINE', 'OB', obId, dirs as any, (oSetData) => {
                const result: unknown[] = [];
                for (const dir of dirs) {
                    const list = (oSetData as JsonObj)[dir] as Array<{ parentId: string; pinIndex?: number }>;
                    list.forEach((item) => {
                        if (obId !== item.parentId) {
                            if (ifCanConnectOB({ OBId: obId, targetId: item.parentId, pinIndex: item.pinIndex, direction: dir as 'left' | 'right' }, _this.data)) {
                                result.push(item);
                            }
                        }
                    });
                }
                return result as any;
            });
            dirs.length = 0;
        }
    }

}
/**
 * Collect elements in the viewport
 * @param _this
 */
export function getViewElement(_this: Lad) {
    _this.viewElement = [];
    _this.viewLine = [];
    _this.viewBlueLine = [];
    const rightBottomY = _this.viewer[1][1];
    const rightBottomX = _this.viewer[1][0];
    const leftTopY = _this.viewer[0][1];
    const leftTopX = _this.viewer[0][0];

    const leftTopYInt = Math.floor(leftTopY);
    const leftTopXInt = Math.floor(leftTopX);
    for (let i = leftTopYInt; i < rightBottomY; i++) {
        const obji: VirtualDomX | undefined = _this.data.virtualDom[i];

        if (obji !== undefined) {
            for (let j = leftTopXInt; j < rightBottomX; j++) {
                const objj: VD | undefined = obji[j];

                if (objj !== undefined) {
                    // Elements
                    if (objj.items) {
                        for (const o of objj.items) {
                            
                            if (_this.viewElement.indexOf(o) === -1) {
                                _this.viewElement.push(o);
                            }
                        }
                    }
                    // Black lines
                    if (objj.lines) {
                        for (const o of objj.lines) {
                            if (_this.viewLine.indexOf(o) === -1) {
                                _this.viewLine.push(o);
                            }
                        }
                    }

                    // Blue lines
                    if (objj.bluelines) {
                        for (const o of objj.bluelines) {
                            if (_this.viewBlueLine.indexOf(o) === -1) {
                                _this.viewBlueLine.push(o);
                            }
                        }
                    }
                }
            }
        }
    }
}