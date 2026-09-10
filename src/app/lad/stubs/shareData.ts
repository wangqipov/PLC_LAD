/**
 * Demo stub of the vscode shared singleton. Production still uses lad/eventAndShareData/shareData.
 * Lets transformData.add / initFbPin / layout refresh load in Next.
 */

class OperationalInfo {
    selectedIds: string[] = [];
}

class OpInfo {
    FBpinHeight = 0.6;
    basicLength = 30;
    private mode = 'edit';
    private dragInfo: { type: string; fbId?: string } = { type: 'NO' };

    getBasicLength(): number {
        return this.basicLength;
    }

    setBasicLength(val: number): void {
        this.basicLength = val;
    }

    getMode(): string {
        return this.mode;
    }

    getState(): string {
        return 'idle';
    }

    getDragInfoData(): { type: string; fbId?: string } {
        return this.dragInfo;
    }

    setDragInfoData(data: { type: string; fbId?: string }): void {
        this.dragInfo = data;
    }

    getOperationalInfo(): OperationalInfo {
        return new OperationalInfo();
    }

    clearOperationalInfo(): void {
        /* no-op */
    }
}

export const SingletonOpInfo = {
    instance: new OpInfo(),
    addrShow: true,
    descShow: true,
};

export class SingletonViewData {
    static inst: SingletonViewData | null = null;
    watchReturnMap = new Map<string, unknown>();
    context: { editor?: { notificationService?: { info: (text: string) => void } } } | undefined;
    programDataCache: unknown[] = [];
    cacheActiveIndex = 0;
    allLibs: unknown[] = [];
    allLibsMap: Record<string, unknown> = {};

    setCacheActiveIndex(index: number): void {
        this.cacheActiveIndex = index;
    }

    static getInstance(): SingletonViewData {
        if (!this.inst) {
            this.inst = new SingletonViewData();
        }
        return this.inst;
    }
}
