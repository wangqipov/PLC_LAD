



import { SingletonOpInfo } from 'lad/eventAndShareData/shareData';
import { calculateLines, calculateLocation, cleanLine, clearPinY, initBlueLine, initHeight, initPinOffsetY, initVDom, initWidth } from '@/app/lad/controller/calculate';
import Lad from '@/app/lad/index';
import { initCanvas } from '@/app/lad/service/initCanvas';
import { saveDate } from '@/app/lad/service/saveDate';
import { updateViewer } from '@/app/lad/service/updateViewer';
import { upNum } from '@/app/lad/stubs/all1Num';
// import { sendScreenRectInfo } from 'vs/editor/browser/widget/ld/ld2Datas';

// function gettree(linkedList: TreeNodeObj, rootid: string) {
//   if (linkedList[rootid].children) {
//     linkedList[rootid].tree = [];
//     for (const i of linkedList[rootid].children) {
//       linkedList[rootid].tree.push(linkedList[i]);
//       gettree(linkedList, i);
//     }
//   }
// }

interface UpdateCanvasProperty {
  _this: Lad;
  id?: string;
  // type: 'add' | 'del';
  del_width?: number;
  del_original_width?: number;
}

export function updateCanvas(property: UpdateCanvasProperty, ifUseOldId?: boolean) {
  // ifUseOldId: whether to reuse original ids when generating lines
  try {
    // Project code may swallow error logs; wrap in try/catch so errors still print
    const { _this, } = property;
    const { data, } = _this;
    const { rootId } = data;
    clearPinY(_this, rootId);
    initPinOffsetY(_this, rootId);
    initWidth(_this, rootId, 0);
    initHeight(_this, rootId);

    calculateLocation(_this, rootId);
    if (ifUseOldId === undefined || !ifUseOldId) {
      cleanLine(_this);
    }
    calculateLines(_this, rootId, false);
    initBlueLine(_this);
    // Update virtual DOM
    initVDom(_this);
    // Re-render
    initCanvas(_this);
    updateViewer(_this);
    //checkId(_this);
    // gettree(_this.data.linkedList, _this.data.rootId);
    // console.log(_this.data)
    upNum();
    saveDate();
  } catch (e) {
    console.error(e);
  }
}
// function checkId(_this: Lad) {
//   const { data, } = _this;
//   const { linkedList } = data;
//   for (let o in linkedList) {
//     let obj = linkedList[o];
//     if (obj.parent && linkedList[obj.parent] === undefined) {
//       return console.error(o + ' parent id: ' + obj.parent + ' does not exist')
//     }
//     if (obj.children) {
//       for (let i of obj.children) {
//         if (linkedList[i] === undefined) {
//           return console.error(o + ' children id: ' + i + ' does not exist')
//         }
//       }
//     }
//   }
// }
export function updateCanvasFun(property: UpdateCanvasProperty, ifUseOldId?: boolean) {
  // ifUseOldId: whether to reuse original ids when generating lines
  try {
    const { _this, } = property;
    const { data, } = _this;
    const { rootId } = data;
    clearPinY(_this, rootId);
    initPinOffsetY(_this, rootId);
    initWidth(_this, rootId, 0);
    initHeight(_this, rootId);

    calculateLocation(_this, rootId);
    if (ifUseOldId === undefined || !ifUseOldId) {
      cleanLine(_this);
    }
    calculateLines(_this, rootId, false);
    initBlueLine(_this);
    // Update virtual DOM
    initVDom(_this);
    // Re-render
    initCanvas(_this);
    updateViewer(_this);
    //gettree(data.linkedList, data.rootId)
    //console.log(data)
  } catch (e) {
    console.error(e);
  }
}

export function updateDescAddr(property: UpdateCanvasProperty) {
  const { _this, } = property;
  const { data, } = _this;
  const { rootId } = data;
  clearPinY(_this, rootId);
  initWidth(_this, rootId, 0);
  initHeight(_this, rootId);
  initPinOffsetY(_this, rootId);
  calculateLocation(_this, rootId);
  cleanLine(_this);
  calculateLines(_this, rootId, false);
  initBlueLine(_this, true);
  // Update virtual DOM
  initVDom(_this);
  // Re-render
  initCanvas(_this);
  updateViewer(_this);

  // Resend values in monitor mode
  if (SingletonOpInfo.instance.getMode() === 'monitor') {
    // sendScreenRectInfo();
  }
}