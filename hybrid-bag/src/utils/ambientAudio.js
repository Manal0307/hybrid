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

function isPlaying(audio) {
  return Boolean(audio && !audio.paused && audio.currentTime > 0);
}

/** Start muted playback as soon as the file is ready (allowed without a gesture). */
export async function primeAmbientAudio() {
  const store = getStore();
  if (store.primed) return isPlaying(store.dreamy);

  const tracks = [getDreamyAudio(), getWaterAudio()];
  await Promise.all(tracks.map(whenCanPlay));

  let dreamyStarted = false;
  for (let i = 0; i < tracks.length; i++) {
    const audio = tracks[i];
    audio.muted = true;
    audio.volume = 0;
    try {
      await audio.play();
      if (i === 0) dreamyStarted = true;
    } catch {
      // Strict browsers block even muted audio — wait for a user gesture.
    }
  }

  store.primed = true;
  return dreamyStarted;
}

/** Unmute tracks already playing from primeAmbientAudio (no new play() call). */
export function unmutePrimedAmbient(dreamyVolume, waterVolume, waterActive) {
  const store = getStore();
  let started = false;

  if (isPlaying(store.dreamy)) {
    store.dreamy.muted = false;
    store.dreamy.volume = dreamyVolume;
    started = true;
  }

  if (waterActive && isPlaying(store.water)) {
    store.water.muted = false;
    store.water.volume = waterVolume;
  } else if (store.water) {
    store.water.volume = 0;
    store.water.pause();
  }

  return started;
}

async function activateAudio(audio, volume) {
  if (isPlaying(audio)) {
    audio.muted = false;
    audio.volume = volume;
    return;
  }

  audio.muted = false;
  audio.volume = volume;

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
