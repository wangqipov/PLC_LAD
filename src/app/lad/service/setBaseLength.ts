
import { SingletonOpInfo } from 'lad/eventAndShareData/shareData';
import Lad from '@/app/lad/index';

export function setBaseLength(val: number, _this: Lad) {
    _this.basicLength = val;
    SingletonOpInfo.instance.setBasicLength(val);
    initFontSize(_this);
    // Lazy-load so vscode-path updateCanvas does not crash the Next demo page
    void import('@/app/lad/service/updateCanvas').then(({ updateCanvasFun }) => {
        updateCanvasFun({ _this: _this, id: _this.data.rootId });
    });
}

export function initFontSize(_this: Lad) {
    _this.fontSize = Math.round(_this.basicLength * 0.4);
}
