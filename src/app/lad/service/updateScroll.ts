
import Lad from '@/app/lad/index';
import { calculateViewer } from '@/app/lad/service/calculateViewer';
import { updateViewer } from '@/app/lad/service/updateViewer';

export function updateScroll(_this: Lad) {
    calculateViewer(_this);
    updateViewer(_this, true);
}