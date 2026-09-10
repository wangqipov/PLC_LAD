/**
 * In-place variable-name edit payload.
 * CanvasView creates the DOM input and reports the value on blur via onBlur.
 */
export interface Editing {
    id: string;
    instanceName: string;
    textWidth: number;
    vtid?: string;
    jumpId?: string;
    jumpName?: string;
    jumpIndex?: number;
    pouName?: string;
    varAddr?: string;
    varDesc?: string;
    varDataType?: string;
    eleType?: string;
    absoluteWidth?: number;
}

export interface FbEditing extends Editing {
    dir: 'left' | 'right';
    pinIndex: number;
}
