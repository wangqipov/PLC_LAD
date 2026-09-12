



import { SingletonViewData } from 'lad/eventAndShareData/shareData';

// Send data
let timeout: NodeJS.Timeout;
export function saveDate() {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
        const context = SingletonViewData.getInstance().context;
        if (context !== undefined) {
            context.editor?.controller?.saveFileHandle();
        }
    }, 0);
}

/**
 * Extra argument shape for saveFile
 * @param sData
 */
export function saveData2(sData?: any) {
    // saveFile(sData);
}