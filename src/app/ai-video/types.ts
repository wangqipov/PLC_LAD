export type PortType = 'string' | 'image' | 'video' | 'audio' | 'latent' | 'conditioning';

export type FieldKind = 'text' | 'textarea' | 'number' | 'select';

export interface PortDef {
  name: string;
  type: PortType;
}

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  options?: string[];
  default: string | number;
}

export interface NodeTypeDef {
  type: string;
  category: string;
  title: string;
  color: string;
  provider: string;
  description: string;
  inputs: PortDef[];
  outputs: PortDef[];
  fields: FieldDef[];
}

export type NodeStatus = 'idle' | 'queued' | 'running' | 'done' | 'error';

export interface GraphNode {
  id: string;
  type: string;
  x: number;
  y: number;
  values: Record<string, string | number>;
  status: NodeStatus;
  preview?: string;
}

export interface GraphEdge {
  id: string;
  fromNode: string;
  fromPort: string;
  toNode: string;
  toPort: string;
}

export interface GraphState {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export const PORT_COLOR: Record<PortType, string> = {
  string: '#89c44a',
  image: '#5ea8e6',
  video: '#c98bde',
  audio: '#e6a23c',
  latent: '#8aa0b4',
  conditioning: '#e07a7a',
};
