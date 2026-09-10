



import { deepClone } from '@/app/common/objects';
import { SingletonViewData } from 'lad/eventAndShareData/shareData';
import { LadData } from '@/app/lad/class/index';
import { ProgramSegmentAdd, ProgramSegmentDelete,ProgramSegmentOrder,ProgramSegmentParam,isProgramSegmentAdd,isProgramSegmentDelete,isProgramSegmentOrder,isProgramSegmentParam} from '@/app/lad/service/';
import {saveDate} from 'ld/lad/plcLad/service/saveData';
import { triggerUndoReDo } from 'lad/virtualScrolling/ladMain';

/**
 * 
 * @param data On undo, pass the current cache to roll back; on redo, pass the next cache to replace data
 * @param operate
 */
export function forwardOrBack(operate: 'forward' | 'back') {
    const ins = SingletonViewData.getInstance();
    const cache = ins.programDataCache;
    const cacheActiveIndex = ins.cacheActiveIndex;
    let data;
    if ((cache.length < 1 && operate === 'forward') || (cacheActiveIndex === -1 && operate === 'back') || cache.length === 0) {
        // 1. With only one step, undo only; 2. No ops: return; 3. cacheActiveIndex of -1 cannot undo
        return;
    }
    if (operate === 'forward') {
        // Redo
        if (cache.length - 1 > cacheActiveIndex) {
            data = cache[cacheActiveIndex + 1];
            ins.setCacheActiveIndex(cacheActiveIndex + 1);
        } else {
            // Already at the last step; cannot redo
            return;
        }
    } else {
        // Undo
        data = cache[cacheActiveIndex];
        ins.setCacheActiveIndex(cacheActiveIndex - 1);
    }
    const changeData = data.changeData;
    if (data.type === 'programSegmentParam' && isProgramSegmentParam(changeData)) {
        ForwardOrBackFun[data.type](changeData, operate);
    } 
    else if (data.type === 'programSegmentOrder' && isProgramSegmentOrder(changeData)) {
        ForwardOrBackFun[data.type](changeData, operate);
    } 
    else if (data.type === 'programSegmentAdd' && isProgramSegmentAdd(changeData)) {
        ForwardOrBackFun[data.type](changeData, operate);
    } 
    else if (data.type === 'programSegmentDelete' && isProgramSegmentDelete(changeData)) {
        ForwardOrBackFun[data.type](changeData, operate);
    }
    triggerUndoReDo(SingletonViewData.getInstance().programData);
    saveDate();
}

class ForwardOrBackFun {
    /**
     * Swap two program-segment positions
     */
    public static programSegmentOrder(data: ProgramSegmentOrder, operate: 'forward' | 'back') {
        const allData = SingletonViewData.getInstance().programData;
        allData.splice(data.index2 as number, 1, allData.splice(data.index1 as number, 1, deepClone(allData[data.index2 as number]))[0]);
    }
    /**
     * Modify a single program segment's properties
     */
    public static programSegmentParam(data: ProgramSegmentParam, operate: 'forward' | 'back') {
        const allData = SingletonViewData.getInstance().programData;
        if (operate === 'forward') {
            for (const o in data.param) {
                (allData[data.index as number] as { [k: string]: any })[o] = deepClone((data.param as { [k: string]: any })[o]);
            }
        } 
        else if (operate === 'back') {
            for (const o in data.oldParam) {
                (allData[data.index as number] as { [k: string]: any })[o] = deepClone((data.oldParam as { [k: string]: any })[o]);
            }
        }
    }
    /**
     * Add a program segment
     */
    public static programSegmentAdd(data: ProgramSegmentAdd, operate: 'forward' | 'back') {
        const allData = SingletonViewData.getInstance().programData;
        if (operate === 'forward') {
            allData.splice(data.index as number, 0, data.data as LadData);
        } else if (operate === 'back') {
            allData.splice(data.index as number, 1);
        }
    }
    /**
     * Delete a program segment
     */
    public static programSegmentDelete(data: ProgramSegmentDelete, operate: 'forward' | 'back') {
        const allData = SingletonViewData.getInstance().programData;
        if (operate === 'forward') {
            allData.splice(data.index as number, 1);
        } else if (operate === 'back') {
            allData.splice(data.index as number, 0, data.data as LadData);
        }
    }
}