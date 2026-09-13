import type { Metadata } from 'next';
import { ComfyWorkbench } from './ComfyWorkbench';

export const metadata: Metadata = {
  title: 'AETHER · AI Video Graph',
  description: 'ComfyUI-style AI video workflow editor',
};

export default function AiVideoPage() {
  return <ComfyWorkbench />;
}
