const AUDIO_SRC = "/audio/drupplesound.mp3";
const WATER_SRC = "/audio/watersound2.mp3";

const GLOBAL_KEY = "__hybridAmbientAudio__";

function getStore() {
  if (typeof window === "undefined") {
    return {
      dreamy: null,
      dreamySrc: null,
      water: null,
      waterSrc: null,
      primed: false,
    };
  }

  if (!window[GLOBAL_KEY]) {
    window[GLOBAL_KEY] = {
      dreamy: null,
      dreamySrc: null,
      water: null,
      waterSrc: null,
      primed: false,
    };
  }

  return window[GLOBAL_KEY];
}

function createLoopingAudio(src) {
  const audio = new Audio(src);
  audio.loop = true;
  audio.preload = "auto";
  audio.load();
  return audio;
}

function getOrCreateAudio(key, srcKey, src) {
  const store = getStore();
  if (!store[key] || store[srcKey] !== src) {
    store[key]?.pause();
    store[key] = createLoopingAudio(src);
    store[srcKey] = src;
    store.primed = false;
  }
  return store[key];
}

export function getDreamyAudio() {
  return getOrCreateAudio("dreamy", "dreamySrc", AUDIO_SRC);
}

export function getWaterAudio() {
  return getOrCreateAudio("water", "waterSrc", WATER_SRC);
}

export function preloadAmbientAudio() {
  getDreamyAudio();
  getWaterAudio();
}

function whenCanPlay(audio) {
  if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    audio.addEventListener("canplay", resolve, { once: true });
  });
}

/** Start muted playback as soon as the file is ready (allowed without a gesture). */
export async function primeAmbientAudio() {
  const store = getStore();
  if (store.primed) return;

  const tracks = [getDreamyAudio(), getWaterAudio()];
  await Promise.all(tracks.map(whenCanPlay));

  for (const audio of tracks) {
    audio.muted = true;
    audio.volume = 0;
    try {
      await audio.play();
    } catch {
      // Retry once the browser allows it.
    }
  }

  store.primed = true;
}

async function activateAudio(audio, volume) {
  audio.muted = false;
  audio.volume = volume;

  if (!audio.paused && audio.currentTime > 0) return;

  try {
    await audio.play();
  } catch {
    // Blocked until the user interacts (unlock via pointer/scroll/key).
  }
}

export function playDreamyAudio(volume) {
  void activateAudio(getDreamyAudio(), volume);
}

export function pauseDreamyAudio() {
  const audio = getStore().dreamy;
  if (!audio) return;

  audio.volume = 0;
  audio.pause();
}

export function playWaterAudio(volume) {
  void activateAudio(getWaterAudio(), volume);
}

export function pauseWaterAudio() {
  const audio = getStore().water;
  if (!audio) return;

  audio.volume = 0;
  audio.pause();
}
