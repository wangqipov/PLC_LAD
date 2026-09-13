import { createStore } from '@/app/common/state/createStore';
import type { LogLine } from './execute';
import { createSampleGraph } from './sampleGraph';
import type { GraphEdge, GraphNode } from './types';

const sample = createSampleGraph();

export interface AiVideoState {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedId: string | null;
  query: string;
  logs: LogLine[];
  running: boolean;
}

export const aiVideoStore = createStore<AiVideoState>({
  nodes: sample.nodes,
  edges: sample.edges,
  selectedId: 'n4',
  query: '',
  logs: [],
  running: false,
});

export function resetAiVideoGraph() {
  const next = createSampleGraph();
  aiVideoStore.patch({
    nodes: next.nodes,
    edges: next.edges,
    selectedId: 'n4',
    logs: [],
    running: false,
  });
}
