'use client';

import { useEffect, useRef, useState } from 'react';
import type { Data, LadData } from '@/app/lad/class/index';
import { CanvasView } from '@/app/lad/view/core/core';
import type { LadViewHost } from '@/app/lad/view/core/viewHost';
import { PALETTE_GROUPS, PALETTE_MIME } from '@/app/lad/view/interaction/dragDrop';
import { createSampleNetwork } from '@/app/lad/view/demo/sampleNetwork';
import styles from '@/app/lad/view/demo/workbench.module.css';

/**
 * TIA-style workbench: palette on the left + virtual-scroll canvas in the middle.
 * Mounts CanvasView directly, skipping the Lad constructor (unmigrated vscode modules would crash the page).
 * Production still creates the view with `new CanvasView(viewerDom, rootId, this)` in Lad.
 */
function countElements(data: Data): number {
    let n = 0;
    for (const id of Object.keys(data.linkedList)) {
        if (data.linkedList[id].blockType === 'element') {
            n += 1;
        }
    }
    return n;
}

export function LadWorkbench() {
    const animateOutRef = useRef<HTMLDivElement>(null);
    const animateRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<CanvasView | null>(null);
    const [elementCount, setElementCount] = useState(0);

    useEffect(() => {
        const viewerDom = viewerRef.current;
        const animateDom = animateRef.current;
        const animateOutDom = animateOutRef.current;
        if (!viewerDom || !animateDom || !animateOutDom) {
            return;
        }
        const data = createSampleNetwork();
        animateDom.style.width = `${data.widthV}px`;
        animateDom.style.height = `${data.heightV}px`;
        const ladData: LadData = {
            id: 'network-1',
            index: 0,
            show: true,
            title: 'Network 1: Star-delta motor',
            notes: '',
            data,
            animateDom,
            animateOutDom,
            viewerDom,
        };
        const host: LadViewHost = {
            basicLength: 30,
            fontSize: 12,
            lineHeight: 1.2,
            width: 100,
            height: 100,
            viewer: [[0, 0], [50, 50]],
            viewElement: [],
            viewLine: [],
            viewBlueLine: [],
            data,
            ladData,
            canvas: null,
            ctx: null,
            FBPinHeight: 0.6,
            margin_horizontal: 2,
            margin_vertical: 0.5,
            fBMargin: 1,
            FBLeftHeight: 1.5,
            invokeCoreOnDrop: true,
        };
        const view = new CanvasView(viewerDom, data.rootId, host);
        host.canvasView = view;
        viewRef.current = view;
        const refreshCount = () => setElementCount(countElements(host.data));
        refreshCount();
        view.on('nodedrop', refreshCount);
        view.on('nodedelete', refreshCount);
        view.on('nodepaste', refreshCount);
        view.on('undo', refreshCount);
        view.on('redo', refreshCount);
        view.updateScroll();
        return () => {
            view.stage.destroy();
            viewRef.current = null;
        };
    }, []);

    return (
        <div className={styles.workbench}>
            <header className={styles.chrome}>
                <span className={styles.product}>IEC 61131-3 LAD</span>
                <span className={styles.networkTitle}>Motor control · Network 1</span>
                <span className={styles.elementCount}>Elements: {elementCount}</span>
                <span className={styles.hint}>Dbl-click title/pin to rename · Delete wire or element · Ctrl+C/V copy/paste · Ctrl+drag yellow to copy · Ctrl+Z/Y undo/redo · Ctrl+marquee · Yellow slots wire · Scroll zoom</span>
            </header>
            <div className={styles.body}>
                <aside className={styles.palette}>
                    <div className={styles.paletteHead}>Instructions</div>
                    {PALETTE_GROUPS.map((group) => (
                        <div key={group.title} className={styles.group}>
                            <div className={styles.groupTitle}>{group.title}</div>
                            {group.items.map((item) => (
                                <div
                                    key={item.type}
                                    className={styles.item}
                                    draggable
                                    onDragStart={(e) => {
                                        e.dataTransfer.setData(PALETTE_MIME, item.type);
                                        e.dataTransfer.setData('text/plain', item.type);
                                        e.dataTransfer.effectAllowed = 'copy';
                                        const view = viewRef.current;
                                        if (view) {
                                            view.paletteType = item.type;
                                        }
                                    }}
                                >
                                    {item.type === 'OB' ? <OpenBranchIcon /> : null}
                                    <span>{item.label}</span>
                                </div>
                            ))}
                        </div>
                    ))}
                </aside>
                <div id="centerView" className={styles.centerView}>
                    <div ref={animateOutRef} className={styles.animateOut}>
                        <div className={styles.networkBar}>Network 1: Star-delta motor</div>
                        <div ref={animateRef} className={styles.animate}>
                            <div ref={viewerRef} className={styles.viewer} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/** Open branch: filled right-pointing arrow */
function OpenBranchIcon() {
    return (
        <svg className={styles.obIcon} viewBox="0 0 16 16" aria-hidden="true">
            <path d="M1 8 H8" fill="none" />
            <polygon points="8,4 15,8 8,12" stroke="none" />
        </svg>
    );
}
