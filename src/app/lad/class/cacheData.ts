import type { Data, LadData } from '@/app/lad/class/index';

export interface ProgramSegmentOrder {
    index1: number;
    index2: number;
}

export interface ProgramSegmentParam {
    index: number;
    param: {
        data?: Data;
        [k: string]: unknown;
    };
    oldParam: {
        data?: Data;
        [k: string]: unknown;
    };
}

export interface ProgramSegmentAdd {
    index: number;
    data: LadData;
}

export interface ProgramSegmentDelete {
    index: number;
    data: LadData;
}

export type CacheData =
    | { type: 'programSegmentParam'; changeData: ProgramSegmentParam }
    | { type: 'programSegmentOrder'; changeData: ProgramSegmentOrder }
    | { type: 'programSegmentAdd'; changeData: ProgramSegmentAdd }
    | { type: 'programSegmentDelete'; changeData: ProgramSegmentDelete };

export function isProgramSegmentParam(data: unknown): data is ProgramSegmentParam {
    return !!data && typeof data === 'object' && 'param' in data && 'oldParam' in data;
}

export function isProgramSegmentOrder(data: unknown): data is ProgramSegmentOrder {
    return !!data && typeof data === 'object' && 'index1' in data && 'index2' in data;
}

export function isProgramSegmentAdd(data: unknown): data is ProgramSegmentAdd {
    return !!data && typeof data === 'object' && 'data' in data && 'index' in data && !('param' in data);
}

export function isProgramSegmentDelete(data: unknown): data is ProgramSegmentDelete {
    return !!data && typeof data === 'object' && 'data' in data && 'index' in data && !('param' in data);
}
