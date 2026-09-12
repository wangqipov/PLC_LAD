




import { TreeNode, TreeNodeObj } from '@/app/lad/class/index';
import { setPinWidth } from '@/app/lad/service/transformData';
import config from '@/app/lad/config';

/**
 * Clear variables on an element or pin
 */
export function deleteVariable(linkedList: TreeNodeObj, id: string, dir?: 'left' | 'right', index?: number) {
    function initObj(obj: any) {
        obj.varName = '';
        obj.value = '';
        obj.varDesc = '';
        obj.varAddr = '';
        obj.varDataType = '';
        obj.varNameHeight = config.FBpinHeight;
        obj.varHeight = 0;
        obj.descHeight = 0;
        obj.addrHeight = 0;
    }
    if (dir === undefined) {
        initObj(linkedList[id]);
    } else {
        const arr = linkedList[id][dir];
        if (arr !== undefined && index !== undefined) {
            initObj(arr[index]);
            setPinWidth(30, dir, linkedList[id], index);
        }
    }
}