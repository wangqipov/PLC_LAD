import { Data, LadData } from './class/index'
import { CanvasView } from '@/app/lad/class';
import { initFontSize } from '@/app/lad/service/setBaseLength'
import { calculateViewer } from '@/app/lad/service/calculateViewer';
import { initData } from '@/app/lad/service/index';

function createCanvas(obj: Lad) {
    initData(obj);
}

class Lad {
    /**
     * Full data for this program segment
     */
    ladData: LadData;
    /**
     * Virtual-canvas grid cell size
     */
    public basicLength: number = 30;
    public fontSize: number = 0;
    public lineHeight: number = 1.2;
    public canvas: HTMLCanvasElement | null = null;
    public ctx: CanvasRenderingContext2D | null = null;
    /**
     * Default left height when the FB has no left elements; used to push FBL apart
     */
    public FBLeftHeight = 1.5;
    /**
     * Horizontal element margin; AND/ORB blocks have none
     */
    public margin_horizontal: number = 2;
    public fBMargin: number = 1;
    /**
     * Vertical element margin; ANB/ORB blocks have none
     */
    public margin_vertical: number = 0.5;
    public FBPinHeight: number = 0.6;
    /**
     * Canvas width
     */
    public width: number = 100;
    /**
     * Canvas height
     */
    public height: number = 100;
    public canvasView: CanvasView | undefined;
    public data: Data = {
        linkedList: {},
        virtualDom: {},
        lineMap: {},
        blueLineMap: {},
        widthV: 0,
        heightV: 0,
        rootId: '',
        elementToLineMap: {}

    }
    /**
     * Elements in the viewport
     */
    public viewElement: string[] = [];
    public viewLine: string[] = [];
    public viewBlueLine: string[] = [];
    /**
     * Viewport diagonal in virtual DOM: top-left and bottom-right
     * [[start:number,sterty:number],[endx:number,endy:number]]
     */
    public viewer: [[number, number], [number, number]] = [[0, 0], [50, 50]];
    public index: number = 0;// Current program-segment index
    constructor(obj: {
        data: Data;
        index: number;
        ladData: LadData;
    }) {
        const { data, index, ladData } = obj;
        this.ladData = ladData;
        this.index = index;
        initFontSize(this);
        this.data = data;
        this.data.linkedList = data.linkedList;
        if (data.virtualDom) {
            this.data.virtualDom = data.virtualDom;
        }
        if (data.lineMap) {
            this.data.lineMap = data.lineMap;
        }
        this.data.widthV = data.widthV;
        this.data.heightV = data.heightV;
        this.data.rootId = data.rootId;
        calculateViewer(this);
        // Create CanvasView instance
        try {
            if (ladData.viewerDom) {
                this.canvasView = new CanvasView(ladData.viewerDom, this.data.rootId, this);
            } else {
                throw new Error('viewerDom不存在' + this.data.rootId);
            }
        } catch (e) {
            console.error(e);
        }
        createCanvas(this);
    }
}
export default Lad;