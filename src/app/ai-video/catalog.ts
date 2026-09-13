import type { NodeTypeDef } from './types';

export const NODE_CATALOG: NodeTypeDef[] = [
  {
    type: 'text.prompt',
    category: '输入',
    title: '文本提示词',
    color: '#3d6b3d',
    provider: 'Local',
    description: '工作流起点：正面 / 负面提示词',
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
    category: '语言模型',
    title: '提示词扩写',
    color: '#3a4d6b',
    provider: 'OpenAI / Claude',
    description: '把短句扩写成视频分镜提示',
    inputs: [{ name: 'text', type: 'string' }],
    outputs: [{ name: 'prompt', type: 'string' }],
    fields: [
      { key: 'model', label: '模型', kind: 'select', options: ['gpt-4.1', 'claude-sonnet', 'deepseek-v3'], default: 'gpt-4.1' },
      { key: 'style', label: '风格', kind: 'select', options: ['电影感', '广告', '动漫', '纪录片'], default: '电影感' },
    ],
  },
  {
    type: 'image.t2i',
    category: '图像',
    title: '文生图',
    color: '#2f5f7a',
    provider: 'Flux / SDXL / MJ',
    description: '生成关键帧或参考图',
    inputs: [
      { name: 'prompt', type: 'string' },
      { name: 'negative', type: 'string' },
    ],
    outputs: [{ name: 'image', type: 'image' }],
    fields: [
      { key: 'engine', label: '引擎', kind: 'select', options: ['Flux.1', 'SDXL', 'Midjourney'], default: 'Flux.1' },
      { key: 'size', label: '尺寸', kind: 'select', options: ['1024x1024', '1280x720', '720x1280'], default: '1280x720' },
      { key: 'seed', label: 'Seed', kind: 'number', default: 42 },
    ],
  },
  {
    type: 'image.i2i',
    category: '图像',
    title: '图生图',
    color: '#2f5f7a',
    provider: 'Flux / SDXL',
    description: '按参考图改风格或构图',
    inputs: [
      { name: 'image', type: 'image' },
      { name: 'prompt', type: 'string' },
    ],
    outputs: [{ name: 'image', type: 'image' }],
    fields: [
      { key: 'strength', label: '强度', kind: 'number', default: 0.55 },
      { key: 'engine', label: '引擎', kind: 'select', options: ['Flux.1', 'SDXL'], default: 'Flux.1' },
    ],
  },
  {
    type: 'video.t2v',
    category: '视频',
    title: '文生视频',
    color: '#5a3d6b',
    provider: 'Kling / Sora / Hailuo',
    description: '文本直接生成视频片段',
    inputs: [{ name: 'prompt', type: 'string' }],
    outputs: [{ name: 'video', type: 'video' }],
    fields: [
      { key: 'engine', label: '引擎', kind: 'select', options: ['Kling 2.1', 'Sora', 'Hailuo', 'Luma', 'Pika'], default: 'Kling 2.1' },
      { key: 'duration', label: '时长(秒)', kind: 'number', default: 5 },
      { key: 'ratio', label: '画幅', kind: 'select', options: ['16:9', '9:16', '1:1'], default: '16:9' },
    ],
  },
  {
    type: 'video.i2v',
    category: '视频',
    title: '图生视频',
    color: '#5a3d6b',
    provider: 'Kling / Runway / Luma',
    description: '以首帧驱动镜头运动',
    inputs: [
      { name: 'image', type: 'image' },
      { name: 'prompt', type: 'string' },
    ],
    outputs: [{ name: 'video', type: 'video' }],
    fields: [
      { key: 'engine', label: '引擎', kind: 'select', options: ['Kling 2.1', 'Runway Gen-3', 'Luma Ray2', 'Pika 2.2'], default: 'Kling 2.1' },
      { key: 'duration', label: '时长(秒)', kind: 'number', default: 5 },
      { key: 'motion', label: '运动幅度', kind: 'select', options: ['低', '中', '高'], default: '中' },
    ],
  },
  {
    type: 'video.upscale',
    category: '处理',
    title: '视频超分',
    color: '#4a4a3a',
    provider: 'Topaz / Local',
    description: '提升分辨率与锐度',
    inputs: [{ name: 'video', type: 'video' }],
    outputs: [{ name: 'video', type: 'video' }],
    fields: [
      { key: 'scale', label: '倍率', kind: 'select', options: ['2x', '4x'], default: '2x' },
    ],
  },
  {
    type: 'video.concat',
    category: '处理',
    title: '片段拼接',
    color: '#4a4a3a',
    provider: 'FFmpeg',
    description: '按顺序拼接多段视频',
    inputs: [
      { name: 'clip_a', type: 'video' },
      { name: 'clip_b', type: 'video' },
    ],
    outputs: [{ name: 'video', type: 'video' }],
    fields: [
      { key: 'transition', label: '转场', kind: 'select', options: ['硬切', '交叉溶解', '闪白'], default: '交叉溶解' },
    ],
  },
  {
    type: 'audio.tts',
    category: '音频',
    title: '语音合成',
    color: '#6b5230',
    provider: 'ElevenLabs / CosyVoice',
    description: '旁白或对白',
    inputs: [{ name: 'text', type: 'string' }],
    outputs: [{ name: 'audio', type: 'audio' }],
    fields: [
      { key: 'voice', label: '音色', kind: 'select', options: ['旁白男', '旁白女', '少年', '广播'], default: '旁白女' },
      { key: 'engine', label: '引擎', kind: 'select', options: ['ElevenLabs', 'CosyVoice', 'OpenAI TTS'], default: 'ElevenLabs' },
    ],
  },
  {
    type: 'audio.music',
    category: '音频',
    title: '配乐生成',
    color: '#6b5230',
    provider: 'Suno / Udio',
    description: '按风格生成 BGM',
    inputs: [{ name: 'prompt', type: 'string' }],
    outputs: [{ name: 'audio', type: 'audio' }],
    fields: [
      { key: 'engine', label: '引擎', kind: 'select', options: ['Suno', 'Udio'], default: 'Suno' },
      { key: 'mood', label: '情绪', kind: 'select', options: ['史诗', '轻松', '紧张', '抒情'], default: '史诗' },
    ],
  },
  {
    type: 'audio.mix',
    category: '处理',
    title: '音视频合成',
    color: '#4a4a3a',
    provider: 'FFmpeg',
    description: '把旁白/配乐叠到视频上',
    inputs: [
      { name: 'video', type: 'video' },
      { name: 'audio', type: 'audio' },
    ],
    outputs: [{ name: 'video', type: 'video' }],
    fields: [
      { key: 'volume', label: '音量', kind: 'number', default: 0.8 },
    ],
  },
  {
    type: 'output.save',
    category: '输出',
    title: '保存视频',
    color: '#3d3d3d',
    provider: 'Local',
    description: '工作流终点，导出成片',
    inputs: [{ name: 'video', type: 'video' }],
    outputs: [],
    fields: [
      { key: 'format', label: '格式', kind: 'select', options: ['mp4', 'webm', 'mov'], default: 'mp4' },
      { key: 'name', label: '文件名', kind: 'text', default: 'ai-clip' },
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
