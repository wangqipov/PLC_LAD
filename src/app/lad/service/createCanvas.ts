
import Lad from '@/app/lad/index';
import { initData } from '@/app/lad/service/index';
import { mountedEvent } from '@/app/lad/service/ladEvent';
// import { bindCanvasViewEvent } from '@/app/lad/view/actionComponent/eventBus';

/** Create canvas
 */
export function Canvas(
    _this: Lad
) {
    mountedEvent(_this);
    initData(_this);
}