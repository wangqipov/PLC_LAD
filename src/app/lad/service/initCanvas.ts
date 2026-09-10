



import { TreeNode } from '@/app/lad/class/index'
import Lad from '@/app/lad/index';
import { calculateViewer } from '@/app/lad/service/calculateViewer';
import { cleanViewer } from '@/app/lad/service/cleanViewer';
/**
 * init canvas container's width and height
 * @param _this
 */
export function initCanvas(_this: Lad) {
    
    const obj = _this.data.linkedList[_this.data.rootId] as TreeNode;
    const widthV = (obj.width + 5) * _this.basicLength;
    const heightV = (obj.height + 2) * _this.basicLength;
    _this.data.widthV = widthV;
    _this.data.heightV = heightV;

    cleanViewer(_this);

    const animate = _this.ladData.animateDom;
    if (animate) {
        animate.style.width = widthV + 'px';
        animate.style.height = heightV + 'px';
    }
    calculateViewer(_this);
}