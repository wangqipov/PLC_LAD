import type { FBParameter, TreeNode } from '@/app/lad/class/index';
import { SingletonOpInfo } from '@/app/lad/stubs/shareData';
import { getStrHeight } from '@/app/lad/stubs/utility';
import { blockTextNum } from '@/app/lad/view/core/config';

/**
 * Compute varNameHeight; minimum is 0.4.
 * Used by ladEvent onBlur and demo commitSetVarName before setVarName.
 */
export function calculateVarHeight(treeNode: TreeNode, e: any): {
    varHeight: number;
    varNameHeight: number;
} {
    // FB_INS_NAME is the FB instance name
    const instanceNameH = getStrHeight(e.instanceName, undefined, e.absoluteWidth);
    // varHeight minimum is 0.4
    const varHeight = instanceNameH ? instanceNameH : 0.4;
    if (!treeNode) {
        return {
            varHeight,
            varNameHeight: 0.4
        };
    }
    let descHeight = 0;
    let addrHeight = 0;
    if (SingletonOpInfo.addrShow) {
        addrHeight = getStrHeight(e.varAddr);
    }
    if (SingletonOpInfo.descShow) {
        descHeight = getStrHeight(e.varDesc);
    }
    treeNode.descHeight = descHeight;
    treeNode.addrHeight = addrHeight;
    return {
        varHeight,
        varNameHeight: varHeight + descHeight + addrHeight
    };
}

export function calculateFBVarHeight(fbParameter: FBParameter, e: any): {
    varHeight: number;
    varNameHeight: number;
} {
    const instanceNameH = getStrHeight(e.instanceName, blockTextNum, e.absoluteWidth);
    // varHeight minimum is 0.6
    const varHeight = instanceNameH ? instanceNameH : 0.6;
    if (!fbParameter) {
        return {
            varHeight,
            varNameHeight: 0.6
        };
    }
    let descHeight = 0;
    let addrHeight = 0;
    if (SingletonOpInfo.addrShow) {
        addrHeight = getStrHeight(e.varAddr);
    }
    if (SingletonOpInfo.descShow) {
        descHeight = getStrHeight(e.varDesc);
    }
    fbParameter.descHeight = descHeight;
    fbParameter.addrHeight = addrHeight;
    return {
        varHeight,
        varNameHeight: varHeight + descHeight + addrHeight
    };
}
