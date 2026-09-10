import { getIDS } from '@/app/lad/view/actionComponent/eventBus';
import type { LadRenderer } from '@/app/lad/view/render/renderer';

function selectedList(renderer: LadRenderer): string[] {
    return Array.from(renderer.overlay.selectedIds);
}

/**
 * TIA-style selection: click, Ctrl add/toggle, marquee replace.
 */
export function selectClick(renderer: LadRenderer, id: string | undefined, ctrlKey: boolean): string[] {
    if (!id) {
        if (!ctrlKey) {
            renderer.overlay.selectedIds.clear();
        }
        return selectedList(renderer);
    }
    if (ctrlKey) {
        if (renderer.overlay.selectedIds.has(id)) {
            renderer.overlay.selectedIds.delete(id);
        } else {
            renderer.overlay.selectedIds.add(id);
        }
    } else {
        renderer.overlay.selectedIds.clear();
        renderer.overlay.selectedIds.add(id);
    }
    const selected = selectedList(renderer);
    if (selected[0]) {
        getIDS({ attrs: { id: selected[0] } });
    }
    return selected;
}

export function selectMarquee(renderer: LadRenderer, ids: string[], ctrlKey: boolean): string[] {
    if (!ctrlKey) {
        renderer.overlay.selectedIds.clear();
    }
    for (const id of ids) {
        renderer.overlay.selectedIds.add(id);
    }
    return selectedList(renderer);
}

export function selectedNodeById(renderer: LadRenderer, id: string | string[], _keep = true): void {
    renderer.overlay.selectedIds.clear();
    const ids = Array.isArray(id) ? id : [id];
    for (const item of ids) {
        if (item) {
            renderer.overlay.selectedIds.add(item);
        }
    }
}
