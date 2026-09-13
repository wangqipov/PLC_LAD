'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { LanguageSwitch } from '@/app/common/i18n/LanguageSwitch';
import { useI18n } from '@/app/common/i18n';
import { useStore } from '@/app/common/state';
import { CATEGORIES, NODE_CATALOG, defaultValues, getNodeType } from './catalog';
import { runWorkflow } from './execute';
import { GraphCanvas, newNodeId } from './GraphCanvas';
import { aiVideoStore, resetAiVideoGraph } from './store';
import type { NodeStatus } from './types';
import styles from './workbench.module.css';

export function ComfyWorkbench() {
  const { t } = useI18n();
  const { nodes, edges, selectedId, query, logs, running } = useStore(aiVideoStore);
  const cancel = useRef({ cancelled: false });

  const selected = nodes.find((item) => item.id === selectedId);
  const selectedDef = selected ? getNodeType(selected.type) : undefined;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Delete' && event.key !== 'Backspace') {
        return;
      }
      const tag = (event.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        return;
      }
      const id = aiVideoStore.getState().selectedId;
      if (!id) {
        return;
      }
      aiVideoStore.setState((prev) => ({
        ...prev,
        nodes: prev.nodes.filter((item) => item.id !== id),
        edges: prev.edges.filter((item) => item.fromNode !== id && item.toNode !== id),
        selectedId: null,
      }));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const filtered = NODE_CATALOG.filter((item) => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return true;
    }
    return `${t(`ai.node.${item.type}.title`, undefined, item.title)} ${item.provider} ${item.type} ${t(`ai.cat.${item.category}`)}`.toLowerCase().includes(q);
  });

  const setStatus = (id: string, status: NodeStatus, preview?: string) => {
    aiVideoStore.setState((prev) => ({
      ...prev,
      nodes: prev.nodes.map((item) =>
        item.id === id ? { ...item, status, preview: preview ?? item.preview } : item,
      ),
    }));
  };

  const queue = async () => {
    const current = aiVideoStore.getState();
    if (current.running) {
      cancel.current.cancelled = true;
      aiVideoStore.patch({ running: false });
      return;
    }
    cancel.current = { cancelled: false };
    aiVideoStore.setState((prev) => ({
      ...prev,
      running: true,
      nodes: prev.nodes.map((item) => ({ ...item, status: 'queued' as const })),
      logs: [
        {
          time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
          nodeId: '',
          title: 'Queue',
          message: t('ai.log.start'),
        },
        ...prev.logs,
      ],
    }));
    await runWorkflow(
      current.nodes,
      current.edges,
      setStatus,
      (line) =>
        aiVideoStore.setState((prev) => ({
          ...prev,
          logs: [line, ...prev.logs].slice(0, 80),
        })),
      cancel.current,
    );
    aiVideoStore.patch({ running: false });
  };

  return (
    <div className={styles.shell}>
      <aside className={styles.left}>
        <div className={styles.brand}>
          <strong>AETHER</strong>
          <span>{t('ai.brandSub')}</span>
        </div>
        <input
          className={styles.search}
          placeholder={t('ai.search')}
          value={query}
          onChange={(event) => aiVideoStore.patch({ query: event.target.value })}
        />
        {CATEGORIES.map((category) => {
          const items = filtered.filter((item) => item.category === category);
          if (!items.length) {
            return null;
          }
          return (
            <section key={category} className={styles.cat}>
              <h3>{t(`ai.cat.${category}`)}</h3>
              {items.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  className={styles.palItem}
                  draggable
                  onDragStart={(event) => event.dataTransfer.setData('application/x-ai-node', item.type)}
                  style={{ borderLeftColor: item.color }}
                >
                  <b>{t(`ai.node.${item.type}.title`, undefined, item.title)}</b>
                  <i>{item.provider}</i>
                </button>
              ))}
            </section>
          );
        })}
      </aside>

      <main className={styles.main}>
        <header className={styles.top}>
          <div className={styles.crumbs}>{t('ai.crumbs')}</div>
          <div className={styles.actions}>
            <LanguageSwitch tone="dark" />
            <Link className={styles.link} href="/">{t('ai.lad')}</Link>
            <button type="button" className={styles.ghost} onClick={() => resetAiVideoGraph()}>{t('ai.reset')}</button>
            <button type="button" className={running ? styles.stop : styles.queue} onClick={queue}>
              {running ? t('ai.cancel') : t('ai.queue')}
            </button>
          </div>
        </header>
        <GraphCanvas
          nodes={nodes}
          edges={edges}
          selectedId={selectedId}
          onSelect={(id) => aiVideoStore.patch({ selectedId: id })}
          onMove={(id, x, y) =>
            aiVideoStore.setState((prev) => ({
              ...prev,
              nodes: prev.nodes.map((item) => (item.id === id ? { ...item, x, y } : item)),
            }))
          }
          onConnect={(edge) =>
            aiVideoStore.setState((prev) => ({
              ...prev,
              edges: [
                ...prev.edges.filter((item) => !(item.toNode === edge.toNode && item.toPort === edge.toPort)),
                { ...edge, id: newNodeId() },
              ],
            }))
          }
          onChangeValue={(id, key, value) =>
            aiVideoStore.setState((prev) => ({
              ...prev,
              nodes: prev.nodes.map((item) =>
                item.id === id ? { ...item, values: { ...item.values, [key]: value } } : item,
              ),
            }))
          }
          onDropType={(type, x, y) => {
            const def = getNodeType(type);
            if (!def) {
              return;
            }
            const id = newNodeId();
            aiVideoStore.setState((prev) => ({
              ...prev,
              selectedId: id,
              nodes: [...prev.nodes, { id, type, x, y, values: defaultValues(def), status: 'idle' }],
            }));
          }}
        />
      </main>

      <aside className={styles.right}>
        <section>
          <h3>{t('ai.props')}</h3>
          {selected && selectedDef ? (
            <div className={styles.meta}>
              <p><b>{t(`ai.node.${selectedDef.type}.title`, undefined, selectedDef.title)}</b></p>
              <p>{t(`ai.node.${selectedDef.type}.desc`, undefined, selectedDef.description)}</p>
              <p className={styles.muted}>{selectedDef.provider}</p>
              <p className={styles.muted}>{t('ai.status', { status: t(`ai.status.${selected.status}`) })}</p>
            </div>
          ) : (
            <p className={styles.muted}>{t('ai.pickNode')}</p>
          )}
        </section>
        <section>
          <h3>{t('ai.adapters')}</h3>
          <ul className={styles.adapters}>
            <li>Kling / Runway / Luma / Pika</li>
            <li>Sora / Hailuo 文生视频</li>
            <li>Flux · SDXL · Midjourney</li>
            <li>ElevenLabs · Suno</li>
          </ul>
          <p className={styles.muted}>{t('ai.adapter.hint')}</p>
        </section>
        <section className={styles.logBox}>
          <h3>{t('ai.logs')}</h3>
          <div className={styles.logs}>
            {logs.length === 0 ? <p className={styles.muted}>{t('ai.logs.empty')}</p> : null}
            {logs.map((line, index) => (
              <p key={`${line.time}-${index}`}>
                <span>{line.time}</span> {line.title} — {line.message}
              </p>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}
