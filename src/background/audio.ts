// ============================================================
// background/audio.ts — Portable audio playback
//
// Chrome MV3 : audio is played via the Offscreen document API
//   (chrome.offscreen) which runs in a real DOM context.
//
// Firefox MV3 : chrome.offscreen does not exist.
//   Background scripts in Firefox retain access to the Web
//   Audio API (AudioContext), so we decode and play the sound
//   directly from the service worker / background script.
// ============================================================

import { SoundType, SoundPath } from '../types';
import { Logger } from '../modules/service/Logger';

const log = new Logger('Audio');

// ─── Internal helpers ─────────────────────────────────────────

function resolveUrl(selected: SoundType, customUrl: string): string {
  switch (selected) {
    case SoundType.DRAIN:  return chrome.runtime.getURL(SoundPath.DRAIN);
    case SoundType.HEAL:   return chrome.runtime.getURL(SoundPath.HEAL);
    case SoundType.PING:   return chrome.runtime.getURL(SoundPath.PING);
    case SoundType.CUSTOM: return customUrl;
    case SoundType.DING:
    default:               return chrome.runtime.getURL(SoundPath.DING);
  }
}

// ─── Chrome path (offscreen document) ─────────────────────────

async function ensureOffscreenDocument(): Promise<void> {
  if (await chrome.offscreen.hasDocument()) return;
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: [chrome.offscreen.Reason.AUDIO_PLAYBACK],
    justification: 'Needed to play sound notifications',
  });
}

async function playSoundViaOffscreen(
  selected: SoundType,
  customUrl: string,
  volume: number,
): Promise<void> {
  await ensureOffscreenDocument();
  // Small delay so the offscreen document has time to register its listener
  await new Promise((r) => setTimeout(r, 200));
  chrome.runtime.sendMessage({
    source: 'worker',
    func: 'playSound',
    args: [selected, customUrl, volume],
  }).catch(() => log.trace('offscreen may not be ready yet'));
}

// ─── Firefox path (Web Audio API) ─────────────────────────────

async function playSoundViaWebAudio(
  selected: SoundType,
  customUrl: string,
  volume: number,
): Promise<void> {
  try {
    const url = resolveUrl(selected, customUrl);
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const ctx = new AudioContext();
    const buffer = await ctx.decodeAudioData(arrayBuffer);
    const source = ctx.createBufferSource();
    const gainNode = ctx.createGain();
    gainNode.gain.value = Math.max(0, Math.min(1, volume / 100));
    source.buffer = buffer;
    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    source.start(0);
    // Close context once playback ends to free resources
    source.addEventListener('ended', () => ctx.close().catch(() => undefined));
  } catch (e) {
    log.error('playSoundViaWebAudio failed', e);
  }
}

// ─── Public API ───────────────────────────────────────────────

/** Returns true when running in Chrome (offscreen API available). */
export function isChrome(): boolean {
  return typeof chrome !== 'undefined' && typeof chrome.offscreen !== 'undefined';
}

/**
 * Play a notification sound.
 * Automatically selects the right strategy for the current browser.
 */
export async function playSound(
  selected: SoundType,
  customUrl: string,
  volume: number,
): Promise<void> {
  if (isChrome()) {
    await playSoundViaOffscreen(selected, customUrl, volume);
  } else {
    await playSoundViaWebAudio(selected, customUrl, volume);
  }
}

/**
 * Ensure the audio subsystem is ready.
 * On Chrome this creates the offscreen document eagerly.
 * On Firefox this is a no-op.
 */
export async function initAudio(): Promise<void> {
  if (isChrome()) {
    await ensureOffscreenDocument();
  }
}
