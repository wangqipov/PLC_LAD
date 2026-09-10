
import { SingletonViewData } from 'lad/eventAndShareData/shareData';
import { CacheData } from '@/app/lad/class/cacheData';

/**
 * Save undo/redo cache
 * @param data
 */
export function saveCache(data: CacheData) {
    const ins = SingletonViewData.getInstance();
    const cache = ins.programDataCache;
    const cacheActiveIndex = ins.cacheActiveIndex;
    if (cacheActiveIndex === 49) {
        // Cap at 50 entries; drop the oldest
        cache.shift();
    } else if (cache.length - 1 > cacheActiveIndex) {
        // If not at the latest state, drop all entries after the current index
        cache.splice(cacheActiveIndex + 1);
    }
    cache.push(data);
    ins.setCacheActiveIndex(cache.length - 1);
}