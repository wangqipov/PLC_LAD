



/**
 * These events are bound to a single Lad instance (one network).
 */
import { fb } from '@/app/lad/stubs/data1';
import { SingletonOpInfo, SingletonViewData } from '@/app/lad/stubs/shareData';
import Lad from '@/app/lad/index';
// import { modifyFbName } from 'ld2Datas';
import { Editing, FbEditing } from '@/app/lad/view/core/textEditor';
import { add, connectOB, setVarName } from './index';
import { ElementType, FBParameter, TreeNode } from '../class/index';
import { getStrHeight } from '@/app/lad/stubs/utility';
import { blockTextNum } from '@/app/lad/view/core/config';
import { MiniRectOpts, PositionDir } from '@/app/lad/view';
import { ifCanConnectOB } from '@/app/lad/service/transformData';
import { moveElements } from '@/app/lad/service/moveElements';
import { changeFbType } from '@/app/lad/service/changeFbType';
import { updateCanvas } from '@/app/lad/service/updateCanvas';
import { getIDS } from '@/app/lad/view/actionComponent/eventBus';
export function mountedEvent(Lad: Lad) {
    if (!Lad.canvasView) {
        return;
    }
    // Custom Lad events; unbind when the component or element is destroyed
    // Drop-target event
    Lad.canvasView.on('nodedrop', (e, moveNodeData) => {
        const dragInfoData = SingletonOpInfo.instance.getDragInfoData();
        if (e.attrs && e.attrs.parentId && moveNodeData.moveType === 'OUT') {
            if (!Lad.canvasView) {
                return null;
            }
            const nodeId = e.attrs.parentId;
            const direction = e.attrs.direction;
            const width = 1;
            const height = 1;
            let addOpts: AddOpts;
            // root node
            if (nodeId === Lad.data.rootId) {
                addOpts = { type: dragInfoData.type, id: Lad.data.rootId, direction: 'left', width: 1, height: 1 };
                const newId = add(addOpts, Lad, true);
                if (newId) {
                    const param = {
                        attrs: {
                            id: newId,
                            x: Lad.data.linkedList[newId].location.x * 30,
                            y: Lad.data.linkedList[newId].location.y * 30,
                        }
                    };
                    getIDS(param);
                }
            }
            //FB FU
            else if (dragInfoData.type === 'FB' || dragInfoData.type === 'FU') {
                addOpts = buildAddNodeOpts({
                    type: dragInfoData.type, id: nodeId, direction: direction,
                    width, height, pinIndex: e.attrs.pinIndex
                }, dragInfoData);
                // Match FB & FU parameters
                const allLibs = SingletonViewData.getInstance().allLibs;
                if (dragInfoData.fbId) {
                    let fbData;
                    if (dragInfoData.type === 'FB') {
                        for (let j = 0; j < allLibs.length; j++) {
                            const tree = allLibs[j];
                            for (let i = 0; i < tree.fb.length; i++) {
                                if (tree.fb[i].guid === dragInfoData.fbId) {
                                    fbData = tree.fb[i];
                                    break;
                                }
                            }
                        }

                    } else {
                        for (let j = 0; j < allLibs.length; j++) {
                            const tree = allLibs[j];
                            for (let i = 0; i < tree.fu.length; i++) {
                                if (tree.fu[i].guid === dragInfoData.fbId) {
                                    fbData = tree.fu[i];
                                    break;
                                }
                            }
                        }
                    }
                    addOpts.FBobj = fbData;
                } else {
                    addOpts.FBobj = fb;
                }
                // FB: get auto-incremented varName
                const context = SingletonViewData.getInstance().context;
                if (dragInfoData.type === 'FB' && context) {
                    // const result = context.editor.controller.modifyFbName(addOpts.FBobj.name);
                    // if (result.error) {
                    //   console.warn('Failed to get auto-incremented FB variable name!');
                    // } else {
                    // Succeeded

                    addOpts.varDataType = addOpts.FBobj.name;
                    const newId = add(addOpts, Lad, true);
                    if (newId) {
                        const param = {
                            attrs: {
                                id: newId,
                                x: Lad.data.linkedList[newId].location.x * 30,
                                y: Lad.data.linkedList[newId].location.y * 30,
                            }
                        };
                        getIDS(param);
                    }
                    // }

                } else {
                    const newId = add(addOpts, Lad, true);
                    if (newId) {
                        const param = {
                            attrs: {
                                id: newId,
                                x: Lad.data.linkedList[newId].location.x * 30,
                                y: Lad.data.linkedList[newId].location.y * 30,
                            }
                        };
                        getIDS(param);
                    }
                }
            }
            // Regular nodes such as contacts and coils
            else {
                addOpts = buildAddNodeOpts({
                    type: dragInfoData.type, id: nodeId, direction: direction,
                    width, height, pinIndex: e.attrs.pinIndex
                }, dragInfoData);
                const newId = add(addOpts, Lad, true);
                if (newId) {
                    const param = {
                        attrs: {
                            id: newId,
                            x: Lad.data.linkedList[newId].location.x * 30,
                            y: Lad.data.linkedList[newId].location.y * 30,
                        }
                    };
                    getIDS(param);
                }
            }
        } else if (moveNodeData.moveType === 'IN') {
            const id = e.attrs.id || e.attrs.parentId;
            const dir = e.attrs.direction;
            const copyIds = Array.isArray(moveNodeData.data) ? moveNodeData.data : moveNodeData.data.ids;
            moveElements(copyIds, Lad, id, dir, true);
        } else if (moveNodeData.moveType === 'LINE') {
            const FbId = e.attrs.parentId;
            const direction = e.attrs.direction;
            const pinIndex = e.attrs.pinIndex;
            const OBId = moveNodeData.data.OBId;
            connectOB({ OBId: OBId, targetId: FbId, pinIndex: pinIndex, direction: direction }, Lad, true);
        }
        else {
            return new Error('没有attrs');
        }
        return null;
    });

    // Wire-drag event
    Lad.canvasView.on('beforedragLine', (OBId) => {
        if (Lad.canvasView) {
            const dirs: PositionDir[] = ['left', 'right'];
            Lad.canvasView.showAssistPoint('LINE', 'OB', OBId, dirs, (oSetData) => {
                const result: MiniRectOpts[] = [];
                for (const dir of dirs) {
                    oSetData[dir].forEach((item) => {
                        if (OBId !== item.parentId) {
                            if (ifCanConnectOB({ OBId: OBId, targetId: item.parentId, pinIndex: item.pinIndex, direction: dir })) {
                                result.push(item);
                            }
                        }
                    });
                }
                return result;
            });
            dirs.length = 0;
        }
    });

    // Input blur event
    Lad.canvasView.on('onBlur', (e: Editing | FbEditing) => {
        if ((e as FbEditing).dir) {
            const fbEData = e as FbEditing;
            // Height so comments and addresses remain visible =================
            let heightObj = null;
            if (fbEData.dir === 'left') {
                heightObj = calculateFBVarHeight((Lad.data.linkedList[fbEData.id].left as FBParameter[])[fbEData.pinIndex], fbEData);
            } else {
                heightObj = calculateFBVarHeight((Lad.data.linkedList[fbEData.id].right as FBParameter[])[fbEData.pinIndex]);
            }

            // ========================================================
            setVarName({
                width: e.textWidth,
                id: fbEData.id,
                dir: fbEData.dir,
                fbIndex: fbEData.pinIndex,
                val: fbEData.instanceName ? fbEData.instanceName : '',
                varNameHeight: heightObj.varNameHeight,
                varHeight: heightObj.varHeight,
                pouName: fbEData.pouName,
                varAddr: fbEData.varAddr,
                varDesc: fbEData.varDesc,
                varDataType: fbEData.varDataType,
                _this: Lad
            }, true);
        } else {
            const eData = e as Editing;
            // Height so comments and addresses remain visible =================
            const heightObj = calculateVarHeight(Lad.data.linkedList[eData.id], e);
            // ========================================================
            setVarName({
                width: e.textWidth,
                id: eData.id,
                val: eData.instanceName ? eData.instanceName : '',
                vid: eData.vtid,
                jumpId: eData.jumpId,
                jumpName: eData.jumpName,
                jumpIndex: eData.jumpIndex,
                varNameHeight: heightObj.varNameHeight,
                varHeight: heightObj.varHeight,
                pouName: eData.pouName ? eData.pouName : '',
                varAddr: eData.varAddr ? eData.varAddr : '',
                varDesc: eData.varDesc ? eData.varDesc : '',
                varDataType: eData.varDataType,
                _this: Lad
            }, true);
        }
    });

    // Node click event
    Lad.canvasView.on('nodeclick', (group) => {
        getIDS(group);
    });

    // Switch contact type
    Lad.canvasView.on('nodechange', (id, type) => {
        if (Lad.data.linkedList[id] && type) {
            if (Lad.data.linkedList[id].type === 'FB' || Lad.data.linkedList[id].type === 'FU') {
                changeFbType(SingletonViewData.getInstance().allLibsMap[type.id], Lad, id, true);
            }
            else {
                Lad.data.linkedList[id].type = type;
                updateCanvas({ _this: Lad });
            }
        }
    });
}

