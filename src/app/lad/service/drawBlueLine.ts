



import { deepClone } from '@/app/common/objects';
import { SingletonOpInfo, SingletonViewData } from 'lad/eventAndShareData/shareData';
import { LineLocation } from '@/app/lad/class/index';
import Lad from '@/app/lad/index';
import { CanvasView } from '@/app/lad/view/core/core';

// Draw blue lines
export function drawBlueLine(_this: Lad) {
    // const linkedList = _this.data.linkedList;
    const lineMap = _this.data.lineMap;
    const ys = _this.viewer[0][1];
    const xs = _this.viewer[0][0];
    const mode = SingletonOpInfo.instance.getMode();
    if (mode === 'monitor') {
        const watchReturnMap = SingletonViewData.getInstance().watchReturnMap;
        if (watchReturnMap) {
            if (_this.viewBlueLine) {
                for (const lineKey of _this.viewBlueLine) {
                    if (_this.data.blueLineMap[lineKey] && watchReturnMap.has(lineKey)) {
                        const obj = deepClone(_this.data.blueLineMap[lineKey]);
                        for (let i = 0; i < obj.length; i++) {
                            obj[i][0] -= xs;
                            obj[i][1] -= ys;
                        }
                        (_this.canvasView as CanvasView).continuousPolyline(obj, _this.basicLength, 'layers');
                    }
                }
            }
            if (_this.viewLine) {
                for (const o of _this.viewLine) {
                    if (lineMap[o].left === undefined
                        // || linkedList[lineMap[o].right].type === 'END' && linkedList[lineMap[o].left].value === 'true')
                    ) {
                        const obj: LineLocation = deepClone(lineMap[o].location);
                        obj.start.x -= xs;
                        obj.start.y -= ys;
                        obj.end.x -= xs;
                        obj.end.y -= ys;
                        _this.canvasView?.continuousPolyline([[obj.start.x, obj.start.y], [obj.end.x, obj.end.y]], _this.basicLength, 'layers');
                    }
                }
            }
        }
    }
}