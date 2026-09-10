

import { FBParameter, TreeNode, TreeNodeObj } from 'vs/editor/browser/widget/ld/lad/plcLad/class/index';
import { ifFBFU } from 'vs/editor/browser/widget/ld/lad/plcLad/controller/calculate';

/**
 * Update variables bound to an element
 * @param data
 * @param id Element id to update
 * @param varlist New variable table
 */
export function updateVariable(linkedList: TreeNodeObj, id: string, varlist: any) {
    changeVar(varlist, linkedList[id]);
    if (ifFBFU(linkedList[id].type as string)) {
        for (const o of linkedList[id].left as FBParameter[]) {
            changeVar(varlist, o);
        }
        for (const o of linkedList[id].right as FBParameter[]) {
            changeVar(varlist, o);
        }
    }
}

/**
 * Apply variable changes
 * @param varlist
 * @param obj
 */
function changeVar(varlist: any, obj: TreeNode | FBParameter) {
    const pouName = obj.pouName;
    const varName = obj.varName;
    if (pouName !== undefined && pouName !== null && varName !== undefined && varName !== null && varlist[pouName]) {
        obj.varAddr = varlist[pouName][varName].varAddr;
        obj.varDataType = varlist[pouName][varName].dataType;
        obj.varDesc = varlist[pouName][varName].varDesc;
    }
}