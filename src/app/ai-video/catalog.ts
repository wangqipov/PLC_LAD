import type { NodeTypeDef } from './types';

export const NODE_CATALOG: NodeTypeDef[] = [
  {
    type: 'text.prompt',
    category: 'input',
    title: 'Text prompt',
    color: '#3d6b3d',
    provider: 'Local',
    description: 'Workflow start: positive / negative prompt',
    inputs: [],
    outputs: [
      { name: 'prompt', type: 'string' },
      { name: 'negative', type: 'string' },
    ],
    fields: [
      { key: 'prompt', label: 'Prompt', kind: 'textarea', default: 'cinematic aerial shot of neon city at night, rain, 8k' },
      { key: 'negative', label: 'Negative', kind: 'textarea', default: 'blurry, watermark, low quality' },
    ],
  },
  {
    type: 'llm.expand',
    category: 'llm',
    title: 'Prompt expand',
    color: '#3a4d6b',
    provider: 'OpenAI / Claude',
    description: 'Expand a short line into a shot prompt',
    inputs: [{ name: 'text', type: 'string' }],
    outputs: [{ name: 'prompt', type: 'string' }],
    fields: [
      { key: 'model', label: 'Model', kind: 'select', options: ['gpt-4.1', 'claude-sonnet', 'deepseek-v3'], default: 'gpt-4.1' },
      { key: 'style', label: 'Style', kind: 'select', options: ['cinematic', 'ad', 'anime', 'documentary'], default: 'cinematic' },
    ],
  },
  {
    type: 'image.t2i',
    category: 'image',
    title: 'Text to image',
    color: '#2f5f7a',
    provider: 'Flux / SDXL / MJ',
    description: 'Generate a keyframe or reference still',
    inputs: [
      { name: 'prompt', type: 'string' },
      { name: 'negative', type: 'string' },
    ],
    outputs: [{ name: 'image', type: 'image' }],
    fields: [
      { key: 'engine', label: 'Engine', kind: 'select', options: ['Flux.1', 'SDXL', 'Midjourney'], default: 'Flux.1' },
      { key: 'size', label: 'Size', kind: 'select', options: ['1024x1024', '1280x720', '720x1280'], default: '1280x720' },
      { key: 'seed', label: 'Seed', kind: 'number', default: 42 },
    ],
  },
  {
    type: 'image.i2i',
    category: 'image',
    title: 'Image to image',
    color: '#2f5f7a',
    provider: 'Flux / SDXL',
    description: 'Restyle or recompose from a reference',
    inputs: [
      { name: 'image', type: 'image' },
      { name: 'prompt', type: 'string' },
    ],
    outputs: [{ name: 'image', type: 'image' }],
    fields: [
      { key: 'strength', label: 'Strength', kind: 'number', default: 0.55 },
      { key: 'engine', label: 'Engine', kind: 'select', options: ['Flux.1', 'SDXL'], default: 'Flux.1' },
    ],
  },
  {
    type: 'video.t2v',
    category: 'video',
    title: 'Text to video',
    color: '#5a3d6b',
    provider: 'Kling / Sora / Hailuo',
    description: 'Generate a clip from text',
    inputs: [{ name: 'prompt', type: 'string' }],
    outputs: [{ name: 'video', type: 'video' }],
    fields: [
      { key: 'engine', label: 'Engine', kind: 'select', options: ['Kling 2.1', 'Sora', 'Hailuo', 'Luma', 'Pika'], default: 'Kling 2.1' },
      { key: 'duration', label: 'Duration (s)', kind: 'number', default: 5 },
      { key: 'ratio', label: 'Aspect', kind: 'select', options: ['16:9', '9:16', '1:1'], default: '16:9' },
    ],
  },
  {
    type: 'video.i2v',
    category: 'video',
    title: 'Image to video',
    color: '#5a3d6b',
    provider: 'Kling / Runway / Luma',
    description: 'Drive camera motion from a first frame',
    inputs: [
      { name: 'image', type: 'image' },
      { name: 'prompt', type: 'string' },
    ],
    outputs: [{ name: 'video', type: 'video' }],
    fields: [
      { key: 'engine', label: 'Engine', kind: 'select', options: ['Kling 2.1', 'Runway Gen-3', 'Luma Ray2', 'Pika 2.2'], default: 'Kling 2.1' },
      { key: 'duration', label: 'Duration (s)', kind: 'number', default: 5 },
      { key: 'motion', label: 'Motion', kind: 'select', options: ['low', 'mid', 'high'], default: 'mid' },
    ],
  },
  {
    type: 'video.upscale',
    category: 'process',
    title: 'Video upscale',
    color: '#4a4a3a',
    provider: 'Topaz / Local',
    description: 'Raise resolution and sharpness',
    inputs: [{ name: 'video', type: 'video' }],
    outputs: [{ name: 'video', type: 'video' }],
    fields: [
      { key: 'scale', label: 'Scale', kind: 'select', options: ['2x', '4x'], default: '2x' },
    ],
  },
  {
    type: 'video.concat',
    category: 'process',
    title: 'Concat clips',
    color: '#4a4a3a',
    provider: 'FFmpeg',
    description: 'Join clips in order',
    inputs: [
      { name: 'clip_a', type: 'video' },
      { name: 'clip_b', type: 'video' },
    ],
    outputs: [{ name: 'video', type: 'video' }],
    fields: [
      { key: 'transition', label: 'Transition', kind: 'select', options: ['cut', 'dissolve', 'flash'], default: 'dissolve' },
    ],
  },
  {
    type: 'audio.tts',
    category: 'audio',
    title: 'Speech synthesis',
    color: '#6b5230',
    provider: 'ElevenLabs / CosyVoice',
    description: 'Narration or dialogue',
    inputs: [{ name: 'text', type: 'string' }],
    outputs: [{ name: 'audio', type: 'audio' }],
    fields: [
      { key: 'voice', label: 'Voice', kind: 'select', options: ['narrator_m', 'narrator_f', 'young', 'broadcast'], default: 'narrator_f' },
      { key: 'engine', label: 'Engine', kind: 'select', options: ['ElevenLabs', 'CosyVoice', 'OpenAI TTS'], default: 'ElevenLabs' },
    ],
  },
  {
    type: 'audio.music',
    category: 'audio',
    title: 'Music',
    color: '#6b5230',
    provider: 'Suno / Udio',
    description: 'Generate BGM from a style prompt',
    inputs: [{ name: 'prompt', type: 'string' }],
    outputs: [{ name: 'audio', type: 'audio' }],
    fields: [
      { key: 'engine', label: 'Engine', kind: 'select', options: ['Suno', 'Udio'], default: 'Suno' },
      { key: 'mood', label: 'Mood', kind: 'select', options: ['epic', 'light', 'tense', 'lyrical'], default: 'epic' },
    ],
  },
  {
    type: 'audio.mix',
    category: 'process',
    title: 'Mix A/V',
    color: '#4a4a3a',
    provider: 'FFmpeg',
    description: 'Lay narration / music onto video',
    inputs: [
      { name: 'video', type: 'video' },
      { name: 'audio', type: 'audio' },
    ],
    outputs: [{ name: 'video', type: 'video' }],
    fields: [
      { key: 'volume', label: 'Volume', kind: 'number', default: 0.8 },
    ],
  },
  {
    type: 'output.save',
    category: 'output',
    title: 'Save video',
    color: '#3d3d3d',
    provider: 'Local',
    description: 'Workflow end, export the file',
    inputs: [{ name: 'video', type: 'video' }],
    outputs: [],
    fields: [
      { key: 'format', label: 'Format', kind: 'select', options: ['mp4', 'webm', 'mov'], default: 'mp4' },
      { key: 'name', label: 'File name', kind: 'text', default: 'ai-clip' },
    ],
  },
];

export const CATEGORIES = [...new Set(NODE_CATALOG.map((item) => item.category))];

export function getNodeType(type: string): NodeTypeDef | undefined {
  return NODE_CATALOG.find((item) => item.type === type);
}

export function defaultValues(def: NodeTypeDef): Record<string, string | number> {
  const values: Record<string, string | number> = {};
  for (const field of def.fields) {
    values[field.key] = field.default;
  }
  return values;
}
