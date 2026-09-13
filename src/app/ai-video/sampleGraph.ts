import { defaultValues, getNodeType } from './catalog';
import type { GraphState } from './types';

function node(id: string, type: string, x: number, y: number, patch?: Record<string, string | number>) {
  const def = getNodeType(type);
  if (!def) {
    throw new Error(`Unknown node type ${type}`);
  }
  return {
    id,
    type,
    x,
    y,
    values: { ...defaultValues(def), ...patch },
    status: 'idle' as const,
  };
}

export function createSampleGraph(): GraphState {
  return {
    nodes: [
      node('n1', 'text.prompt', 80, 180),
      node('n2', 'llm.expand', 360, 80),
      node('n3', 'image.t2i', 640, 180, { engine: 'Flux.1', size: '1280x720' }),
      node('n4', 'video.i2v', 940, 180, { engine: 'Kling 2.1' }),
      node('n5', 'audio.music', 940, 460, { mood: 'epic' }),
      node('n6', 'audio.mix', 1240, 280),
      node('n7', 'output.save', 1540, 280),
    ],
    edges: [
      { id: 'e1', fromNode: 'n1', fromPort: 'prompt', toNode: 'n2', toPort: 'text' },
      { id: 'e2', fromNode: 'n2', fromPort: 'prompt', toNode: 'n3', toPort: 'prompt' },
      { id: 'e3', fromNode: 'n1', fromPort: 'negative', toNode: 'n3', toPort: 'negative' },
      { id: 'e4', fromNode: 'n3', fromPort: 'image', toNode: 'n4', toPort: 'image' },
      { id: 'e5', fromNode: 'n2', fromPort: 'prompt', toNode: 'n4', toPort: 'prompt' },
      { id: 'e6', fromNode: 'n2', fromPort: 'prompt', toNode: 'n5', toPort: 'prompt' },
      { id: 'e7', fromNode: 'n4', fromPort: 'video', toNode: 'n6', toPort: 'video' },
      { id: 'e8', fromNode: 'n5', fromPort: 'audio', toNode: 'n6', toPort: 'audio' },
      { id: 'e9', fromNode: 'n6', fromPort: 'video', toNode: 'n7', toPort: 'video' },
    ],
  };
}
