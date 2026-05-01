// ============================================================
// ui/offscreen.ts — Audio playback in offscreen document (MV3)
// ============================================================

import { SoundType, SoundPath } from '../types';
import { Logger } from '../modules/service/Logger';

const log = new Logger('Offscreen');

let audio: HTMLAudioElement | null = null;

function playSound(selected: SoundType, customUrl: string, volume: number): void {
  try {
    let src: string;
    switch (selected) {
      case SoundType.DRAIN: src = chrome.runtime.getURL(SoundPath.DRAIN); break;
      case SoundType.HEAL:  src = chrome.runtime.getURL(SoundPath.HEAL); break;
      case SoundType.PING:  src = chrome.runtime.getURL(SoundPath.PING); break;
      case SoundType.CUSTOM: src = customUrl; break;
      case SoundType.DING:
      default:       src = chrome.runtime.getURL(SoundPath.DING); break;
    }

    if (audio) { audio.pause(); audio = null; }
    audio = new Audio(src);
    audio.volume = Math.max(0, Math.min(1, volume / 100));
    audio.play().catch((e) => log.error('[Offscreen] play failed', e));
  } catch (e) {
    log.error('[Offscreen] playSound error', e);
  }
}

// Keep offscreen document alive by sending heartbeat to service worker
setInterval(() => {
  chrome.runtime.sendMessage({ source: 'offscreen', func: 'needKeepAlive', args: [] })
    .catch(() => { log.error('sw may restart') });
}, 20000);

// Listen for play requests from service worker
chrome.runtime.onMessage.addListener(({ func, args }: { func: string; args: unknown[] }) => {
  if (func === 'playSound') {
    playSound(args[0] as SoundType, args[1] as string, args[2] as number);
  }
});
