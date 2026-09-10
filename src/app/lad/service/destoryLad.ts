



import Lad from '@/app/lad/index';
import { CanvasView } from '@/app/lad/class';

/**
 * destory Lad object
 */
export function destoryLad(_this: Lad) {
    if (_this.canvasView) {
        destoryCanvasView(_this.canvasView);
        _this.canvasView = undefined;
    }
}
export function destoryCanvasView(canvasView: CanvasView) {
    canvasView.destoryTextEditor();
    canvasView.stage.destroy();
    // canvasView.stage.destroyChildren();
    const canvasViewIns = Object.keys(canvasView);
    for (let i = 0; i < canvasViewIns.length; i++) {
        const key = canvasViewIns[i];
        (canvasView as any)[key] = null;
    }
}