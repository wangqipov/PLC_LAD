type Handler = (...args: unknown[]) => void;

/**
 * CanvasView event bus. Matches the original Konva-style .on(name, fn).
 */
export class ViewEventBus {
    private listeners = new Map<string, Handler[]>();

    on(name: string, handler: Handler): void {
        const list = this.listeners.get(name) ?? [];
        list.push(handler);
        this.listeners.set(name, list);
    }

    off(name: string, handler?: Handler): void {
        if (!handler) {
            this.listeners.delete(name);
            return;
        }
        const list = this.listeners.get(name);
        if (!list) {
            return;
        }
        this.listeners.set(
            name,
            list.filter((h) => h !== handler)
        );
    }

    emit(name: string, ...args: unknown[]): void {
        const list = this.listeners.get(name);
        if (!list) {
            return;
        }
        for (const h of list) {
            h(...args);
        }
    }

    clear(): void {
        this.listeners.clear();
    }
}

/**
 * Collect selected ids for the property pane / variable table.
 * TODO: call project API SingletonOpInfo.instance to write selectedIds
 */
export function getIDS(group: { attrs: { id?: string; x?: number; y?: number } }): void {
    // TODO: call project API SingletonOpInfo.instance.getOperationalInfo().selectedIds
    void group;
}
