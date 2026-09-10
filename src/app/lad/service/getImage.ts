



import { deepClone } from '@/app/common/objects';
import { LineLocation, TreeNode } from '@/app/lad/class/index';
import { ifFFBFU } from '@/app/lad/controller/calculate';
import Lad from '@/app/lad/index';
import { cleanViewer } from '@/app/lad/service/cleanViewer';
/**
 * init viewer containing the elements that we can see in window,
 * @param _this
 * @returns
 */
export function calculateViewer(_this: Lad) {
    const viewer = _this.ladData.viewerDom;
    if (viewer) {
        viewer.style.width = _this.data.widthV + 'px';
        viewer.style.height = _this.data.heightV + 'px';
        viewer.style.marginLeft = 0 + 'px';
        viewer.style.marginTop = 0 + 'px';
    }
    if (_this.canvasView) {
        _this.canvasView.updateBackgroundAndWH({ width: _this.data.widthV, height: _this.data.heightV, background: false });
    }
}
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
    if (lineMap) {
        for (const o in lineMap) {
            const obj: LineLocation = deepClone(lineMap[o].location);
            obj.start.x -= leftTopX;
            obj.start.y -= leftTopY;
            obj.end.x -= leftTopX;
            obj.end.y -= leftTopY;
            if (_this.canvasView) {
                _this.canvasView.drawLine({ location: obj, basicLength: _this.basicLength, id: o });
            }

        }
    }
    // Draw elements
    if (linkedList) {
        const pinInViewer = undefined;
        for (const o in linkedList) {
            const obj: TreeNode = deepClone(linkedList[o]);

            if (ifFFBFU(obj.type as string)) {
                // Convert to coordinates relative to the viewport
                if (obj.left) {
                    for (const o of obj.left) {
                        (o.pinY as number) -= leftTopY;
                    }
                }
                if (obj.right) {
                    for (const o of obj.right) {
                        (o.pinY as number) -= leftTopY;
                    }
                }
            }
            obj.location.x -= leftTopX;
            (obj.pinY as number) -= leftTopY;
            obj.location.y -= leftTopY;
            if (obj.type === 'END') {  continue; }
            if (_this.canvasView) {
                _this.canvasView.drawElement({
                    treeNode: obj,
                    basicLength: _this.basicLength,
                    textOpts: { fontSize: _this.fontSize, lineHeight: _this.lineHeight },
                    id: o,
                    heightV: _this.data.heightV,
                    pinInViewer: pinInViewer
                });
            }

        }
    }

}
export function getImage(_this: Lad): string {
    calculateViewer(_this);
    drawViewer(_this);
    const image = _this.canvasView ? _this.canvasView.stage.toDataURL() : 'undefined';
    return image;
}