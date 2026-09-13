'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { generateUuid } from '@/app/common/uuid';
import { getNodeType } from './catalog';
import type { GraphEdge, GraphNode, PortType } from './types';
import { PORT_COLOR } from './types';
import styles from './workbench.module.css';

interface GraphCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
  onConnect: (edge: Omit<GraphEdge, 'id'>) => void;
  onChangeValue: (id: string, key: string, value: string | number) => void;
  onDropType: (type: string, x: number, y: number) => void;
}

interface Cam {
  x: number;
  y: number;
  z: number;
}

interface DragNode {
  id: string;
  ox: number;
  oy: number;
}

interface LinkDrag {
  fromNode: string;
  fromPort: string;
  type: PortType;
  x: number;
  y: number;
}

interface PortPos {
  x: number;
  y: number;
}

export function GraphCanvas({
  nodes,
  edges,
  selectedId,
  onSelect,
  onMove,
  onConnect,
  onChangeValue,
  onDropType,
}: GraphCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [cam, setCam] = useState<Cam>({ x: 40, y: 40, z: 1 });
  const [link, setLink] = useState<LinkDrag | null>(null);
  const [ports, setPorts] = useState<Record<string, PortPos>>({});
  const dragNode = useRef<DragNode | null>(null);
  const pan = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);

  const measurePorts = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) {
      return;
    }
    const rect = wrap.getBoundingClientRect();
    const next: Record<string, PortPos> = {};
    wrap.querySelectorAll<HTMLElement>('[data-port]').forEach((el) => {
      const key = el.dataset.port;
      if (!key) {
        return;
      }
      const box = el.getBoundingClientRect();
      next[key] = {
        x: (box.left + box.width / 2 - rect.left - cam.x) / cam.z,
        y: (box.top + box.height / 2 - rect.top - cam.y) / cam.z,
      };
    });
    setPorts(next);
  }, [cam.x, cam.y, cam.z, nodes]);

  useEffect(() => {
    measurePorts();
  }, [measurePorts, edges.length]);

  const toWorld = (clientX: number, clientY: number) => {
    const rect = wrapRef.current!.getBoundingClientRect();
    return {
      x: (clientX - rect.left - cam.x) / cam.z,
      y: (clientY - rect.top - cam.y) / cam.z,
    };
  };

  const onWheel = (event: React.WheelEvent) => {
    event.preventDefault();
    const rect = wrapRef.current!.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;
    const nextZ = Math.min(1.8, Math.max(0.35, cam.z * (event.deltaY > 0 ? 0.92 : 1.08)));
    const wx = (mx - cam.x) / cam.z;
    const wy = (my - cam.y) / cam.z;
    setCam({ z: nextZ, x: mx - wx * nextZ, y: my - wy * nextZ });
  };

  const onPointerDownBg = (event: React.PointerEvent) => {
    if (event.button !== 0 && event.button !== 1) {
      return;
    }
    if ((event.target as HTMLElement).closest('[data-node]')) {
      return;
    }
    onSelect(null);
    pan.current = { x: event.clientX, y: event.clientY, cx: cam.x, cy: cam.y };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const panning = pan.current;
    if (panning) {
      const nextX = panning.cx + (event.clientX - panning.x);
      const nextY = panning.cy + (event.clientY - panning.y);
      setCam((prev) => ({ ...prev, x: nextX, y: nextY }));
    }
    const dragging = dragNode.current;
    if (dragging) {
      const world = toWorld(event.clientX, event.clientY);
      onMove(dragging.id, world.x - dragging.ox, world.y - dragging.oy);
    }
    if (link) {
      const world = toWorld(event.clientX, event.clientY);
      setLink({ ...link, x: world.x, y: world.y });
    }
  };

  const onPointerUp = (event: React.PointerEvent) => {
    pan.current = null;
    dragNode.current = null;
    if (link) {
      const el = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
      const port = el?.closest('[data-port]') as HTMLElement | null;
      if (port?.dataset.port?.includes(':in:')) {
        const [nodeId, , portName] = port.dataset.port.split(':');
        const type = port.dataset.portType as PortType;
        if (nodeId !== link.fromNode && type === link.type) {
          onConnect({
            fromNode: link.fromNode,
            fromPort: link.fromPort,
            toNode: nodeId,
            toPort: portName,
          });
        }
      }
      setLink(null);
    }
  };

  const startNodeDrag = (event: React.PointerEvent, node: GraphNode) => {
    if ((event.target as HTMLElement).closest('[data-port], input, textarea, select')) {
      return;
    }
    event.stopPropagation();
    onSelect(node.id);
    const world = toWorld(event.clientX, event.clientY);
    dragNode.current = { id: node.id, ox: world.x - node.x, oy: world.y - node.y };
  };

  const startLink = (event: React.PointerEvent, nodeId: string, portName: string, type: PortType) => {
    event.stopPropagation();
    event.preventDefault();
    const world = toWorld(event.clientX, event.clientY);
    setLink({ fromNode: nodeId, fromPort: portName, type, x: world.x, y: world.y });
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/x-ai-node');
    if (!type) {
      return;
    }
    const world = toWorld(event.clientX, event.clientY);
    onDropType(type, world.x - 110, world.y - 20);
  };

  const wires = useMemo(() => {
    const paths: { id: string; d: string; color: string }[] = [];
    for (const edge of edges) {
      const a = ports[`${edge.fromNode}:out:${edge.fromPort}`];
      const b = ports[`${edge.toNode}:in:${edge.toPort}`];
      if (!a || !b) {
        continue;
      }
      const fromDef = getNodeType(nodes.find((item) => item.id === edge.fromNode)?.type ?? '');
      const portType = fromDef?.outputs.find((item) => item.name === edge.fromPort)?.type ?? 'string';
      const dx = Math.max(40, Math.abs(b.x - a.x) * 0.45);
      paths.push({
        id: edge.id,
        color: PORT_COLOR[portType],
        d: `M ${a.x} ${a.y} C ${a.x + dx} ${a.y}, ${b.x - dx} ${b.y}, ${b.x} ${b.y}`,
      });
    }
    if (link) {
      const a = ports[`${link.fromNode}:out:${link.fromPort}`];
      if (a) {
        const dx = Math.max(40, Math.abs(link.x - a.x) * 0.45);
        paths.push({
          id: 'draft',
          color: PORT_COLOR[link.type],
          d: `M ${a.x} ${a.y} C ${a.x + dx} ${a.y}, ${link.x - dx} ${link.y}, ${link.x} ${link.y}`,
        });
      }
    }
    return paths;
  }, [edges, ports, link, nodes]);

  return (
    <div
      ref={wrapRef}
      className={styles.canvas}
      onWheel={onWheel}
      onPointerDown={onPointerDownBg}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
    >
      <div
        className={styles.world}
        style={{ transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.z})` }}
      >
        <svg className={styles.wires} aria-hidden>
          {wires.map((wire) => (
            <path key={wire.id} d={wire.d} stroke={wire.color} fill="none" strokeWidth={2.4} />
          ))}
        </svg>
        {nodes.map((node) => {
          const def = getNodeType(node.type);
          if (!def) {
            return null;
          }
          return (
            <article
              key={node.id}
              data-node={node.id}
              className={`${styles.node} ${selectedId === node.id ? styles.nodeSelected : ''} ${styles[`st_${node.status}`] ?? ''}`}
              style={{ left: node.x, top: node.y }}
              onPointerDown={(event) => startNodeDrag(event, node)}
            >
              <header className={styles.nodeHead} style={{ background: def.color }}>
                <span>{def.title}</span>
                <em>{def.provider}</em>
              </header>
              <div className={styles.nodeBody}>
                {def.inputs.map((port) => (
                  <div key={port.name} className={styles.portRow}>
                    <button
                      type="button"
                      data-port={`${node.id}:in:${port.name}`}
                      data-port-type={port.type}
                      className={styles.port}
                      style={{ background: PORT_COLOR[port.type] }}
                      title={port.type}
                    />
                    <span>{port.name}</span>
                  </div>
                ))}
                {def.fields.map((field) => (
                  <label key={field.key} className={styles.field}>
                    <span>{field.label}</span>
                    {field.kind === 'textarea' ? (
                      <textarea
                        value={String(node.values[field.key] ?? '')}
                        onChange={(event) => onChangeValue(node.id, field.key, event.target.value)}
                        rows={3}
                      />
                    ) : field.kind === 'select' ? (
                      <select
                        value={String(node.values[field.key] ?? '')}
                        onChange={(event) => onChangeValue(node.id, field.key, event.target.value)}
                      >
                        {field.options?.map((option) => (
                          <option key={option}>{option}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.kind === 'number' ? 'number' : 'text'}
                        value={node.values[field.key] ?? ''}
                        onChange={(event) =>
                          onChangeValue(
                            node.id,
                            field.key,
                            field.kind === 'number' ? Number(event.target.value) : event.target.value,
                          )
                        }
                      />
                    )}
                  </label>
                ))}
                {def.outputs.map((port) => (
                  <div key={port.name} className={`${styles.portRow} ${styles.portOut}`}>
                    <span>{port.name}</span>
                    <button
                      type="button"
                      data-port={`${node.id}:out:${port.name}`}
                      data-port-type={port.type}
                      className={styles.port}
                      style={{ background: PORT_COLOR[port.type] }}
                      title={port.type}
                      onPointerDown={(event) => startLink(event, node.id, port.name, port.type)}
                    />
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function newNodeId() {
  return generateUuid().slice(0, 8);
}
