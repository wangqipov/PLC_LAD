import { getNodeType } from './catalog';
import type { GraphEdge, GraphNode, NodeStatus } from './types';

export interface LogLine {
  time: string;
  nodeId: string;
  title: string;
  message: string;
}

function topoOrder(nodes: GraphNode[], edges: GraphEdge[]): GraphNode[] | null {
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, string[]>();
  for (const node of nodes) {
    incoming.set(node.id, 0);
    outgoing.set(node.id, []);
  }
  for (const edge of edges) {
    if (!incoming.has(edge.toNode) || !outgoing.has(edge.fromNode)) {
      continue;
    }
    incoming.set(edge.toNode, (incoming.get(edge.toNode) ?? 0) + 1);
    outgoing.get(edge.fromNode)!.push(edge.toNode);
  }
  const queue = nodes.filter((node) => incoming.get(node.id) === 0);
  const ordered: GraphNode[] = [];
  while (queue.length) {
    const current = queue.shift()!;
    ordered.push(current);
    for (const nextId of outgoing.get(current.id) ?? []) {
      const nextCount = (incoming.get(nextId) ?? 0) - 1;
      incoming.set(nextId, nextCount);
      if (nextCount === 0) {
        const next = nodes.find((item) => item.id === nextId);
        if (next) {
          queue.push(next);
        }
      }
    }
  }
  return ordered.length === nodes.length ? ordered : null;
}

function now() {
  return new Date().toLocaleTimeString('zh-CN', { hour12: false });
}

export async function runWorkflow(
  nodes: GraphNode[],
  edges: GraphEdge[],
  onStatus: (id: string, status: NodeStatus, preview?: string) => void,
  onLog: (line: LogLine) => void,
  signal: { cancelled: boolean },
) {
  const order = topoOrder(nodes, edges);
  if (!order) {
    onLog({ time: now(), nodeId: '', title: 'Graph', message: '存在环路，无法执行' });
    return;
  }

  for (const node of order) {
    if (signal.cancelled) {
      onLog({ time: now(), nodeId: node.id, title: 'Queue', message: '已取消' });
      return;
    }
    const def = getNodeType(node.type);
    if (!def) {
      continue;
    }
    onStatus(node.id, 'running');
    const engine = String(node.values.engine ?? def.provider);
    onLog({
      time: now(),
      nodeId: node.id,
      title: def.title,
      message: `调用 ${engine} · ${def.description}`,
    });
    await new Promise((resolve) => setTimeout(resolve, 650 + Math.random() * 500));
    if (signal.cancelled) {
      onStatus(node.id, 'idle');
      return;
    }
    const preview = def.outputs.some((port) => port.type === 'video')
      ? 'video'
      : def.outputs.some((port) => port.type === 'image')
        ? 'image'
        : def.outputs.some((port) => port.type === 'audio')
          ? 'audio'
          : undefined;
    onStatus(node.id, 'done', preview);
    onLog({
      time: now(),
      nodeId: node.id,
      title: def.title,
      message: '完成（当前为适配器占位执行，可替换为真实 API）',
    });
  }
}
