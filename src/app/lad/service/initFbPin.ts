



import { SingletonOpInfo } from 'lad/eventAndShareData/shareData';
import { FBParameter, TreeNode } from '@/app/lad/class/index';
const FBpinHeight = SingletonOpInfo.instance.FBpinHeight;
/**
 * Init FB pins; originalHeight is the light-gray body height, top dark-gray band is 1
 * @param fb
 */
export const initFbPin = (fb: TreeNode) => {
    const left: FBParameter[] = fb.left as FBParameter[];
    const right: FBParameter[] = fb.right as FBParameter[];
    let offset = 0;
    // In monitor mode, stretch each FB pin by 0.5 units
    if (SingletonOpInfo.instance.getMode() === 'monitor') {
        offset = 0.5;
    }
    for (let i = 0; i < left.length; i++) {
        if (i > 0) {
            if (left[i - 1].varNameHeight > FBpinHeight) {
                left[i].pinOffsetFirstPin = left[i - 1].pinOffsetFirstPin + left[i - 1].varNameHeight + 0.4;
            } else {
                left[i].pinOffsetFirstPin = left[i - 1].pinOffsetFirstPin + FBpinHeight;
            }
            left[i].pinOffsetFirstPin += offset;
        } else {
            left[i].pinOffsetFirstPin = 0;
        }
    }
    for (let i = 0; i < right.length; i++) {
        if (i > 0) {
            if (right[i - 1].varNameHeight > FBpinHeight) {
                right[i].pinOffsetFirstPin = right[i - 1].pinOffsetFirstPin + right[i - 1].varNameHeight + 0.4;
            } else {
                right[i].pinOffsetFirstPin = right[i - 1].pinOffsetFirstPin + FBpinHeight;
            }
            right[i].pinOffsetFirstPin += offset;
        } else {
            right[i].pinOffsetFirstPin = 0;
        }
    }
    fb.setHigher = true;
    fb.originalHeight = getFBOriginalHeight(fb);
    fb.height = fb.originalHeight + (fb.varNameHeight as number) + 1;
};

/**
 * FB body height without the top offset
 * @param fb
 * @returns
 */
export function getFBOriginalHeight(fb: TreeNode) {
    const left = fb.left as FBParameter[];
    const right = fb.right as FBParameter[];
    let leftOffset = 0;
    let rightOffset = 0;
    if (left.length > 0) {
        let index = left.length - 1;
        if (fb.inputNumber !== undefined) {
            index = fb.inputNumber - 1;
        }
        const pinHeightL = left[index].varNameHeight < 0.6 ? 0.6 : left[index].varNameHeight;// Pin height minimum 0.6
        leftOffset = left[index].pinOffsetFirstPin + pinHeightL;
    }
    if (right.length > 0) {
        const pinHeightR = right[right.length - 1].varNameHeight < 0.6 ? 0.6 : right[right.length - 1].varNameHeight;// Pin height minimum 0.6
        rightOffset = right[right.length - 1].pinOffsetFirstPin + pinHeightR;
    }
    let h = leftOffset > rightOffset ? leftOffset : rightOffset;
    
    h += 1.2;
    return h;
}