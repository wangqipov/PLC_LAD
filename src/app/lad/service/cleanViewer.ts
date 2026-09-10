import Lad from '@/app/lad/index';

export function cleanViewer(_this: Lad, isScroll?: boolean) {
    if (_this && _this.canvasView) {
        _this.canvasView.removeMainView();
        _this.canvasView.destoryPositionList();
        _this.canvasView.initCanvasViewData(isScroll);
        // initGlobalData();
    }
}

// function initGlobalData() {
//     SingletonOpInfo.instance.clearOperationalInfo();
// }