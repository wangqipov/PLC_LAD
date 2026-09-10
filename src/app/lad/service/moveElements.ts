



import { deepClone } from '@/app/common/objects';
import Lad from '@/app/lad/index';
import { deleteArr } from '@/app/lad/service/delete';
import { copy, paste } from '@/app/lad/service/paste';
import { saveCache } from '@/app/lad/service/saveCache';

export function moveElements(copyIds: string[], _this: Lad, id: string, direction: 'left' | 'right', ifSaveCache: boolean) {
    let cache;
    if (ifSaveCache) {
        cache = deepClone(_this.data);
    }
    const node = copy(copyIds, _this);
    if (node) {
        paste(node, id, direction, _this, false);
        deleteArr(copyIds, _this, false);
        if (ifSaveCache) {
            saveCache({
                type: 'programSegmentParam',
                changeData: {
                    index: _this.ladData.index,
                    param: {
                        data: deepClone(_this.data)
                    },
                    oldParam: {
                        data: cache
                    }
                }
            });
        }
    }
}