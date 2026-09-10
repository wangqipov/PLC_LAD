



import Lad from '@/app/lad/index';
import { updateCanvas } from '@/app/lad/service/updateCanvas';
import { deepClone } from '@/app/common/objects';
import { FBParameter } from '@/app/lad/class/index';
import { SingletonOpInfo } from 'lad/eventAndShareData/shareData';
import { getFBOriginalHeight } from '@/app/lad/service/initFbPin';

/**
 * @param id FB element id
 * @param closeENO true hides ENO; false shows ENO
 * @param _this Lad instance
 */
export function closeENO(id: string, closeENO: boolean, _this: Lad) {
    const FBpinHeight = SingletonOpInfo.instance.FBpinHeight;
    const fb = _this.data.linkedList[id];
    fb.closeENO = closeENO;
    const left = fb.left as FBParameter[];
    const right = fb.right as FBParameter[];
    if (closeENO) {
        if (left[0].name === 'EN') {
            left.splice(0, 1);
            if (fb.inputNumber !== undefined) {
                fb.inputNumber--;
            }
        }
        if (right[0].name === 'ENO') {
            right.splice(0, 1);
        }
    } else {
        const parameters: FBParameter[] = <FBParameter[]>fb.FB?.parameters;

        for (const o of parameters) {
            if (o.name === 'EN') {
                const obj: FBParameter = deepClone(o);
                obj.varNameHeight = FBpinHeight;
                left.unshift(obj);
                if (fb.inputNumber !== undefined) {
                    fb.inputNumber++;
                }
            }
        }
        for (let i = 0; i < left.length; i++) {
            left[i].pinOffsetFirstPin = i * FBpinHeight;
        }


        for (const o of parameters) {
            if (o.name === 'ENO') {
                const obj: FBParameter = deepClone(o);
                obj.varNameHeight = FBpinHeight;
                right.unshift(obj);
            }
        }
        for (let i = 0; i < right.length; i++) {
            right[i].pinOffsetFirstPin = i * FBpinHeight;
        }
        
    }

    fb.originalHeight = getFBOriginalHeight(fb);
    fb.height = fb.originalHeight + (fb.varNameHeight as number);

    updateCanvas({ _this: _this });
}