interface BuildOpts {
    type: ElementType;
    id: string;
    direction: 'down' | 'left' | 'right' | 'up';
    width: number;
    height: number;
    pinIndex?: number;
    varName?: string;
}
interface AddOpts extends BuildOpts {
    varDataType?: string;
    FBobj?: any;
}
// Build options for adding a contact or function block
function buildAddNodeOpts(opts: BuildOpts, dragInfoData?: any) {

    const newOpts: AddOpts = { ...opts };
    // Special handling for OB type
    if (newOpts.type === 'OB') {
        newOpts.direction = 'down';
    }
    if (newOpts.pinIndex === null) {
        delete newOpts.pinIndex;
    }
    if (!opts.width || !opts.height) {
        console.error('type && width && height 属性不存在');
    }
    return newOpts;
}

// Compute varNameHeight; minimum is 0.4
function calculateVarHeight(treeNode: TreeNode, e: any): {
    varHeight: number;
    varNameHeight: number;
} {
    // FB_INS_NAME is the FB instance name
    const instanceNameH = e.eleType === 'FB_INS_NAME' ? getStrHeight(e.instanceName, undefined, e.absoluteWidth) : getStrHeight(e.instanceName);
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

function calculateFBVarHeight(fbParameter: FBParameter, e: any): {
    varHeight: number;
    varNameHeight: number;
} {
    const instanceNameH = getStrHeight(e.instanceName, blockTextNum);
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