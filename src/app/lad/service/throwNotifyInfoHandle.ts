import { SingletonViewData } from 'vs/editor/browser/widget/ld/lad/eventAndShareData/shareData';

/**
 * Notification toast
 * @param text
 * @param type
 */
export function throwNotifyInfoHandle(text: string, type: number) {
    const context = SingletonViewData.getInstance().context;
    if (context !== undefined) {
        context.editor.notificationService.info(text);
    }
}