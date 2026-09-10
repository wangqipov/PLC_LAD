import type { CanvasView } from '@/app/lad/view/core/core';
import type { PinViewerRange } from '@/app/lad/view/core/viewHost';
import type { TreeNode } from '@/app/lad/class/index';

/**
 * Refresh online values on symbols in monitor mode.
 * TODO: call project API to paint monitor values
 */
export function updataMonitorValue(
    _canvasView: CanvasView,
    _basicLength: number,
    _arr: { id: string; treeNode: TreeNode; pinInviewer?: PinViewerRange }[]
): void {
    void _canvasView;
    void _basicLength;
    void _arr;
}
