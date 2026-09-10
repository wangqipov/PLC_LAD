



import { LineLocation } from '../class/index';

export function drawLine(
    obj: {
        ctx: CanvasRenderingContext2D | null;
        /**
         * the coordinates for drawing a line. [start[x, y], end[x, y]]
         */
        location: LineLocation;
        color?: string;
        basicLength: number;
    }
) {
    const { ctx, location, color = 'black', basicLength } = obj;
    if (ctx === null) { return null; }
    const startX: number = location.start.x;
    const startY: number = location.start.y;
    const endX: number = location.end.x;
    const endY: number = location.end.y;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(startX * basicLength, startY * basicLength);
    ctx.lineTo(endX * basicLength, endY * basicLength);
    ctx.stroke();
    return null;
}

export function drawNO(obj: {
    ctx: CanvasRenderingContext2D | null;
    location: { x: number; y: number };
    color?: string;
    side?: number;
    basicLength: number;
}): void {
    const { ctx, location, color = 'black', basicLength } = obj;
    const side = basicLength / 2;
    if (ctx === null) { return console.log('ctx为空'); }
    const x = location.x * basicLength;
    const y = location.y * basicLength;
    const x1: number = x - side / 2;
    const x2: number = x + side / 2;
    const y1: number = y - side / 2;
    const y2: number = y + side / 2;

    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1, y2);
    ctx.moveTo(x2, y1);
    ctx.lineTo(x2, y2);
    ctx.moveTo(x1, y);
    ctx.lineTo(x - side, y);
    ctx.moveTo(x2, y);
    ctx.lineTo(x + side, y);
    ctx.stroke();
}