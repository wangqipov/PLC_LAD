import type { FBParameter } from '@/app/lad/class/index';

/**
 * Function-block definition. transformData.add reads parameters when type is FB/FU.
 */
export class FirmFBFU {
    guid?: string;
    name?: string;
    parameters?: FBParameter[];
    paraLessCount?: number;
    isAlterable?: boolean;
    returnType?: string;
}
